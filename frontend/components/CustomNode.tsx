'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeType } from '@/lib/types';

function CustomNode({ data }: NodeProps) {
  const { label, type, isSystemNode } = data as { label: string; type: NodeType | string; isSystemNode?: boolean };

  const isTrigger = type === NodeType.TRIGGER || type === 'TRIGGER';
  const isEnd = type === NodeType.END || type === 'END';

  const getNodeColor = (nodeType: NodeType | string) => {
    switch (nodeType) {
      case NodeType.TRIGGER:
      case 'TRIGGER':
        return 'bg-purple-500 border-purple-600';
      case NodeType.END:
      case 'END':
        return 'bg-red-500 border-red-600';
      case NodeType.SEND_MESSAGE:
        return 'bg-blue-500 border-blue-600';
      case NodeType.TIME_DELAY:
        return 'bg-yellow-500 border-yellow-600';
      case NodeType.CONDITIONAL_SPLIT:
        return 'bg-green-500 border-green-600';
      case NodeType.ADD_ORDER_NOTE:
        return 'bg-orange-500 border-orange-600';
      case NodeType.ADD_CUSTOMER_NOTE:
        return 'bg-pink-500 border-pink-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 ${getNodeColor(type)} text-white shadow-lg min-w-[150px] ${isSystemNode ? 'opacity-90' : ''}`}
    >
      {/* Trigger node has no target handle, End node has no source handle */}
      {!isTrigger && <Handle type="target" position={Position.Top} className="w-3 h-3" />}
      <div className="font-semibold text-sm">{label}</div>
      {!isEnd && <Handle type="source" position={Position.Bottom} className="w-3 h-3" />}
    </div>
  );
}

export default memo(CustomNode);

