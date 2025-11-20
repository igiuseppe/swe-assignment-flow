import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Job } from 'bull';
import { Execution, ExecutionDocument } from './schemas/execution.schema';
import { Flow, FlowDocument } from './schemas/flow.schema';
import { FlowExecutionService } from './execution.service';

@Injectable()
@Processor('flow-delays')
export class DelayProcessor {
  private readonly logger = new Logger(DelayProcessor.name);

  constructor(
    @InjectModel(Execution.name) private executionModel: Model<ExecutionDocument>,
    @InjectModel(Flow.name) private flowModel: Model<FlowDocument>,
    private executionService: FlowExecutionService,
  ) {}

  @Process('resume-execution')
  async handleDelayResume(job: Job) {
    const { executionId, nextNodeIds, context, branchId } = job.data;

    this.logger.log(`⏰ Resuming execution: ${executionId}`);

    try {
      const execution = await this.executionModel.findById(executionId);
      if (!execution) {
        this.logger.error(`Execution ${executionId} not found`);
        return;
      }

      const flow = await this.flowModel.findById(execution.flowId);
      if (!flow) {
        this.logger.error(`Flow ${execution.flowId} not found`);
        return;
      }

      // Mark branch as running and clear resumeData
      await this.executionModel.updateOne(
        { _id: executionId, 'branches.branchId': branchId },
        {
          $set: { 'branches.$.status': 'running' },
          $unset: { 'branches.$.resumeData': '' },
        },
      );

      // Check if any other branches are still delayed
      const updatedExec = await this.executionModel.findById(executionId);
      const hasDelayedBranches = updatedExec?.branches.some(b => b.status === 'delayed');
      
      if (!hasDelayedBranches) {
        // No more delayed branches, mark execution as running and clear resumeAt
        await this.executionModel.updateOne(
          { _id: executionId },
          {
            $set: { status: 'running' },
            $unset: { resumeAt: '' },
          },
        );
      }
      // else: keep execution as 'delayed' since other branches are still waiting

      // Continue execution from next nodes
      // If multiple next nodes, create sub-branches
      if (nextNodeIds.length > 1) {
        this.logger.log(`   → Creating ${nextNodeIds.length} sub-branches after delay`);
        
        // Get parent branch's path to inherit
        const parentBranch = execution.branches.find(b => b.branchId === branchId);
        const parentPath = parentBranch?.path || [];
        
        // Create sub-branches inheriting parent's path
        const newBranches = nextNodeIds.map((nodeId: string, i: number) => ({
          branchId: `${branchId}_${i}`,
          status: 'running',
          currentNodeId: nodeId,
          path: [...parentPath], // Inherit parent's path
        }));

        // Mark parent branch as completed (it has split into children)
        await this.executionModel.updateOne(
          { _id: executionId, 'branches.branchId': branchId },
          { $set: { 'branches.$.status': 'completed' } }
        );

        // Add new child branches
        await this.executionModel.updateOne(
          { _id: executionId },
          { $push: { branches: { $each: newBranches } } }
        );

        // Execute all branches in parallel with new branch IDs
        await Promise.all(
          nextNodeIds.map((nodeId: string, i: number) => {
            const node = flow.nodes.find((n) => n.id === nodeId);
            if (node) {
              const nextBranchId = `${branchId}_${i}`;
              return this.executionService.continueNode(node, flow, executionId, context, nextBranchId);
            }
            return Promise.resolve();
          }),
        );
      } else {
        // Single next node, continue with same branch
        await Promise.all(
          nextNodeIds.map((nodeId: string) => {
            const node = flow.nodes.find((n) => n.id === nodeId);
            if (node) {
              return this.executionService.continueNode(node, flow, executionId, context, branchId);
            }
            return Promise.resolve();
          }),
        );
      }

      this.logger.log(`✅ Execution resumed successfully: ${executionId}`);
    } catch (error) {
      this.logger.error(`Failed to resume execution ${executionId}:`, error);
      
      // Get current execution state to build accurate errorDetails
      const exec = await this.executionModel.findById(executionId);
      if (exec) {
        const failedBranches = exec.branches
          .filter(b => b.status === 'failed')
          .map(b => b.branchId);
        
        const failedNodes = exec.executedNodes
          .filter(n => n.status === 'failed')
          .map(n => ({
            nodeId: n.nodeId,
            nodeType: n.nodeType,
            error: n.error || 'Unknown error',
          }));

        // Only update status if not already failed (to preserve existing errorDetails from executeNode)
        await this.executionModel.updateOne(
          { _id: executionId, status: { $ne: 'failed' } },
          { 
            $set: {
              status: 'failed',
              error: `Failed to resume after delay: ${error.message}`,
              errorDetails: {
                failedBranches,
                failedNodes,
                lastError: `Failed to resume after delay: ${error.message}`,
                timestamp: new Date(),
              }
            }
          },
        );
      }
    }
  }
}

