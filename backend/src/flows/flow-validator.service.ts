import { Injectable } from '@nestjs/common';
import { Flow, FlowEdge, FlowNode, NodeType } from './schemas/flow.schema';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface NodeConfigValidator {
  validate: (node: FlowNode) => string[];
}

@Injectable()
export class FlowValidatorService {
  private readonly nodeValidators: Record<NodeType, NodeConfigValidator> = {
    [NodeType.TRIGGER]: {
      validate: () => [],
    },
    [NodeType.END]: {
      validate: () => [],
    },
    [NodeType.SEND_MESSAGE]: {
      validate: (node) => {
        const errors: string[] = [];
        const { message, variables } = node.config || {};
        
        if (!message || typeof message !== 'string' || message.trim() === '') {
          errors.push(`Node ${node.id} (SEND_MESSAGE): message is required and must be a non-empty string`);
        } else {
          // Validate variable placeholders
          const placeholders = message.match(/\{[^}]+\}/g) || [];
          const declaredVars = (variables || '').split(',').map((v: string) => v.trim()).filter(Boolean);
          
          // Check if all placeholders are declared (optional warning-level validation)
          placeholders.forEach((placeholder) => {
            const varName = placeholder.slice(1, -1).trim();
            if (!declaredVars.includes(`{${varName}}`)) {
              // This is informational; could be converted to warning in production
            }
          });
        }
        
        return errors;
      },
    },
    [NodeType.TIME_DELAY]: {
      validate: (node) => {
        const errors: string[] = [];
        const { duration, unit } = node.config || {};
        
        if (duration === undefined || duration === null) {
          errors.push(`Node ${node.id} (TIME_DELAY): duration is required`);
        } else if (typeof duration !== 'number' || duration < 0) {
          errors.push(`Node ${node.id} (TIME_DELAY): duration must be a non-negative number`);
        } else if (duration === 0) {
          errors.push(`Node ${node.id} (TIME_DELAY): duration must be greater than 0`);
        }
        
        const validUnits = ['seconds', 'minutes', 'hours', 'days'];
        if (!unit || !validUnits.includes(unit)) {
          errors.push(`Node ${node.id} (TIME_DELAY): unit must be one of: ${validUnits.join(', ')}`);
        }
        
        return errors;
      },
    },
    [NodeType.CONDITIONAL_SPLIT]: {
      validate: (node) => {
        const errors: string[] = [];
        const config = node.config || {};
        const validOperators = ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'contains'];
        const validLogicOps = ['AND', 'OR'];
        
        // New format: condition groups with nested AND/OR logic
        if (config.conditionGroups && Array.isArray(config.conditionGroups)) {
          // Validate groups logic operator
          if (!config.groupsLogic || !validLogicOps.includes(config.groupsLogic)) {
            errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): groupsLogic must be one of: ${validLogicOps.join(', ')}`);
          }
          
          // Must have at least one group
          if (config.conditionGroups.length === 0) {
            errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): must have at least one condition group`);
          }
          
          // Validate each group
          config.conditionGroups.forEach((group: any, groupIndex: number) => {
            if (!group.conditions || !Array.isArray(group.conditions) || group.conditions.length === 0) {
              errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): group ${groupIndex + 1} - must have at least one condition`);
              return;
            }
            
            // Validate group logic
            if (!group.groupLogic || !validLogicOps.includes(group.groupLogic)) {
              errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): group ${groupIndex + 1} - groupLogic must be one of: ${validLogicOps.join(', ')}`);
            }
            
            // Validate each condition within the group
            group.conditions.forEach((condition: any, condIndex: number) => {
              if (!condition.field || typeof condition.field !== 'string' || condition.field.trim() === '') {
                errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): group ${groupIndex + 1}, condition ${condIndex + 1} - field is required`);
              }
              
              if (!condition.operator || typeof condition.operator !== 'string' || !validOperators.includes(condition.operator.trim())) {
                errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): group ${groupIndex + 1}, condition ${condIndex + 1} - operator must be one of: ${validOperators.join(', ')}`);
              }
              
