import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Model, Types } from 'mongoose';
import type { Queue } from 'bull';
import { Flow, FlowNode, NodeType } from './schemas/flow.schema';
import { Execution, ExecutionDocument } from './schemas/execution.schema';

@Injectable()
export class FlowExecutionService {
  private readonly logger = new Logger(FlowExecutionService.name);
  
  // In-memory idempotency stores (in production: use Redis)
  private sentMessages = new Map<string, any>();
  private orderNotes = new Map<string, any>();
  private customerNotes = new Map<string, any>();

  constructor(
    @InjectModel(Execution.name) private executionModel: Model<ExecutionDocument>,
    @InjectQueue('flow-delays') private delayQueue: Queue,
  ) {}

  async executeFlow(flow: Flow, triggerData: Record<string, any>): Promise<ExecutionDocument> {
    this.logger.log(`🚀 Starting flow execution: ${flow.name}`);

    // Create execution document
    const execution = await this.executionModel.create({
      flowId: (flow as any)._id,
      status: 'running',
      triggerType: flow.triggerType,
      triggerData,
      branches: [
        {
          branchId: 'root',
          status: 'running',
          currentNodeId: 'trigger',
          path: [],
        },
      ],
      executedNodes: [],
    });

    this.logger.log(`Created execution: ${execution._id}`);

    try {
      // Find trigger node
      const triggerNode = flow.nodes.find((n) => n.type === NodeType.TRIGGER);
      if (!triggerNode) {
        throw new Error('No trigger node found');
      }

      // Execute from trigger
      await this.executeNode(triggerNode, flow, execution._id.toString(), triggerData, 'root');

      this.logger.log(`✅ Flow execution initiated: ${execution._id}`);
      
      // Completion is now handled by the END node when all branches arrive
      const result = await this.executionModel.findById(execution._id);
      return result!;
    } catch (error) {
      this.logger.error(`❌ Flow execution failed: ${execution._id}`, error);
      
      // Mark as failed
      await this.executionModel.updateOne(
        { _id: execution._id },
        { status: 'failed' }
      );

      const result = await this.executionModel.findById(execution._id);
      return result!;
    }
  }

  async continueNode(
    node: FlowNode,
    flow: Flow,
    executionId: string,
    data: Record<string, any>,
    branchId: string,
  ): Promise<void> {
    return this.executeNode(node, flow, executionId, data, branchId);
  }

