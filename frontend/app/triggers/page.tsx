'use client';

import { useState } from 'react';
import { flowsApi } from '@/lib/api';
import { TriggerType } from '@/lib/types';
import Link from 'next/link';

export default function TriggersPage() {
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>(TriggerType.NEW_ORDER);
  const [payload, setPayload] = useState('{\n  "orderId": "12345",\n  "customerId": "67890",\n  "amount": 100.50\n}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    flowsTriggered: number;
    executions: { executionId: string; flowId: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerOptions = [
    { value: TriggerType.NEW_ORDER, label: 'New Order' },
    { value: TriggerType.ABANDONED_CHECKOUT, label: 'Abandoned Checkout' },
    { value: TriggerType.CUSTOMER_REGISTRATION, label: 'Customer Registration' },
    { value: TriggerType.ORDER_STATUS_CHANGE, label: 'Order Status Change' },
  ];

  const samplePayloads: Record<TriggerType, string> = {
    [TriggerType.NEW_ORDER]: '{\n  "orderId": "12345",\n  "customerId": "67890",\n  "amount": 100.50,\n  "items": ["item1", "item2"]\n}',
    [TriggerType.ABANDONED_CHECKOUT]: '{\n  "checkoutId": "abc123",\n  "customerId": "67890",\n  "cartValue": 75.00\n}',
    [TriggerType.CUSTOMER_REGISTRATION]: '{\n  "customerId": "67890",\n  "email": "customer@example.com",\n  "name": "John Doe"\n}',
    [TriggerType.ORDER_STATUS_CHANGE]: '{\n  "orderId": "12345",\n  "oldStatus": "pending",\n  "newStatus": "shipped"\n}',
  };

  const handleTriggerChange = (trigger: TriggerType) => {
    setSelectedTrigger(trigger);
    setPayload(samplePayloads[trigger]);
    setResult(null);
    setError(null);
  };

  const handleFireTrigger = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsedPayload = JSON.parse(payload);
      const response = await flowsApi.fireTrigger(selectedTrigger, parsedPayload);
      setResult(response);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON payload');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to fire trigger');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Fire Triggers</h1>
          <Link
            href="/flows"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Flows
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger Type
            </label>
            <select
              value={selectedTrigger}
              onChange={(e) => handleTriggerChange(e.target.value as TriggerType)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {triggerOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payload (JSON)
            </label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={10}
              className="w-full border border-gray-300 rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter JSON payload..."
            />
          </div>

          <button
            onClick={handleFireTrigger}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Firing Trigger...' : 'Fire Trigger'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-green-800 font-medium">{result.message}</p>
                <p className="text-green-700 text-sm mt-1">
                  Flows triggered: {result.flowsTriggered}
                </p>
              </div>

              {result.executions && result.executions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Executions Created:</p>
                  <div className="space-y-1">
                    {result.executions.map((exec) => (
                      <div key={exec.executionId} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                        <code className="text-gray-600">{exec.executionId.slice(-8)}</code>
                        <Link
                          href={`/executions/${exec.flowId}?executionId=${exec.executionId}`}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          View →
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium text-sm">ℹ️ How it works</p>
          <p className="text-blue-700 text-sm mt-2">
            When you fire a trigger, all <strong>active flows</strong> with the selected trigger type will execute in parallel.
            Each execution will receive the payload data you provide.
          </p>
        </div>
      </div>
    </div>
  );
}