              if (condition.value === undefined || condition.value === null || (typeof condition.value === 'string' && condition.value.trim() === '')) {
                errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): group ${groupIndex + 1}, condition ${condIndex + 1} - value is required`);
              }
            });
          });
        }
        // Old format: simple conditions array with single logic operator
        else if (config.conditions && Array.isArray(config.conditions)) {
          // Validate logic operator
          if (!config.logicOperator || !validLogicOps.includes(config.logicOperator)) {
            errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): logicOperator must be one of: ${validLogicOps.join(', ')}`);
          }
          
          // Must have at least one condition
          if (config.conditions.length === 0) {
            errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): must have at least one condition`);
          }
          
          // Validate each condition
          config.conditions.forEach((condition: any, index: number) => {
            if (!condition.field || typeof condition.field !== 'string' || condition.field.trim() === '') {
              errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): condition ${index + 1} - field is required`);
            }
            
            if (!condition.operator || typeof condition.operator !== 'string' || !validOperators.includes(condition.operator.trim())) {
              errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): condition ${index + 1} - operator must be one of: ${validOperators.join(', ')}`);
            }
            
            if (condition.value === undefined || condition.value === null || (typeof condition.value === 'string' && condition.value.trim() === '')) {
              errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): condition ${index + 1} - value is required`);
            }
          });
        } 
        // Legacy format: single condition (backward compatibility)
        else if (config.field || config.operator || config.value) {
          if (!config.field || typeof config.field !== 'string' || config.field.trim() === '') {
            errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): field is required`);
          }
          
          if (!config.operator || typeof config.operator !== 'string' || !validOperators.includes(config.operator.trim())) {
            errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): operator must be one of: ${validOperators.join(', ')}`);
          }
          
          if (config.value === undefined || config.value === null || (typeof config.value === 'string' && config.value.trim() === '')) {
            errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): value is required`);
          }
        } 
        // No configuration at all
        else {
          errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): must have conditions configured`);
        }
        
        return errors;
      },
    },
    [NodeType.ADD_ORDER_NOTE]: {
      validate: (node) => {
        const errors: string[] = [];
        const { note } = node.config || {};
        
        if (!note || typeof note !== 'string' || note.trim() === '') {
          errors.push(`Node ${node.id} (ADD_ORDER_NOTE): note is required and must be a non-empty string`);
        }
        
        return errors;
      },
    },
    [NodeType.ADD_CUSTOMER_NOTE]: {
      validate: (node) => {
        const errors: string[] = [];
        const { note } = node.config || {};
        
        if (!note || typeof note !== 'string' || note.trim() === '') {
          errors.push(`Node ${node.id} (ADD_CUSTOMER_NOTE): note is required and must be a non-empty string`);
        }
        
        return errors;
      },
    },
  };

  validate(flow: Flow): ValidationResult {
    const errors: string[] = [];

    // 1. Check that trigger type is set
    if (!flow.triggerType) {
      errors.push('Flow must have a trigger type');
    }

    // 2. Check for required system nodes (TRIGGER and END)
    const triggerNodes = flow.nodes.filter((n) => n.type === NodeType.TRIGGER);
    const endNodes = flow.nodes.filter((n) => n.type === NodeType.END);

    if (triggerNodes.length === 0) {
      errors.push('Flow must have exactly one TRIGGER node');
    } else if (triggerNodes.length > 1) {
      errors.push('Flow can only have one TRIGGER node');
    }

    if (endNodes.length === 0) {
      errors.push('Flow must have exactly one END node');
    } else if (endNodes.length > 1) {
      errors.push('Flow can only have one END node');
    }

    // 2.5. Validate node configurations
    flow.nodes.forEach((node) => {
      const validator = this.nodeValidators[node.type];
      if (validator) {
        const nodeErrors = validator.validate(node);
        errors.push(...nodeErrors);
      }
    });

    // 2.6. Validate conditional split nodes have at least one output path
    const conditionalNodes = flow.nodes.filter((n) => n.type === NodeType.CONDITIONAL_SPLIT);
    conditionalNodes.forEach((node) => {
      const outgoingEdges = flow.edges.filter((e) => e.source === node.id);
      console.log(`[Validator] Checking conditional split node ${node.id}`);
      console.log(`[Validator] Outgoing edges:`, outgoingEdges);
      const hasTruePath = outgoingEdges.some((e) => e.sourceHandle === 'true');
      const hasFalsePath = outgoingEdges.some((e) => e.sourceHandle === 'false');
      console.log(`[Validator] Has true path: ${hasTruePath}, Has false path: ${hasFalsePath}`);
      
      if (!hasTruePath && !hasFalsePath) {
        errors.push(`Node ${node.id} (CONDITIONAL_SPLIT): must have at least one output path (true or false)`);
      }
    });

    // 3. Check for dangling edges (edges referencing non-existent nodes)
    const nodeIds = new Set(flow.nodes.map((n) => n.id));
    flow.edges.forEach((edge) => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
      }
    });

    // If dangling edges exist, can't continue validation
    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // 4. TRIGGER node should not have incoming edges
    if (triggerNodes.length > 0) {
      const triggerNode = triggerNodes[0];
      const incomingToTrigger = flow.edges.filter((e) => e.target === triggerNode.id);
      if (incomingToTrigger.length > 0) {
        errors.push('TRIGGER node cannot have incoming edges');
      }
    }

    // 5. END nodes should not have outgoing edges
    endNodes.forEach((endNode) => {
      const outgoingFromEnd = flow.edges.filter((e) => e.source === endNode.id);
      if (outgoingFromEnd.length > 0) {
        errors.push(`END node ${endNode.id} cannot have outgoing edges`);
      }
    });

    // 6. Check all nodes are reachable from TRIGGER
    if (triggerNodes.length > 0 && flow.nodes.length > 1) {
      const triggerNode = triggerNodes[0];
      console.log('[Validator] Trigger node ID:', triggerNode.id);
      console.log('[Validator] All node IDs:', flow.nodes.map(n => n.id));
      console.log('[Validator] Edges:', flow.edges);
      
      const reachable = this.getReachableNodes(triggerNode.id, flow.edges);
      console.log('[Validator] Reachable nodes:', Array.from(reachable));
      
      const unreachableNodes = flow.nodes.filter(
        (n) => !reachable.has(n.id)
      );
      
      if (unreachableNodes.length > 0) {
        errors.push(
          `Unreachable nodes from TRIGGER: ${unreachableNodes.map((n) => n.id).join(', ')}`,
        );
      }

      // 7. Check for cycles
      if (this.hasCycles(triggerNode.id, flow.edges)) {
        errors.push('Flow contains cycles (infinite loops detected)');
      }
    }

    // 8. Check that END node is reachable from all leaf nodes (nodes with no outgoing edges except END itself)
    if (endNodes.length > 0 && flow.nodes.length > 2) {
      const endNode = endNodes[0];
      
      // Find all leaf nodes (nodes with no outgoing edges, excluding END itself)
      const leafNodes = flow.nodes.filter((node) => {
        if (node.type === NodeType.END || node.type === NodeType.TRIGGER) {
          return false;
        }
        const hasOutgoing = flow.edges.some((edge) => edge.source === node.id);
        return !hasOutgoing;
      });

      // Each leaf node should have a path to END
      leafNodes.forEach((leafNode) => {
        errors.push(
          `Node ${leafNode.id} has no outgoing edges. All flow paths must end at the END node.`,
        );
      });

      // Check that END node has at least one incoming edge (if there are action nodes)
      const hasActionNodes = flow.nodes.some(
        (n) => n.type !== NodeType.TRIGGER && n.type !== NodeType.END
      );
      
      if (hasActionNodes) {
        const incomingToEnd = flow.edges.filter((e) => e.target === endNode.id);
        if (incomingToEnd.length === 0) {
          errors.push('END node must have at least one incoming edge (flow must reach the end)');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getReachableNodes(startNodeId: string, edges: FlowEdge[]): Set<string> {
    const reachable = new Set<string>([startNodeId]);
    const queue = [startNodeId];

    while (queue.length > 0) {
      const current = queue.shift();
      const outgoing = edges.filter((e) => e.source === current);

      outgoing.forEach((edge) => {
        if (!reachable.has(edge.target)) {
          reachable.add(edge.target);
          queue.push(edge.target);
        }
      });
    }

    return reachable;
  }

  private hasCycles(startNodeId: string, edges: FlowEdge[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoing) {
        const target = edge.target;

        if (!visited.has(target)) {
          if (dfs(target)) {
            return true;
          }
        } else if (recursionStack.has(target)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    return dfs(startNodeId);
  }
}

