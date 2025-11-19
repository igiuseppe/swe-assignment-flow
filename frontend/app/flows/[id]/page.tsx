'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { flowsApi } from '@/lib/api';
import { Flow, FlowNode, FlowEdge, TriggerType } from '@/lib/types';
import FlowCanvas from '@/components/FlowCanvas';

export default function FlowBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadFlow();
  }, [resolvedParams.id]);

  const loadFlow = async () => {
    try {
      setLoading(true);
      const data = await flowsApi.getOne(resolvedParams.id);
      setFlow(data);
    } catch (err) {
      alert('Failed to load flow');
      console.error(err);
      router.push('/flows');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!flow) return;

    try {
      setSaving(true);
      console.log('[FlowBuilder] Validating before saving flow with nodes:', localNodes, 'edges:', localEdges);
      
      // First validate with current data (without saving)
      const result = await flowsApi.validateData({
        triggerType: flow.triggerType,
        nodes: localNodes,
        edges: localEdges,
      });
      
      if (!result.valid) {
        console.log('[FlowBuilder] Validation failed:', result.errors);
        setValidationErrors(result.errors);
        alert('Cannot save: flow has validation errors. Check below.');
        return;
      }
      
      // Validation passed, now save
      console.log('[FlowBuilder] Validation passed, saving flow');
      const updatedFlow = await flowsApi.update(flow._id!, {
        name: flow.name,
        description: flow.description,
        triggerType: flow.triggerType,
        nodes: localNodes,
        edges: localEdges,
      });
      
      console.log('[FlowBuilder] Flow saved successfully');
      setFlow(updatedFlow);
      setValidationErrors([]);
      setHasUnsavedChanges(false);
      alert('Flow saved successfully!');
    } catch (err) {
      alert('Failed to save flow');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!flow?._id) return;

    try {
      const updatedFlow = await flowsApi.activate(flow._id);
      setFlow(updatedFlow);
      setValidationErrors([]);
      alert('Flow activated!');
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        setValidationErrors(errorData.errors);
        alert('Cannot activate flow: validation errors found. Check below.');
      } else {
        alert(errorData?.message || 'Failed to activate flow');
      }
      console.error(err);
    }
  };

  const handleDeactivate = async () => {
    if (!flow?._id) return;

    try {
      const updatedFlow = await flowsApi.deactivate(flow._id);
      setFlow(updatedFlow);
      alert('Flow deactivated');
    } catch (err) {
      alert('Failed to deactivate flow');
      console.error(err);
    }
  };

  const [localNodes, setLocalNodes] = useState<FlowNode[]>([]);
  const [localEdges, setLocalEdges] = useState<FlowEdge[]>([]);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<TriggerType | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (flow) {
      console.log('[FlowBuilder] Flow loaded/updated, setting local state:', { nodes: flow.nodes, edges: flow.edges });
      setLocalNodes(flow.nodes);
      setLocalEdges(flow.edges);
      setHasUnsavedChanges(false);
    }
  }, [flow?.nodes, flow?.edges]);

  const handleEditTrigger = () => {
    if (flow) {
      setEditingTrigger(flow.triggerType);
      setShowTriggerModal(true);
    }
  };

  const handleSaveTrigger = () => {
    if (flow && editingTrigger) {
      setFlow({ ...flow, triggerType: editingTrigger });
      setHasUnsavedChanges(true);
      setShowTriggerModal(false);
    }
  };

  const handleNodesChange = useCallback((nodes: FlowNode[]) => {
    console.log('[FlowBuilder] Received nodes from FlowCanvas:', nodes);
    setLocalNodes(nodes);
    setHasUnsavedChanges(true);
  }, []);

  const handleEdgesChange = useCallback((edges: FlowEdge[]) => {
    console.log('[FlowBuilder] Received edges from FlowCanvas:', edges);
    setLocalEdges(edges);
    setHasUnsavedChanges(true);
  }, []);

  const handleTestFlow = async () => {
    if (!flow?._id) return;

    // Sample trigger data based on trigger type
    const sampleData: Record<string, any> = {
      order_id: 'ORD-12345',
      customer_id: 'CUST-67890',
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      order_total: 99.99,
      order_status: 'pending',
      order_items: ['Product A', 'Product B'],
    };

    try {
      setExecuting(true);
      const result = await flowsApi.execute(flow._id, sampleData);
      setExecutionResult(result);
      setShowExecutionModal(true);
    } catch (err) {
      alert('Failed to execute flow');
      console.error(err);
    } finally {
      setExecuting(false);
    }
  };

  const handleRetryExecution = async () => {
    if (!executionResult?._id) return;

    try {
      setRetrying(true);
      const result = await flowsApi.retryExecution(executionResult._id);
      setExecutionResult(result);
      alert('Execution retried successfully!');
    } catch (err) {
      alert('Failed to retry execution');
      console.error(err);
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading flow...</div>
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/flows')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <div>
              <input
                type="text"
                value={flow.name}
                onChange={(e) => {
                  setFlow({ ...flow, name: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                className="text-xl font-bold border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
              />
              {flow.isActive && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  Active
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEditTrigger}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="text-gray-600">Trigger:</span>
              <span className="font-medium">{flow.triggerType.replace(/_/g, ' ')}</span>
              <span className="text-gray-400">✏️</span>
            </button>
            <button
              onClick={handleTestFlow}
              disabled={executing || hasUnsavedChanges}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={hasUnsavedChanges ? 'Save your changes before testing' : 'Test flow execution'}
            >
              {executing ? '⚙️ Running...' : '▶️ Test Flow'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {flow.isActive ? (
              <button
                onClick={handleDeactivate}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Deactivate
              </button>
            ) : (
              <button
                onClick={handleActivate}
                disabled={hasUnsavedChanges}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={hasUnsavedChanges ? 'Save your changes before activating' : ''}
              >
                Activate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 p-4">
          <div className="max-w-screen-2xl mx-auto">
            <h3 className="font-semibold text-red-800 mb-2">Validation Errors:</h3>
            <ul className="list-disc list-inside text-red-700 text-sm">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1">
        <FlowCanvas
          initialNodes={localNodes}
          initialEdges={localEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          triggerType={flow.triggerType}
        />
      </div>

      {/* Stats Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-screen-2xl mx-auto flex gap-6 text-sm text-gray-600">
          <span>Nodes: {localNodes.length}</span>
          <span>Edges: {localEdges.length}</span>
          <span>Version: {flow.version}</span>
        </div>
      </div>

      {/* Trigger Edit Modal */}
      {showTriggerModal && editingTrigger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Edit Trigger</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Trigger Type</label>
              <select
                value={editingTrigger}
                onChange={(e) => setEditingTrigger(e.target.value as TriggerType)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value={TriggerType.NEW_ORDER}>New Order</option>
                <option value={TriggerType.ABANDONED_CHECKOUT}>Abandoned Checkout</option>
                <option value={TriggerType.CUSTOMER_REGISTRATION}>Customer Registration</option>
                <option value={TriggerType.ORDER_STATUS_CHANGE}>Order Status Change</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowTriggerModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTrigger}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Result Modal */}
      {showExecutionModal && executionResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Flow Execution Results</h2>
              <button
                onClick={() => setShowExecutionModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Execution ID:</span> {executionResult._id}
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  <span className={executionResult.status === 'completed' ? 'text-green-600' : executionResult.status === 'failed' ? 'text-red-600' : executionResult.status === 'delayed' ? 'text-yellow-600' : 'text-blue-600'}>
                    {executionResult.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Start Time:</span>{' '}
                  {new Date(executionResult.createdAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">Updated:</span>{' '}
                  {new Date(executionResult.updatedAt).toLocaleString()}
                </div>
                {executionResult.resumeAt && (
                  <div className="col-span-2">
                    <span className="font-semibold">Resume At:</span>{' '}
                    <span className="text-yellow-600">
                      {new Date(executionResult.resumeAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {executionResult.branches && executionResult.branches.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Branches</h3>
                <div className="space-y-1">
                  {executionResult.branches.map((branch: any, idx: number) => (
                    <div key={idx} className="text-sm p-2 bg-blue-50 rounded">
                      <span className="font-medium">{branch.branchId}:</span>{' '}
                      <span className={branch.status === 'completed' ? 'text-green-600' : 'text-blue-600'}>
                        {branch.status}
                      </span>
                      {' @ '}{branch.currentNodeId}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Executed Nodes</h3>
              <div className="space-y-2">
                {executionResult.executedNodes && executionResult.executedNodes.map((node: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border ${
                      node.status === 'completed'
                        ? 'bg-green-50 border-green-200'
                        : node.status === 'failed'
                        ? 'bg-red-50 border-red-200'
                        : node.status === 'running'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm">
                        {node.nodeType} ({node.nodeId})
                        {node.retryCount > 0 && (
                          <span className="ml-2 text-xs text-orange-600">
                            Retries: {node.retryCount}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(node.startTime).toLocaleTimeString()}
                        {node.endTime && ` - ${new Date(node.endTime).toLocaleTimeString()}`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      Status: <span className={node.status === 'completed' ? 'text-green-600' : node.status === 'failed' ? 'text-red-600' : 'text-blue-600'}>{node.status}</span>
                    </div>
                    {node.error && (
                      <div className="text-xs text-red-600 mb-1">
                        Error: {node.error}
                      </div>
                    )}
                    {node.result && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer">Show result</summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                          {JSON.stringify(node.result, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <div>
                {executionResult.status === 'failed' && (
                  <button
                    onClick={handleRetryExecution}
                    disabled={retrying}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    {retrying ? '🔄 Retrying...' : '🔄 Retry Failed Execution'}
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowExecutionModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

