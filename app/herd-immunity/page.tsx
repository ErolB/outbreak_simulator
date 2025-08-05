'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HerdImmunity() {
  const [r0Value, setR0Value] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`http://localhost:5000/herd_immunity?R0=${encodeURIComponent(r0Value)}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (err) {
      setError('Failed to connect to the API. Make sure the Flask server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-center p-8">
      <main className="w-full max-w-md">
        <div className="mb-8">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-center mb-8">
          Calculate Herd Immunity Threshold
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="r0" className="block text-sm font-medium text-gray-700 mb-2">
              Basic Reproduction Number (R0):
            </label>
            <input
              type="number"
              id="r0"
              value={r0Value}
              onChange={(e) => setR0Value(e.target.value)}
              step="0.1"
              min="0.1"
              placeholder="Enter R0 value (e.g., 2.5)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              R0 represents how many people one infected person will infect on average
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Calculating...' : 'Calculate Threshold'}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mt-6 p-6 bg-green-100 border border-green-400 rounded-lg">
            <h2 className="text-lg font-semibold text-green-800 mb-3">Results:</h2>
            <div className="space-y-2 text-green-700">
              <p><strong>R0:</strong> {result.R0}</p>
              <p><strong>Herd Immunity Threshold:</strong> {(result.herd_immunity_threshold * 100).toFixed(1)}%</p>
              <p className="text-sm text-green-600 mt-3">
                This means approximately {(result.herd_immunity_threshold * 100).toFixed(1)}% of the population needs to be immune 
                (through vaccination or previous infection) to achieve herd immunity.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}