  async retryExecution(executionId: string): Promise<ExecutionDocument> {
    this.logger.log(`🔄 Retrying execution: ${executionId}`);

    // Get the execution
    const execution = await this.executionModel.findById(executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    // Get the flow
    const flow = await this.executionModel.findById(execution.flowId).exec();
    if (!flow) {
      throw new Error('Flow not found');
    }

    // Find the first failed node
    const failedNode = execution.executedNodes.find(n => n.status === 'failed');
    if (!failedNode) {
      throw new Error('No failed node found to retry');
    }

    this.logger.log(`Found failed node: ${failedNode.nodeId}`);

    // Reset the failed node to allow retry
    await this.executionModel.updateOne(
      { _id: executionId, 'executedNodes.nodeId': failedNode.nodeId },
      {
        $set: {
          'executedNodes.$.status': 'running',
          'executedNodes.$.error': null,
          'executedNodes.$.retryCount': 0,
        },
      },
    );

    // Update execution status back to running
    await this.executionModel.updateOne(
      { _id: executionId },
      { status: 'running' },
    );

    // Get the flow from flows collection (cast to any to avoid type issues)
    const flowDoc: any = await this.executionModel.db.collection('flows').findOne({ _id: execution.flowId });
    
    // Find the node in the flow
    const node = flowDoc.nodes.find((n: any) => n.id === failedNode.nodeId);
    if (!node) {
      throw new Error(`Node ${failedNode.nodeId} not found in flow`);
    }

    // Retry from this node with original trigger data
    try {
      await this.executeNode(node, flowDoc, executionId, execution.triggerData, 'root');
      
      // Completion is now handled by the END node when all branches arrive
      this.logger.log(`Retry execution resumed for ${executionId}`);
    } catch (error) {
      this.logger.error(`Retry failed for execution ${executionId}:`, error);
      // Keep as failed
      await this.executionModel.updateOne(
        { _id: executionId },
        { status: 'failed' },
      );
    }

    return (await this.executionModel.findById(executionId))!;
  }

  private async executeNode(
    node: FlowNode,
    flow: Flow,
    executionId: string,
    data: Record<string, any>,
    branchId: string,
  ): Promise<void> {
    this.logger.log(`📍 Executing node: ${node.id} (${node.type}) [branch: ${branchId}]`);

    // Special handling for END node - it needs to track multiple arrivals
    if (node.type === NodeType.END) {
      // Atomically ensure END node exists (only once) using $addToSet with a unique marker
      // We'll use a simple approach: try to add, and MongoDB's array uniqueness will prevent duplicates
      // But since we can't rely on array uniqueness without an index, we'll use a different strategy:
      // Always try to increment arrivalCount, and if the node doesn't exist, it will fail gracefully
      
      // First, ensure the END node exists (race-safe with MongoDB's atomic operations)
      const updateResult = await this.executionModel.updateOne(
        { 
          _id: executionId, 
          'executedNodes.nodeId': { $ne: node.id } // Only if END node doesn't exist
        },
        {
          $push: {
            executedNodes: {
              nodeId: node.id,
              nodeType: node.type,
              status: 'running',
              startTime: new Date(),
              idempotencyKey: `${executionId}_${node.id}`,
              retryCount: 0,
              arrivalCount: 0,
            },
          },
        },
      );

      // Execute END node logic (handles arrival counting and completion)
      const result = await this.executeEnd(node, flow, executionId, data);
      
      // Mark as completed (executeEnd may have already set completion status)
      await this.executionModel.updateOne(
        { _id: executionId, 'executedNodes.nodeId': node.id },
        {
          $set: {
            'executedNodes.$.status': 'completed',
            'executedNodes.$.result': result,
          },
        },
      );
      
      return; // END node handling complete
    }

    // For non-END nodes: Check if already executed (idempotency)
    const existing = await this.executionModel.findOne({
      _id: executionId,
      'executedNodes.nodeId': node.id,
    });

    if (existing) {
      const nodeExec = existing.executedNodes.find(n => n.nodeId === node.id);
      if (nodeExec?.status === 'completed') {
        this.logger.warn(`⚠️  Node ${node.id} already executed, skipping`);
        return;
      }
    }

    const idempotencyKey = `${executionId}_${node.id}`;

    // Mark node as running in DB (atomic)
    if (!existing) {
      await this.executionModel.updateOne(
        { _id: executionId },
        {
          $push: {
            executedNodes: {
              nodeId: node.id,
              nodeType: node.type,
              status: 'running',
              startTime: new Date(),
              idempotencyKey,
              retryCount: 0,
              arrivalCount: 0,
            },
          },
        },
      );
    }

    try {
      let result: any;

      switch (node.type) {
        case NodeType.TRIGGER:
          result = await this.executeTrigger(node, data, idempotencyKey);
          break;
        case NodeType.SEND_MESSAGE:
          result = await this.executeSendMessage(node, data, idempotencyKey);
          break;
        case NodeType.ADD_ORDER_NOTE:
          result = await this.executeAddOrderNote(node, data, idempotencyKey);
          break;
        case NodeType.ADD_CUSTOMER_NOTE:
          result = await this.executeAddCustomerNote(node, data, idempotencyKey);
          break;
        case NodeType.TIME_DELAY:
          await this.executeTimeDelay(node, flow, executionId, data, branchId);
          return; // Delay exits early, will resume via queue
        case NodeType.CONDITIONAL_SPLIT:
          result = await this.executeConditionalSplit(node, flow, executionId, data, branchId);
          return; // Conditional split handles its own next nodes
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Mark node as completed (atomic)
      await this.executionModel.updateOne(
        { _id: executionId, 'executedNodes.nodeId': node.id },
        {
          $set: {
            'executedNodes.$.status': 'completed',
            'executedNodes.$.endTime': new Date(),
            'executedNodes.$.result': result,
          },
        },
      );

      // Find and execute next nodes in parallel
      const nextEdges = flow.edges.filter((e) => e.source === node.id);

      if (nextEdges.length > 1) {
        this.logger.log(`   → Executing ${nextEdges.length} branches in parallel`);
        
        // Create new branches
        const newBranches = nextEdges.map((edge, i) => ({
          branchId: `${branchId}_${i}`,
          status: 'running',
          currentNodeId: edge.target,
          path: [node.id],
        }));

        await this.executionModel.updateOne(
          { _id: executionId },
          { $push: { branches: { $each: newBranches } } },
        );
      }

      const nextNodePromises = nextEdges.map((edge, i) => {
        const nextNode = flow.nodes.find((n) => n.id === edge.target);
        if (nextNode) {
          const nextBranchId = nextEdges.length > 1 ? `${branchId}_${i}` : branchId;
          return this.executeNode(nextNode, flow, executionId, data, nextBranchId);
        }
        return Promise.resolve();
      });

      // Execute all branches in parallel
      await Promise.all(nextNodePromises);

    } catch (error) {
      this.logger.error(`Error executing node ${node.id}:`, error);

      // Get current retry count
      const exec = await this.executionModel.findOne({
        _id: executionId,
        'executedNodes.nodeId': node.id,
      });

      const nodeExec = exec?.executedNodes.find(n => n.nodeId === node.id);
      const retryCount = nodeExec?.retryCount || 0;

      if (retryCount < 3) {
        // Retry with exponential backoff
        this.logger.log(`Retrying node ${node.id}, attempt ${retryCount + 1}/3`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));

        await this.executionModel.updateOne(
          { _id: executionId, 'executedNodes.nodeId': node.id },
          { $inc: { 'executedNodes.$.retryCount': 1 } },
        );

        return this.executeNode(node, flow, executionId, data, branchId);
      }

      // Failed after retries
      await this.executionModel.updateOne(
        { _id: executionId, 'executedNodes.nodeId': node.id },
        {
          $set: {
            'executedNodes.$.status': 'failed',
            'executedNodes.$.error': error.message,
            'executedNodes.$.endTime': new Date(),
          },
        },
      );

      throw error;
    }
  }

  private async executeTrigger(
    node: FlowNode,
    data: Record<string, any>,
    idempotencyKey: string,
  ): Promise<any> {
    this.logger.log(`⚡ TRIGGER: Flow started with data:`, JSON.stringify(data));

    return {
      message: 'Flow triggered',
      triggerData: data,
    };
  }

  private async executeSendMessage(
    node: FlowNode,
    data: Record<string, any>,
    idempotencyKey: string,
  ): Promise<any> {
    const config = node.config || {};
    const message = config.message || 'Default message';

    // Simulate template variable replacement
    let processedMessage = message;
    const varMatches = message.match(/\{([^}]+)\}/g) || [];
    for (const match of varMatches) {
      const varName = match.slice(1, -1);
      const value = data[varName] || `[${varName}]`;
      processedMessage = processedMessage.replace(match, value);
    }

    // Mock API call with idempotency
    const mockApiResponse = await this.mockSendWhatsAppMessage({
      idempotencyKey,
      to: data.customer_phone || '+1234567890',
      message: processedMessage,
      template: config.template || 'default',
    });

    this.logger.log(`📱 SEND_MESSAGE: Sent WhatsApp to ${mockApiResponse.to}`);
    this.logger.log(`   Message: "${processedMessage}"`);

    return {
      to: mockApiResponse.to,
      message: processedMessage,
      messageId: mockApiResponse.messageId,
    };
  }

