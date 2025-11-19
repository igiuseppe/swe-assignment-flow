'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { flowsApi } from '@/lib/api';
import { Flow, Execution } from '@/lib/types';
import FlowCanvas from '@/components/FlowCanvas';

export default function ExecutionsPage({ params }: { params: Promise<{ flowId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedFailedNodes, setSelectedFailedNodes] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [resolvedParams.flowId]);

  // Auto-open execution detail if executionId is in URL
  useEffect(() => {
    const executionId = searchParams.get('executionId');
    if (executionId && executions.length > 0 && !selectedExecution) {
      handleViewDetails(executionId);
    }
  }, [searchParams, executions]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadExecutions();
      if (selectedExecution) {
        refreshSelectedExecution();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedExecution]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [flowData, executionsData] = await Promise.all([
        flowsApi.getOne(resolvedParams.flowId),
        flowsApi.getExecutions(resolvedParams.flowId),
      ]);
      setFlow(flowData);
      setExecutions(executionsData);
    } catch (err) {
      console.error(err);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    try {
      const data = await flowsApi.getExecutions(resolvedParams.flowId);
      setExecutions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshSelectedExecution = async () => {
    if (!selectedExecution?._id) return;
    try {
      const updated = await flowsApi.getExecution(selectedExecution._id);
      setSelectedExecution(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewDetails = async (executionId: string) => {
    try {
      const execution = await flowsApi.getExecution(executionId);
      setSelectedExecution(execution);
      setShowDetailModal(true);
      setSelectedFailedNodes([]); // Reset selection when opening new execution
    } catch (err) {
      console.error(err);
      alert('Failed to load execution details');
    }
  };

  const handleRetry = async (executionId: string, nodeIds?: string[]) => {
    try {
      const updated = await flowsApi.retryExecution(executionId, nodeIds);
      setSelectedExecution(updated);
      setSelectedFailedNodes([]); // Clear selection after retry
      await loadExecutions();
      const message = nodeIds 
        ? `Execution retried successfully! (${nodeIds.length} node${nodeIds.length > 1 ? 's' : ''})`
        : 'Execution retried successfully! (all failed nodes)';
      alert(message);
    } catch (err) {
      console.error(err);
      alert('Failed to retry execution');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'delayed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNodeStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Build execution state for FlowCanvas visualization
  const buildExecutionState = (execution: Execution) => {
    const nodeStatuses: Record<string, 'pending' | 'executing' | 'completed' | 'failed' | 'skipped'> = {};
    const edgeStatuses: Record<string, 'active' | 'inactive'> = {};

    // Map execution node statuses
    execution.executedNodes.forEach((node) => {
      if (node.status === 'running') {
        nodeStatuses[node.nodeId] = 'executing';
      } else if (node.status === 'completed') {
        nodeStatuses[node.nodeId] = 'completed';
      } else if (node.status === 'failed') {
        nodeStatuses[node.nodeId] = 'failed';
      }
    });

    // Mark active edges based on branches - use actual flow edges
    if (execution.branches && flow) {
      execution.branches.forEach((branch) => {
        // Mark path as active by finding actual edges
        branch.path.forEach((pathNode, index) => {
          if (index < branch.path.length - 1) {
            const sourceNodeId = pathNode.nodeId;
            const targetNodeId = typeof branch.path[index + 1] === 'string' 
              ? branch.path[index + 1] 
              : branch.path[index + 1].nodeId;
            
            // Find the actual edge in the flow
            const edge = flow.edges.find(
              (e) => e.source === sourceNodeId && e.target === targetNodeId
            );
            
            if (edge) {
              edgeStatuses[edge.id] = 'active';
            }
          }
        });
      });
    }

    return { nodeStatuses, edgeStatuses };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading executions...</div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Flow not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push('/flows')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Flows
            </button>
            <span className="text-gray-400">|</span>
            <Link
              href={`/flows/${flow._id}`}
              className="text-blue-600 hover:underline"
            >
              {flow.name}
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Execution History</h1>
          <p className="text-gray-600 mt-1">
            Monitor and review all executions for this flow
          </p>
        </div>

        {/* Auto-refresh toggle */}
        <div className="mb-4 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">
              Auto-refresh (2s)
            </span>
          </label>
          <button
            onClick={loadExecutions}
            className="ml-4 text-sm text-blue-600 hover:underline"
          >
            ↻ Refresh now
          </button>
        </div>

        {/* Executions list */}
        {executions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No executions yet</p>
            <p className="text-sm text-gray-400">
              Execute this flow to see results here
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Execution ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nodes Executed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {executions.map((execution) => {
                  const duration = execution.updatedAt
                    ? Math.round(
                        (new Date(execution.updatedAt).getTime() -
                          new Date(execution.createdAt).getTime()) /
                          1000
                      )
                    : 0;
                  const completedNodes = execution.executedNodes.filter(
                    (n) => n.status === 'completed'
                  ).length;

                  return (
                    <tr key={execution._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {execution._id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            execution.status
                          )}`}
                        >
                          {execution.status.toUpperCase()}
                          {execution.status === 'running' && (
                            <span className="ml-1 animate-pulse">●</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(execution.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {duration > 0 ? `${duration}s` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {completedNodes} / {execution.executedNodes.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleViewDetails(execution._id)}
                          className="text-blue-600 hover:underline mr-3"
                        >
                          View Details
                        </button>
                        {execution.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(execution._id)}
                            className="text-orange-600 hover:underline"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Execution Detail Modal */}
      {showDetailModal && selectedExecution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">Execution Details</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">
                  ID: {selectedExecution._id}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {(selectedExecution.status === 'running' || selectedExecution.status === 'delayed') && (
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="animate-pulse text-blue-600">●</span>
                    Auto-refreshing...
                  </span>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Flow Visualization */}
            {flow && (
              <div className="mb-6 bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold mb-3 text-gray-700">Execution Flow Visualization</h3>
                <div className="h-[500px] bg-white rounded border border-gray-300">
                  <FlowCanvas
                    initialNodes={flow.nodes}
                    initialEdges={flow.edges}
                    onNodesChange={() => {}}
                    onEdgesChange={() => {}}
                    triggerType={flow.triggerType}
                    executionState={buildExecutionState(selectedExecution)}
                    readOnly={true}
                  />
                </div>
              </div>
            )}

            {/* Status Overview */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-600">Status</span>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        selectedExecution.status
                      )}`}
                    >
                      {selectedExecution.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Started</span>
                  <div className="mt-1 text-gray-900">
                    {new Date(selectedExecution.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Updated</span>
                  <div className="mt-1 text-gray-900">
                    {new Date(selectedExecution.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Duration</span>
                  <div className="mt-1 text-gray-900">
                    {Math.round(
                      (new Date(selectedExecution.updatedAt).getTime() -
                        new Date(selectedExecution.createdAt).getTime()) /
                        1000
                    )}s
                  </div>
                </div>
              </div>

              {selectedExecution.resumeAt && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="font-semibold text-gray-600">Resume At: </span>
                  <span className="text-yellow-600">
                    {new Date(selectedExecution.resumeAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Error Details */}
            {selectedExecution.errorDetails && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold mb-2 text-red-800">Error Summary</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-red-700">Last Error:</span>
                    <span className="ml-2 text-red-900">{selectedExecution.errorDetails.lastError}</span>
                  </div>
                  <div>
                    <span className="font-medium text-red-700">Failed Branches:</span>
                    <span className="ml-2 text-red-900">
                      {selectedExecution.errorDetails.failedBranches.join(', ') || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-red-700">Failed Nodes:</span>
                    <span className="ml-2 text-red-900">
                      {selectedExecution.errorDetails.failedNodes.length} node(s)
                    </span>
                  </div>
                  <div className="text-xs text-red-600">
                    {new Date(selectedExecution.errorDetails.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Trigger Data */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-gray-700">Trigger Data</h3>
              <div className="bg-gray-50 rounded p-3">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(selectedExecution.triggerData, null, 2)}
                </pre>
              </div>
            </div>

            {/* Branches */}
            {selectedExecution.branches && selectedExecution.branches.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-gray-700">Execution Branches</h3>
                <div className="space-y-2">
                  {selectedExecution.branches.map((branch, idx) => (
                    <div key={idx} className="bg-blue-50 rounded p-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">
                          Branch: {branch.branchId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${getStatusColor(
                            branch.status
                          )}`}
                        >
                          {branch.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        Current Node: {branch.currentNodeId}
                      </div>
                      {branch.path.length > 0 && (
                        <div className="mt-1 text-xs text-gray-600">
                          Path: {branch.path.map(p => {
                            // Handle both old format (string) and new format (object)
                            if (typeof p === 'string') {
                              return p;
                            }
                            return `${p.nodeId} (${p.nodeType})`;
                          }).join(' → ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Executed Nodes */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-700">
                Executed Nodes ({selectedExecution.executedNodes.length})
              </h3>
              <div className="space-y-3">
                {selectedExecution.executedNodes.map((node, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${getNodeStatusColor(
                      node.status
                    )}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-3">
                        {node.status === 'failed' && selectedExecution.status === 'failed' && (
                          <input
                            type="checkbox"
                            checked={selectedFailedNodes.includes(node.nodeId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFailedNodes([...selectedFailedNodes, node.nodeId]);
                              } else {
                                setSelectedFailedNodes(selectedFailedNodes.filter(id => id !== node.nodeId));
                              }
                            }}
                            className="mt-1 w-4 h-4 cursor-pointer"
                            title="Select for retry"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {node.nodeType}
                            {node.retryCount > 0 && (
                              <span className="ml-2 text-xs text-orange-600 font-normal">
                                (Retried {node.retryCount}x)
                              </span>
                            )}
                            {node.arrivalCount > 0 && node.nodeType === 'END' && (
                              <span className="ml-2 text-xs text-blue-600 font-normal">
                                (Arrivals: {node.arrivalCount})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            ID: {node.nodeId}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                            node.status
                          )}`}
                        >
                          {node.status}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(node.startTime).toLocaleTimeString()}
                          {node.endTime &&
                            ` - ${new Date(node.endTime).toLocaleTimeString()}`}
                        </div>
                      </div>
                    </div>

                    {node.error && (
                      <div className="mb-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                        <span className="font-semibold">Error:</span> {node.error}
                      </div>
                    )}

                    {node.result && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                          View result
                        </summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                          {JSON.stringify(node.result, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              {selectedExecution.status === 'failed' && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Select specific failed nodes above to retry them individually, or retry all failed nodes at once:
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => handleRetry(selectedExecution._id)}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
                    >
                      🔄 Retry All Failed Nodes
                    </button>
                    {selectedFailedNodes.length > 0 && (
                      <button
                        onClick={() => handleRetry(selectedExecution._id, selectedFailedNodes)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        🔄 Retry Selected ({selectedFailedNodes.length})
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

