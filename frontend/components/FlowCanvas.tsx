'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import { FlowNode as FlowNodeType, FlowEdge as FlowEdgeType, NodeType } from '@/lib/types';
import CustomNode from './CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

interface FlowCanvasProps {
  initialNodes: FlowNodeType[];
  initialEdges: FlowEdgeType[];
  onNodesChange: (nodes: FlowNodeType[]) => void;
  onEdgesChange: (edges: FlowEdgeType[]) => void;
  triggerType?: string;
}

function NodeConfigModal({ 
  node, 
  onClose, 
  onSave,
  onDelete 
}: { 
  node: Node | null; 
  onClose: () => void; 
  onSave: (config: Record<string, any>) => void;
  onDelete?: () => void;
}) {
  const [config, setConfig] = useState<Record<string, any>>(node?.data?.config || {});

  if (!node) return null;

  const nodeType = node.data.type as NodeType;

  const renderConfigFields = () => {
    switch (nodeType) {
      case NodeType.SEND_MESSAGE:
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Message Template</label>
              <textarea
                value={config.message || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                placeholder="Enter message template"
                className="w-full border border-gray-300 rounded px-3 py-2 h-24"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Template Variables</label>
              <input
                type="text"
                value={config.variables || ''}
                onChange={(e) => setConfig({ ...config, variables: e.target.value })}
                placeholder="e.g., {customer_name}, {order_id}"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </>
        );
      case NodeType.TIME_DELAY:
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Delay Duration</label>
              <input
                type="number"
                value={config.duration || 0}
                onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                placeholder="Duration"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Unit</label>
              <select
                value={config.unit || 'minutes'}
                onChange={(e) => setConfig({ ...config, unit: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </>
        );
      case NodeType.CONDITIONAL_SPLIT:
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Condition Field</label>
              <input
                type="text"
                value={config.field || ''}
                onChange={(e) => setConfig({ ...config, field: e.target.value })}
                placeholder="e.g., order.total"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Operator</label>
              <select
                value={config.operator || 'equals'}
                onChange={(e) => setConfig({ ...config, operator: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Value</label>
              <input
                type="text"
                value={config.value || ''}
                onChange={(e) => setConfig({ ...config, value: e.target.value })}
                placeholder="Comparison value"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </>
        );
      case NodeType.ADD_ORDER_NOTE:
      case NodeType.ADD_CUSTOMER_NOTE:
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Note Content</label>
            <textarea
              value={config.note || ''}
              onChange={(e) => setConfig({ ...config, note: e.target.value })}
              placeholder="Enter note content"
              className="w-full border border-gray-300 rounded px-3 py-2 h-24"
            />
          </div>
        );
      default:
        return <div className="text-gray-500">No configuration available for this node type</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Configure {String(node.data.label || 'Node')}</h2>
        {renderConfigFields()}
        <div className="flex gap-3 justify-between">
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Node
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(config)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FlowCanvas({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  triggerType,
}: FlowCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const onNodesChangeRef = useRef(onNodesChange);
  const onEdgesChangeRef = useRef(onEdgesChange);

  // Keep refs up to date
  useEffect(() => {
    onNodesChangeRef.current = onNodesChange;
  }, [onNodesChange]);

  useEffect(() => {
    onEdgesChangeRef.current = onEdgesChange;
  }, [onEdgesChange]);

  // Convert to React Flow format
  const convertToReactFlowNodes = (nodes: FlowNodeType[]): Node[] => {
    return nodes.map((node) => {
      const isSystemNode = node.type === NodeType.TRIGGER || node.type === NodeType.END;
      const isTrigger = node.type === NodeType.TRIGGER;
      
      return {
        id: node.id,
        type: 'custom',
        position: node.position,
        data: {
          label: isTrigger ? `⚡ ${triggerType?.replace(/_/g, ' ') || 'TRIGGER'}` : getNodeLabel(node.type),
          type: node.type,
          config: node.config,
          isSystemNode,
        },
        draggable: true,
        deletable: false, // Prevent delete via backspace/delete key
      };
    });
  };

  const convertToReactFlowEdges = (edges: FlowEdgeType[]): Edge[] => {
    return edges.map((edge) => {
      // Automatically label edges from conditional splits based on sourceHandle
      let label = edge.label;
      if (edge.sourceHandle === 'true') {
        label = '✓ True';
      } else if (edge.sourceHandle === 'false') {
        label = '✗ False';
      }
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        label,
        type: 'smoothstep',
        style: edge.sourceHandle === 'true' 
          ? { stroke: '#16a34a', strokeWidth: 2 }
          : edge.sourceHandle === 'false'
          ? { stroke: '#dc2626', strokeWidth: 2 }
          : undefined,
      };
    });
  };

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(
    convertToReactFlowNodes(initialNodes)
  );
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(
    convertToReactFlowEdges(initialEdges)
  );

  // Track if we've initialized to prevent re-initialization loops
  const isInitializedRef = useRef(false);
  const prevInitialNodesRef = useRef<FlowNodeType[]>([]);
  const prevInitialEdgesRef = useRef<FlowEdgeType[]>([]);
  const isSyncingRef = useRef(false);
  const hasLoadedInitialDataRef = useRef(false);

  // Update trigger node label when triggerType changes
  useEffect(() => {
    if (triggerType) {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.data.type === NodeType.TRIGGER) {
            return {
              ...n,
              data: {
                ...n.data,
                label: `⚡ ${triggerType.replace(/_/g, ' ')}`,
              },
            };
          }
          return n;
        })
      );
    }
  }, [triggerType, setNodes]);

  // Only reinitialize when initialNodes actually changes from outside (e.g., page reload)
  useEffect(() => {
    const hasChanged = JSON.stringify(prevInitialNodesRef.current) !== JSON.stringify(initialNodes);
    
    // First time receiving non-empty data = initial load from server
    if (hasChanged && initialNodes.length > 0 && !hasLoadedInitialDataRef.current) {
      console.log('[FlowCanvas] Initial data load from server:', initialNodes);
      hasLoadedInitialDataRef.current = true;
      isSyncingRef.current = true;
      setNodes(convertToReactFlowNodes(initialNodes));
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
    // Subsequent changes after initial load
    else if (hasChanged && isInitializedRef.current && hasLoadedInitialDataRef.current) {
      console.log('[FlowCanvas] initialNodes changed externally, reinitializing:', initialNodes);
      isSyncingRef.current = true;
      setNodes(convertToReactFlowNodes(initialNodes));
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
    
    prevInitialNodesRef.current = initialNodes;
    isInitializedRef.current = true;
  }, [initialNodes]);

  // Only reinitialize when initialEdges actually changes from outside
  useEffect(() => {
    const hasChanged = JSON.stringify(prevInitialEdgesRef.current) !== JSON.stringify(initialEdges);
    
    if (hasChanged && isInitializedRef.current) {
      console.log('[FlowCanvas] initialEdges changed externally, reinitializing:', initialEdges);
      isSyncingRef.current = true;
      setEdges(convertToReactFlowEdges(initialEdges));
      // Allow sync after a brief delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 50);
    }
    
    prevInitialEdgesRef.current = initialEdges;
  }, [initialEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(
        {
          ...params,
          type: 'smoothstep',
          id: `edge_${Date.now()}`,
        },
        edges
      );
      setEdges(newEdges);
      
      // Convert back and notify parent
      const flowEdges: FlowEdgeType[] = newEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label as string,
        sourceHandle: e.sourceHandle as string | undefined,
      }));
      onEdgesChange(flowEdges);
    },
    [edges, setEdges, onEdgesChange]
  );

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChangeInternal(changes);
    },
    [onNodesChangeInternal]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeInternal(changes);
    },
    [onEdgesChangeInternal]
  );

  // Sync nodes and edges to parent whenever they change
  useEffect(() => {
    // Don't sync during reinitialization to avoid overwriting
    if (isSyncingRef.current) {
      console.log('[FlowCanvas] Skipping sync (reinitializing)');
      return;
    }

    // Don't sync until we've loaded initial data from server
    if (!hasLoadedInitialDataRef.current && initialNodes.length === 0) {
      console.log('[FlowCanvas] Skipping sync (waiting for initial data load)');
      return;
    }

    // Convert all nodes (including trigger and end)
    const flowNodes: FlowNodeType[] = nodes.map((n) => ({
      id: n.id,
      type: n.data.type as NodeType,
      position: n.position,
      config: n.data.config || {},
    }));
    console.log('[FlowCanvas] Syncing nodes to parent:', flowNodes);
    onNodesChangeRef.current(flowNodes);
  }, [nodes, initialNodes.length]);

  useEffect(() => {
    // Don't sync during reinitialization to avoid overwriting
    if (isSyncingRef.current) {
      console.log('[FlowCanvas] Skipping sync (reinitializing)');
      return;
    }

    // Don't sync until we've loaded initial data from server
    if (!hasLoadedInitialDataRef.current && initialEdges.length === 0) {
      console.log('[FlowCanvas] Skipping sync (waiting for initial data load)');
      return;
    }

    const flowEdges: FlowEdgeType[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label as string,
      sourceHandle: e.sourceHandle as string | undefined,
    }));
    console.log('[FlowCanvas] Syncing edges to parent:', flowEdges);
    onEdgesChangeRef.current(flowEdges);
  }, [edges, initialEdges.length]);

  const addNode = (type: NodeType) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'custom',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: getNodeLabel(type),
        type: type,
        config: {},
      },
    };
    
    console.log('[FlowCanvas] Adding new node:', newNode);
    setNodes((nds) => [...nds, newNode]);
  };

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Don't open config for system nodes (TRIGGER and END)
    if (node.data.isSystemNode) {
      return;
    }
    setSelectedNode(node);
    setShowConfigModal(true);
  }, []);

  const handleConfigSave = useCallback((config: Record<string, any>) => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? { ...n, data: { ...n.data, config } }
            : n
        )
      );
      setShowConfigModal(false);
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    // Prevent deleting system nodes
    const nodeToDelete = nodes.find((n) => n.id === nodeId);
    if (nodeToDelete?.data.isSystemNode) {
      alert('System nodes (Trigger and End) cannot be deleted');
      return;
    }
    
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [nodes, setNodes, setEdges]);

  // Sync nodes back to parent whenever they change (outside of render)
  const handleSave = useCallback(() => {
    const flowNodes: FlowNodeType[] = nodes.map((n) => ({
      id: n.id,
      type: n.data.type as NodeType,
      position: n.position,
      config: n.data.config || {},
    }));
    const flowEdges: FlowEdgeType[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label as string,
      sourceHandle: e.sourceHandle as string | undefined,
    }));
    onNodesChange(flowNodes);
    onEdgesChange(flowEdges);
  }, [nodes, edges, onNodesChange, onEdgesChange]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
        <Controls />
        
        <Panel position="top-left" className="bg-white p-4 rounded-lg shadow-lg">
          <h3 className="font-semibold mb-3">Add Nodes</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => addNode(NodeType.SEND_MESSAGE)}
              className="px-3 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"
            >
              + Send Message
            </button>
            <button
              onClick={() => addNode(NodeType.TIME_DELAY)}
              className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 text-sm"
            >
              + Time Delay
            </button>
            <button
              onClick={() => addNode(NodeType.CONDITIONAL_SPLIT)}
              className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
            >
              + Conditional
            </button>
            <button
              onClick={() => addNode(NodeType.ADD_ORDER_NOTE)}
              className="px-3 py-2 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 text-sm"
            >
              + Order Note
            </button>
            <button
              onClick={() => addNode(NodeType.ADD_CUSTOMER_NOTE)}
              className="px-3 py-2 bg-pink-100 text-pink-800 rounded hover:bg-pink-200 text-sm"
            >
              + Customer Note
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
            <p>Click a node to configure it</p>
            <p className="mt-1">Press Delete/Backspace to remove selected edge</p>
          </div>
        </Panel>
      </ReactFlow>
      
      {showConfigModal && (
        <NodeConfigModal
          node={selectedNode}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedNode(null);
          }}
          onSave={handleConfigSave}
          onDelete={
            selectedNode
              ? () => {
                  handleDeleteNode(selectedNode.id);
                  setShowConfigModal(false);
                  setSelectedNode(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function getNodeLabel(type: NodeType): string {
  switch (type) {
    case NodeType.TRIGGER:
      return 'Trigger';
    case NodeType.SEND_MESSAGE:
      return 'Send Message';
    case NodeType.TIME_DELAY:
      return 'Time Delay';
    case NodeType.CONDITIONAL_SPLIT:
      return 'Conditional Split';
    case NodeType.ADD_ORDER_NOTE:
      return 'Add Order Note';
    case NodeType.ADD_CUSTOMER_NOTE:
      return 'Add Customer Note';
    case NodeType.END:
      return '🏁 End';
    default:
      return 'Node';
  }
}

