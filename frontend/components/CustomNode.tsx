'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeType } from '@/lib/types';

function CustomNode({ data }: NodeProps) {
  const { label, type, isSystemNode, config } = data as { 
    label: string; 
    type: NodeType | string; 
    isSystemNode?: boolean;
    config?: Record<string, any>;
  };

  const isTrigger = type === NodeType.TRIGGER || type === 'TRIGGER';
  const isEnd = type === NodeType.END || type === 'END';
  const isConditional = type === NodeType.CONDITIONAL_SPLIT;
  const isTimeDelay = type === NodeType.TIME_DELAY;

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

  const renderTimeDelayInfo = () => {
    if (!isTimeDelay || !config) return null;
    const duration = config.duration || 0;
    const unit = config.unit || 'minutes';
    return (
      <div className="text-xs mt-1 opacity-90">
        ⏱️ {duration} {unit}
      </div>
    );
  };

  const renderConditionalInfo = () => {
    if (!isConditional || !config) return null;
    
    // New format with condition groups
    if (config.conditionGroups && Array.isArray(config.conditionGroups)) {
      const groupCount = config.conditionGroups.length;
      const totalConds = config.conditionGroups.reduce((sum: number, g: any) => sum + (g.conditions?.length || 0), 0);
      const groupsLogic = config.groupsLogic || 'AND';
      return (
        <div className="text-xs mt-1 opacity-90">
          {groupCount} group{groupCount !== 1 ? 's' : ''} ({groupsLogic}) • {totalConds} cond
        </div>
      );
    }
    
    // Old format with simple conditions array
    if (config.conditions && Array.isArray(config.conditions)) {
      const logicOp = config.logicOperator || 'AND';
      const condCount = config.conditions.length;
      return (
        <div className="text-xs mt-1 opacity-90">
          {condCount} condition{condCount !== 1 ? 's' : ''} ({logicOp})
        </div>
      );
    }
    
    // Legacy format (backward compatibility)
    const field = config.field || 'field';
    const operator = config.operator || 'equals';
    const value = config.value || 'value';
    return (
      <div className="text-xs mt-1 opacity-90">
        {field} {operator} {value}
      </div>
    );
  };

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 ${getNodeColor(type)} text-white shadow-lg min-w-[150px] ${isSystemNode ? 'opacity-90' : ''} ${isConditional ? 'relative' : ''}`}
    >
      {/* Trigger node has no target handle, End node has no source handle */}
      {!isTrigger && <Handle type="target" position={Position.Top} className="w-3 h-3" />}
      
      <div className="font-semibold text-sm">{label}</div>
      
      {/* Show time delay info */}
      {renderTimeDelayInfo()}
      
      {/* Show conditional info */}
      {renderConditionalInfo()}
      
      {/* Conditional split has two output handles (true/false) */}
      {isConditional ? (
        <>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="true"
            className="w-3 h-3"
            style={{ left: '33%' }}
          />
          <div className="absolute bottom-[-20px] left-[calc(33%-15px)] text-xs bg-green-600 px-1 rounded">
            ✓
          </div>
          
          <Handle 
            type="source" 
            position={Position.Bottom}
            id="false"
            className="w-3 h-3"
            style={{ left: '67%' }}
          />
          <div className="absolute bottom-[-20px] left-[calc(67%-15px)] text-xs bg-red-600 px-1 rounded">
            ✗
          </div>
        </>
      ) : (
        !isEnd && <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      )}
    </div>
  );
}

export default memo(CustomNode);

