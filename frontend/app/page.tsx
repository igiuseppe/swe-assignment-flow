import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">WhatsApp Flow Builder</h1>
        <p className="text-gray-600 mb-8">
          Create and manage marketing automation workflows
        </p>
        <Link
          href="/flows"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Go to Flows
        </Link>
      </div>
    </div>
  );
}

