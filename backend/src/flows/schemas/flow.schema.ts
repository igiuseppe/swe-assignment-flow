import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FlowDocument = Flow & Document;

export enum NodeType {
  TRIGGER = 'TRIGGER',
  SEND_MESSAGE = 'SEND_MESSAGE',
  TIME_DELAY = 'TIME_DELAY',
  CONDITIONAL_SPLIT = 'CONDITIONAL_SPLIT',
  ADD_ORDER_NOTE = 'ADD_ORDER_NOTE',
  ADD_CUSTOMER_NOTE = 'ADD_CUSTOMER_NOTE',
  END = 'END',
}

export enum TriggerType {
  NEW_ORDER = 'NEW_ORDER',
  ABANDONED_CHECKOUT = 'ABANDONED_CHECKOUT',
  CUSTOMER_REGISTRATION = 'CUSTOMER_REGISTRATION',
  ORDER_STATUS_CHANGE = 'ORDER_STATUS_CHANGE',
}

@Schema({ _id: false })
export class Position {
  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;
}

@Schema({ _id: false })
export class FlowNode {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, enum: NodeType })
  type: NodeType;

  @Prop({ type: Position, required: true })
  position: Position;

  @Prop({ type: Object, default: {} })
  config: Record<string, any>;
}

@Schema({ _id: false })
export class FlowEdge {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  target: string;

  @Prop()
  label?: string;

  @Prop()
  sourceHandle?: string;
}

@Schema({ timestamps: true, collection: 'flows' })
export class Flow {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: TriggerType })
  triggerType: TriggerType;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: [FlowNode], default: [] })
  nodes: FlowNode[];

  @Prop({ type: [FlowEdge], default: [] })
  edges: FlowEdge[];

  @Prop({ default: 1 })
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

export const FlowSchema = SchemaFactory.createForClass(Flow);

// Indexes
FlowSchema.index({ triggerType: 1, isActive: 1 });
FlowSchema.index({ isActive: 1 });
FlowSchema.index({ createdAt: -1 });

