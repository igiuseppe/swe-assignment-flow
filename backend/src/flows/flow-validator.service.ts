import { Injectable } from '@nestjs/common';
import { Flow, FlowEdge, NodeType } from './schemas/flow.schema';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class FlowValidatorService {
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

