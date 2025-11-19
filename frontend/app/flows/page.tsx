'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { flowsApi } from '@/lib/api';
import { Flow, TriggerType } from '@/lib/types';

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowTrigger, setNewFlowTrigger] = useState<TriggerType>(TriggerType.NEW_ORDER);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const data = await flowsApi.getAll();
      setFlows(data);
    } catch (err) {
      setError('Failed to load flows');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flow?')) return;
    
    try {
      await flowsApi.delete(id);
      setFlows(flows.filter(f => f._id !== id));
    } catch (err) {
      alert('Failed to delete flow');
      console.error(err);
    }
  };

  const handleCreateNew = () => {
    setNewFlowName('');
    setNewFlowTrigger(TriggerType.NEW_ORDER);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async () => {
    if (!newFlowName.trim()) {
      alert('Please enter a flow name');
      return;
    }

    try {
      const newFlow = await flowsApi.create({
        name: newFlowName,
        triggerType: newFlowTrigger,
      });
      setShowCreateModal(false);
      window.location.href = `/flows/${newFlow._id}`;
    } catch (err) {
      alert('Failed to create flow');
      console.error(err);
    }
  };

  const handleImportFlow = async () => {
    if (!importJson.trim()) {
      alert('Please enter flow JSON');
      return;
    }

    try {
      const flowData = JSON.parse(importJson);
      const newFlow = await flowsApi.importFlow(flowData);
      setShowImportModal(false);
      setImportJson('');
      alert('Flow imported successfully!');
      window.location.href = `/flows/${newFlow._id}`;
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        alert('Invalid JSON format');
      } else {
        alert('Failed to import flow: ' + (err.response?.data?.message || err.message));
      }
      console.error(err);
    }
  };

  const handleLoadDemo = async () => {
    try {
      const demoFlow = await flowsApi.loadDemoFlow();
      alert('Demo flow loaded successfully!');
      window.location.href = `/flows/${demoFlow._id}`;
    } catch (err) {
      alert('Failed to load demo flow');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading flows...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Flows</h1>
            <p className="text-gray-600 mt-1">Manage your automation workflows</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/triggers"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Fire Triggers
            </Link>
            <button
              onClick={handleLoadDemo}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              📚 Load Demo Flow
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition"
            >
              📤 Import Flow
            </button>
            <button
              onClick={handleCreateNew}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Create New Flow
            </button>
          </div>
        </div>

        {flows.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-4">No flows yet</p>
            <button
              onClick={handleCreateNew}
              className="text-blue-600 hover:underline"
            >
              Create your first flow
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {flows.map((flow) => (
              <div
                key={flow._id}
                className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/flows/${flow._id}`}
                        className="text-xl font-semibold hover:text-blue-600"
                      >
                        {flow.name}
                      </Link>
                      {flow.isActive && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    {flow.description && (
                      <p className="text-gray-600 mt-1">{flow.description}</p>
                    )}
                    <div className="flex gap-4 mt-3 text-sm text-gray-500">
                      <span>Trigger: {flow.triggerType}</span>
                      <span>Nodes: {flow.nodes.length}</span>
                      <span>Edges: {flow.edges.length}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/flows/${flow._id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/executions/${flow._id}`}
                      className="text-purple-600 hover:underline text-sm"
                    >
                      Executions
                    </Link>
                    <button
                      onClick={() => handleDelete(flow._id!)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Flow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create New Flow</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Flow Name</label>
              <input
                type="text"
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
                placeholder="Enter flow name"
                className="w-full border border-gray-300 rounded px-3 py-2"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Trigger Type</label>
              <select
                value={newFlowTrigger}
                onChange={(e) => setNewFlowTrigger(e.target.value as TriggerType)}
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
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Flow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Flow Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Import Flow</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Flow JSON</label>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='Paste flow JSON here, e.g.:\n{\n  "name": "My Flow",\n  "triggerType": "NEW_ORDER",\n  "nodes": [...],\n  "edges": [...]\n}'
                className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm h-96"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste the exported flow JSON. The flow will be created as a new flow.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportJson('');
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImportFlow}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Import Flow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

