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

export interface Position {
  x: number;
  y: number;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: Position;
  config?: Record<string, any>;
  data?: {
    label: string;
    type: NodeType;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
}

export interface Flow {
  _id?: string;
  name: string;
  description?: string;
  triggerType: TriggerType;
  isActive: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CreateFlowDto {
  name: string;
  triggerType: TriggerType;
  description?: string;
}

