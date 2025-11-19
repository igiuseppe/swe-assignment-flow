'use client';

import Link from 'next/link';

export default function ExecutionsIndexPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Executions</h1>
        <p className="text-gray-600 mb-6">
          Select a flow to view its executions, or view individual executions by ID
        </p>
        <Link
          href="/flows"
          className="text-blue-600 hover:underline"
        >
          ← Back to Flows
        </Link>
      </div>
    </div>
  );
}

