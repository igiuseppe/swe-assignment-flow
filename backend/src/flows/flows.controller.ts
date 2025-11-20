import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FlowsService } from './flows.service';
import { FlowExecutionService } from './execution.service';
import { Execution, ExecutionDocument } from './schemas/execution.schema';
import { TriggerType } from './schemas/flow.schema';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { ValidateFlowDto } from './dto/validate-flow.dto';
import { RetryExecutionDto } from './dto/retry-execution.dto';
import { FireTriggerDto } from './dto/fire-trigger.dto';
import { ImportFlowDto } from './dto/import-flow.dto';

@Controller('flows')
export class FlowsController {
  constructor(
    private readonly flowsService: FlowsService,
    private readonly executionService: FlowExecutionService,
    @InjectModel(Execution.name) private executionModel: Model<ExecutionDocument>,
  ) {}

  @Post()
  create(@Body() createFlowDto: CreateFlowDto) {
    return this.flowsService.create(createFlowDto);
  }

  @Post('import')
  async importFlow(@Body() importFlowDto: ImportFlowDto) {
    // Create flow from imported data
    const flow = await this.flowsService.create({
      name: importFlowDto.name,
      triggerType: importFlowDto.triggerType,
      description: importFlowDto.description,
    });

    // Update with nodes and edges
    const flowDoc = flow as any; // Cast to access _id from document
    return this.flowsService.update(flowDoc._id.toString(), {
      nodes: importFlowDto.nodes as any,
      edges: importFlowDto.edges as any,
      isActive: importFlowDto.isActive || false,
    });
  }

  @Post('demo')
  async createDemoFlow() {
    // Create a comprehensive demo flow: NEW_ORDER trigger with conditional logic
    const demoFlow = await this.flowsService.create({
      name: 'Demo E-commerce Flow',
      triggerType: TriggerType.NEW_ORDER,
      description: 'A complete demo flow showcasing conditional logic, delays, and actions',
    });

    const nodes: any[] = [
      {
        id: 'trigger-1',
        type: 'TRIGGER',
        category: 'SYSTEM',
        position: { x: 400, y: 50 },
        config: {},
      },
      {
        id: 'condition-1',
        type: 'CONDITIONAL_SPLIT',
        category: 'LOGIC',
        position: { x: 400, y: 150 },
        config: {
          conditionGroups: [
            {
              conditions: [
                {
                  field: 'order_total',
                  operator: 'greater_than',
                  value: '50',
                },
              ],
              groupLogic: 'AND',
            },
          ],
          groupsLogic: 'AND',
        },
      },
      // TRUE path: High-value order
      {
        id: 'message-1',
        type: 'SEND_MESSAGE',
        category: 'ACTION',
        position: { x: 250, y: 280 },
        config: {
          message: 'Thank you for your order of ${{order_total}}! 🎉 Free shipping applied.',
          variables: 'order_total',
        },
      },
      {
        id: 'delay-1',
        type: 'TIME_DELAY',
        category: 'TIMING',
        position: { x: 250, y: 380 },
        config: {
          duration: 10,
          unit: 'seconds',
        },
      },
      {
        id: 'note-1',
        type: 'ADD_ORDER_NOTE',
        category: 'ACTION',
        position: { x: 250, y: 480 },
        config: {
          note: 'VIP order processed - free shipping applied',
        },
      },
      // FALSE path: Standard order
      {
        id: 'message-2',
        type: 'SEND_MESSAGE',
        category: 'ACTION',
        position: { x: 550, y: 280 },
        config: {
          message: 'Thank you for your order! Your order #{{order_id}} is being processed.',
          variables: 'order_id',
        },
      },
      {
        id: 'note-2',
        type: 'ADD_ORDER_NOTE',
        category: 'ACTION',
        position: { x: 550, y: 380 },
        config: {
          note: 'Standard order processed',
        },
      },
      // Convergence point
      {
        id: 'end-1',
        type: 'END',
        category: 'SYSTEM',
        position: { x: 400, y: 580 },
        config: {},
      },
    ];

    const edges: any[] = [
      { id: 'e1', source: 'trigger-1', target: 'condition-1' },
      { id: 'e2', source: 'condition-1', target: 'message-1', sourceHandle: 'true', label: 'TRUE' },
      { id: 'e3', source: 'message-1', target: 'delay-1' },
      { id: 'e4', source: 'delay-1', target: 'note-1' },
      { id: 'e5', source: 'note-1', target: 'end-1' },
      { id: 'e6', source: 'condition-1', target: 'message-2', sourceHandle: 'false', label: 'FALSE' },
      { id: 'e7', source: 'message-2', target: 'note-2' },
      { id: 'e8', source: 'note-2', target: 'end-1' },
    ];

    const flowDoc = demoFlow as any; // Cast to access _id from document
    return this.flowsService.update(flowDoc._id.toString(), {
      nodes,
      edges,
    });
  }

