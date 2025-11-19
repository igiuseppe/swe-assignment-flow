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
      await Promise.all(
        nextNodeIds.map((nodeId: string) => {
          const node = flow.nodes.find((n) => n.id === nodeId);
          if (node) {
            return this.executionService.continueNode(node, flow, executionId, context, branchId);
          }
          return Promise.resolve();
        }),
      );

      this.logger.log(`✅ Execution resumed successfully: ${executionId}`);
    } catch (error) {
      this.logger.error(`Failed to resume execution ${executionId}:`, error);
      
      // Mark execution as failed
      await this.executionModel.updateOne(
        { _id: executionId },
        { status: 'failed' },
      );
    }
  }
}

