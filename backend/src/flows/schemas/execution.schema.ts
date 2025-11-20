import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExecutionDocument = Execution & Document;

@Schema({ _id: false })
export class PathNode {
  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true })
  nodeType: string;
}

@Schema({ _id: false })
export class Branch {
  @Prop({ required: true })
  branchId: string;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  currentNodeId: string;

  @Prop({ type: [Object], default: [] })
  path: PathNode[];

  @Prop({ type: Object })
  resumeData?: {
    nextNodeIds: string[];
    context: Record<string, any>;
  };
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

@Schema({ _id: false })
export class ExecutedNode {
  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true })
  nodeType: string;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ type: Object })
  result?: Record<string, any>;

  @Prop()
  error?: string;

  @Prop({ required: true })
  idempotencyKey: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 0 })
  arrivalCount: number; //no need anymore
}

export const ExecutedNodeSchema = SchemaFactory.createForClass(ExecutedNode);

@Schema({ timestamps: true, collection: 'executions' })
export class Execution {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Flow' })
  flowId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['running', 'delayed', 'completed', 'failed'],
  })
  status: string;

  @Prop({ required: true })
  triggerType: string;

  @Prop({ type: Object, required: true })
  triggerData: Record<string, any>;

  @Prop({ type: [BranchSchema], default: [] })
  branches: Branch[];

  @Prop({ type: [ExecutedNodeSchema], default: [] })
  executedNodes: ExecutedNode[];

  @Prop()
  resumeAt?: Date;

  @Prop()
  error?: string;

  @Prop({ type: Object })
  errorDetails?: {
    failedBranches: string[];
    failedNodes: { nodeId: string; nodeType: string; error: string; }[];
    lastError: string;
    timestamp: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

export const ExecutionSchema = SchemaFactory.createForClass(Execution);

// Indexes for efficient queries
ExecutionSchema.index({ flowId: 1, status: 1, createdAt: -1 });
ExecutionSchema.index({ status: 1, resumeAt: 1 });