  private async executeAddOrderNote(
    node: FlowNode,
    data: Record<string, any>,
    idempotencyKey: string,
  ): Promise<any> {
    const config = node.config || {};
    const note = config.note || 'Order note';
    const orderId = data.order_id || 'unknown';

    // Mock API call with idempotency
    const mockApiResponse = await this.mockAddOrderNote({
      idempotencyKey,
      orderId,
      note,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`📝 ADD_ORDER_NOTE: Added note to order ${orderId}`);
    this.logger.log(`   Note: "${note}"`);

    return {
      orderId,
      noteId: mockApiResponse.noteId,
      note,
    };
  }

  private async executeAddCustomerNote(
    node: FlowNode,
    data: Record<string, any>,
    idempotencyKey: string,
  ): Promise<any> {
    const config = node.config || {};
    const note = config.note || 'Customer note';
    const customerId = data.customer_id || 'unknown';

    // Mock API call with idempotency
    const mockApiResponse = await this.mockAddCustomerNote({
      idempotencyKey,
      customerId,
      note,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`👤 ADD_CUSTOMER_NOTE: Added note to customer ${customerId}`);
    this.logger.log(`   Note: "${note}"`);

    return {
      customerId,
      noteId: mockApiResponse.noteId,
      note,
    };
  }

  private async executeTimeDelay(
    node: FlowNode,
    flow: Flow,
    executionId: string,
    data: Record<string, any>,
    branchId: string,
  ): Promise<void> {
    const config = node.config || {};
    const duration = config.duration || 0;
    const unit = config.unit || 'minutes';

    // Convert to milliseconds
    let delayMs = 0;
    switch (unit) {
      case 'seconds':
        delayMs = duration * 1000;
        break;
      case 'minutes':
        delayMs = duration * 60 * 1000;
        break;
      case 'hours':
        delayMs = duration * 60 * 60 * 1000;
        break;
      case 'days':
        delayMs = duration * 24 * 60 * 60 * 1000;
        break;
    }

    this.logger.log(`⏱️  TIME_DELAY: Scheduling ${duration} ${unit} (${delayMs}ms)`);

    // Get next node IDs
    const nextNodeIds = flow.edges
      .filter((e) => e.source === node.id)
      .map((e) => e.target);

    // Save delay state
    await this.executionModel.updateOne(
      { _id: executionId },
      {
        status: 'delayed',
        resumeAt: new Date(Date.now() + delayMs),
        resumeData: {
          nextNodeIds,
          context: data,
          branchId,
        },
      },
    );

    // Mark delay node as completed
    await this.executionModel.updateOne(
      { _id: executionId, 'executedNodes.nodeId': node.id },
      {
        $set: {
          'executedNodes.$.status': 'completed',
          'executedNodes.$.endTime': new Date(),
          'executedNodes.$.result': { duration, unit, delayMs },
        },
      },
    );

    // Schedule resume job in BullMQ
    await this.delayQueue.add(
      'resume-execution',
      {
        executionId,
        nextNodeIds,
        context: data,
        branchId,
      },
      { delay: delayMs },
    );

    this.logger.log(`⏱️  TIME_DELAY: Scheduled to resume at ${new Date(Date.now() + delayMs).toISOString()}`);
  }

  private async executeConditionalSplit(
    node: FlowNode,
    flow: Flow,
    executionId: string,
    data: Record<string, any>,
    branchId: string,
  ): Promise<any> {
    const config = node.config || {};
    const conditionGroups = config.conditionGroups || [];
    const groupsLogic = config.groupsLogic || 'AND';

    this.logger.log(`🔀 CONDITIONAL_SPLIT: Evaluating conditions`);
    this.logger.log(`   Groups Logic: ${groupsLogic}`);

    // Evaluate each group
    const groupResults = conditionGroups.map((group: any) => {
      const conditions = group.conditions || [];
      const groupLogic = group.groupLogic || 'AND';

      const conditionResults = conditions.map((cond: any) => {
        const fieldValue = data[cond.field];
        const condValue = cond.value;
        let result = false;

        switch (cond.operator) {
          case 'equals':
            result = fieldValue == condValue;
            break;
          case 'not_equals':
            result = fieldValue != condValue;
            break;
          case 'contains':
            result = String(fieldValue).includes(String(condValue));
            break;
          case 'greater_than':
            result = Number(fieldValue) > Number(condValue);
            break;
          case 'less_than':
            result = Number(fieldValue) < Number(condValue);
            break;
          case 'greater_or_equal':
            result = Number(fieldValue) >= Number(condValue);
            break;
          case 'less_or_equal':
            result = Number(fieldValue) <= Number(condValue);
            break;
          default:
            result = false;
        }

        this.logger.log(
          `     - ${cond.field} ${cond.operator} ${condValue}: ${result} (actual: ${fieldValue})`,
        );
        return result;
      });

      const groupResult =
        groupLogic === 'AND'
          ? conditionResults.every((r: boolean) => r)
          : conditionResults.some((r: boolean) => r);

      return groupResult;
    });

    // Combine group results
    const finalResult =
      groupsLogic === 'AND'
        ? groupResults.every((r: boolean) => r)
        : groupResults.some((r: boolean) => r);

    this.logger.log(`   Final result: ${finalResult}`);

    // Mark node as completed
    await this.executionModel.updateOne(
      { _id: executionId, 'executedNodes.nodeId': node.id },
      {
        $set: {
          'executedNodes.$.status': 'completed',
          'executedNodes.$.endTime': new Date(),
          'executedNodes.$.result': { result: finalResult, groupResults },
        },
      },
    );

    // Find appropriate edge to follow
    const outgoingEdges = flow.edges.filter((e) => e.source === node.id);
    const resultEdge = outgoingEdges.find(
      (e) => e.sourceHandle === (finalResult ? 'true' : 'false'),
    );

    if (resultEdge) {
      const nextNode = flow.nodes.find((n) => n.id === resultEdge.target);
      if (nextNode) {
        this.logger.log(`   → Following ${finalResult ? 'TRUE' : 'FALSE'} path to ${nextNode.id}`);
        await this.executeNode(nextNode, flow, executionId, data, branchId);
      }
    } else {
      this.logger.warn(`   ⚠️  No edge found for ${finalResult ? 'TRUE' : 'FALSE'} path`);
    }

    return { result: finalResult };
  }

  private async executeEnd(
    node: FlowNode,
    flow: Flow,
    executionId: string,
    data: Record<string, any>,
  ): Promise<any> {
    this.logger.log(`🏁 END: Branch reached end node`);

    // Get all incoming edges to END node
    const incomingEdges = flow.edges.filter(e => e.target === node.id);
    const expectedBranches = incomingEdges.length;

    // Atomically increment counter for END node arrivals
    const result = await this.executionModel.findOneAndUpdate(
      { _id: executionId, 'executedNodes.nodeId': node.id },
      {
        $inc: { 'executedNodes.$.arrivalCount': 1 },
        $set: {
          'executedNodes.$.endTime': new Date(),
        }
      },
      { new: true }
    );

    const endNodeExec = result?.executedNodes.find(n => n.nodeId === node.id);
    const arrivalCount = endNodeExec?.arrivalCount || 1;

    this.logger.log(`   Arrivals: ${arrivalCount}/${expectedBranches}`);

    // Only mark as completed when ALL branches have arrived
    if (arrivalCount >= expectedBranches) {
      this.logger.log(`   ✅ All branches completed! Marking flow as done.`);
      await this.executionModel.updateOne(
        { _id: executionId },
        { $set: { status: 'completed' } },
      );
    } else {
      this.logger.log(`   ⏳ Waiting for ${expectedBranches - arrivalCount} more branches...`);
    }

    return { message: 'Branch reached end', arrivalCount, expectedBranches };
  }

  // Mock API implementations with idempotency
  private async mockSendWhatsAppMessage(payload: {
    idempotencyKey: string;
    to: string;
    message: string;
    template: string;
  }): Promise<{ messageId: string; to: string; status: string }> {
    // Check idempotency
    if (this.sentMessages.has(payload.idempotencyKey)) {
      this.logger.log(`   [Idempotent] Message already sent`);
      return this.sentMessages.get(payload.idempotencyKey);
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = {
      messageId: `msg_${Date.now()}`,
      to: payload.to,
      status: 'sent',
    };

    this.sentMessages.set(payload.idempotencyKey, result);
    return result;
  }

  private async mockAddOrderNote(payload: {
    idempotencyKey: string;
    orderId: string;
    note: string;
    timestamp: string;
  }): Promise<{ noteId: string; orderId: string }> {
    // Check idempotency
    if (this.orderNotes.has(payload.idempotencyKey)) {
      this.logger.log(`   [Idempotent] Order note already added`);
      return this.orderNotes.get(payload.idempotencyKey);
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = {
      noteId: `note_${Date.now()}`,
      orderId: payload.orderId,
    };

    this.orderNotes.set(payload.idempotencyKey, result);
    return result;
  }

  private async mockAddCustomerNote(payload: {
    idempotencyKey: string;
    customerId: string;
    note: string;
    timestamp: string;
  }): Promise<{ noteId: string; customerId: string }> {
    // Check idempotency
    if (this.customerNotes.has(payload.idempotencyKey)) {
      this.logger.log(`   [Idempotent] Customer note already added`);
      return this.customerNotes.get(payload.idempotencyKey);
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = {
      noteId: `note_${Date.now()}`,
      customerId: payload.customerId,
    };

    this.customerNotes.set(payload.idempotencyKey, result);
    return result;
  }
}
