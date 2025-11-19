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

      // Update status back to running
      await this.executionModel.updateOne(
        { _id: executionId },
        {
          status: 'running',
          $unset: { resumeAt: '', resumeData: '' },
        },
      );

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
      
      // Mark execution as failed with error details
      await this.executionModel.updateOne(
        { _id: executionId },
        { 
          $set: {
            status: 'failed',
            error: error.message,
            errorDetails: {
              failedBranches: [branchId],
              failedNodes: [],
              lastError: `Failed to resume after delay: ${error.message}`,
              timestamp: new Date(),
            }
          }
        },
      );
    }
  }
}

