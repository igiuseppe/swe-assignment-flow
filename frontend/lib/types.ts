export enum NodeCategory {
  ACTION = 'ACTION',
  TIMING = 'TIMING',
  LOGIC = 'LOGIC',
  SYSTEM = 'SYSTEM',
}

export enum NodeType {
  TRIGGER = 'TRIGGER',
  SEND_MESSAGE = 'SEND_MESSAGE',
  TIME_DELAY = 'TIME_DELAY',
  CONDITIONAL_SPLIT = 'CONDITIONAL_SPLIT',
  ADD_ORDER_NOTE = 'ADD_ORDER_NOTE',
  ADD_CUSTOMER_NOTE = 'ADD_CUSTOMER_NOTE',
  END = 'END',
}

export const NODE_TYPE_TO_CATEGORY: Record<NodeType, NodeCategory> = {
  [NodeType.TRIGGER]: NodeCategory.SYSTEM,
  [NodeType.SEND_MESSAGE]: NodeCategory.ACTION,
  [NodeType.ADD_ORDER_NOTE]: NodeCategory.ACTION,
  [NodeType.ADD_CUSTOMER_NOTE]: NodeCategory.ACTION,
  [NodeType.TIME_DELAY]: NodeCategory.TIMING,
  [NodeType.CONDITIONAL_SPLIT]: NodeCategory.LOGIC,
  [NodeType.END]: NodeCategory.SYSTEM,
};

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
  category: NodeCategory;
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

export interface PathNode {
  nodeId: string;
  nodeType: string;
}

export interface Branch {
  branchId: string;
  status: string;
  currentNodeId: string;
  path: PathNode[];
  resumeData?: {
    nextNodeIds: string[];
    context: Record<string, any>;
  };
}

export interface ExecutedNode {
  nodeId: string;
  nodeType: string;
  status: string;
  startTime: string;
  endTime?: string;
  result?: Record<string, any>;
  error?: string;
  idempotencyKey: string;
  retryCount: number;
  arrivalCount: number;
}

export interface Execution {
  _id: string;
  flowId: string;
  status: 'running' | 'delayed' | 'completed' | 'failed';
  triggerType: string;
  triggerData: Record<string, any>;
  branches: Branch[];
  executedNodes: ExecutedNode[];
  resumeAt?: string;
  error?: string;
  errorDetails?: {
    failedBranches: string[];
    failedNodes: { nodeId: string; nodeType: string; error: string; }[];
    lastError: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}
