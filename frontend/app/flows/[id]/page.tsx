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
    </div>
  );
}