  @Get()
  findAll() {
    return this.flowsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flowsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFlowDto: UpdateFlowDto) {
    return this.flowsService.update(id, updateFlowDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.flowsService.remove(id);
  }

  @Post(':id/validate')
  validate(@Param('id') id: string) {
    return this.flowsService.validate(id);
  }

  @Post('validate')
  validateData(@Body() validateFlowDto: ValidateFlowDto) {
    return this.flowsService.validateData(validateFlowDto);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.flowsService.activate(id);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.flowsService.deactivate(id);
  }

  @Post(':id/execute')
  async execute(
    @Param('id') id: string,
    @Body() triggerData: Record<string, any>,
  ) {
    const flow = await this.flowsService.findOne(id);
    return this.executionService.executeFlow(flow, triggerData || {});
  }

  @Get(':id/executions')
  async getExecutions(@Param('id') flowId: string) {
    // Convert string to ObjectId for proper query
    const flowObjectId = new Types.ObjectId(flowId);
    return this.executionModel
      .find({ flowId: flowObjectId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  @Get(':id/stats')
  async getFlowStats(@Param('id') flowId: string) {
    const flowObjectId = new Types.ObjectId(flowId);
    
    // Get all executions for this flow
    const executions = await this.executionModel
      .find({ flowId: flowObjectId })
      .exec();

    const totalExecutions = executions.length;
    const successCount = executions.filter(e => e.status === 'completed').length;
    const failedCount = executions.filter(e => e.status === 'failed').length;
    const runningCount = executions.filter(e => e.status === 'running' || e.status === 'delayed').length;

    // Calculate total retries across all executions
    const totalRetries = executions.reduce((sum, exec) => {
      const executionRetries = exec.executedNodes.reduce((nodeSum, node) => {
        return nodeSum + (node.retryCount || 0);
      }, 0);
      return sum + executionRetries;
    }, 0);

    // Calculate average duration for completed executions
    const completedExecutions = executions.filter(e => e.status === 'completed');
    let avgDuration = 0;
    if (completedExecutions.length > 0) {
      const totalDuration = completedExecutions.reduce((sum, exec) => {
        const duration = new Date(exec.updatedAt).getTime() - new Date(exec.createdAt).getTime();
        return sum + duration;
      }, 0);
      avgDuration = Math.round(totalDuration / completedExecutions.length / 1000); // Convert to seconds
    }

    return {
      totalExecutions,
      successCount,
      failedCount,
      runningCount,
      totalRetries,
      avgDuration, // in seconds
    };
  }

  @Get('executions/:executionId')
  async getExecution(@Param('executionId') id: string) {
    return this.executionModel.findById(id).exec();
  }

  @Post('executions/:executionId/retry')
  async retryExecution(
    @Param('executionId') id: string,
    @Body() retryDto: RetryExecutionDto,
  ) {
    return this.executionService.retryExecution(id, retryDto.nodeIds);
  }

  @Post('trigger/:triggerType')
  async fireTrigger(
    @Param('triggerType') triggerType: TriggerType,
    @Body() fireTriggerDto: FireTriggerDto,
  ) {
    // Find all active flows with this trigger type
    const activeFlows = await this.flowsService.findActiveByTriggerType(triggerType);

    if (activeFlows.length === 0) {
      return {
        message: `No active flows found for trigger type: ${triggerType}`,
        executions: [],
        flowsTriggered: 0,
      };
    }

    // Execute all flows in parallel (non-blocking)
    const executionPromises = activeFlows.map(flow =>
      this.executionService.executeFlow(flow, fireTriggerDto.payload || {})
    );

    // Fire and forget - return immediately with execution IDs
    const executions = await Promise.all(executionPromises);

    return {
      message: `Triggered ${activeFlows.length} flow(s)`,
      triggerType,
      flowsTriggered: activeFlows.length,
      executions: executions.map(exec => ({
        executionId: exec._id,
        flowId: exec.flowId,
      })),
    };
  }
}

