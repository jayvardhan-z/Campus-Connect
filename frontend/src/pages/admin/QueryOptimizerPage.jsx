import React, { useState } from 'react';
import api from '../../api';

export default function QueryOptimizerPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const runAnalysis = async (queryName) => {
    setLoading(true);
    setResults(null);
    setError('');
    try {
      const response = await api.get('/admin/explain', { params: { query: queryName } });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error executing dynamic explain plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Block */}
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-400">PostgreSQL Query Optimizer Lab</h1>
          <p className="text-slate-400 mt-1">Analyze query execution plans with and without indexes dynamically using transaction rollbacks.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-2">Target Index Scenarios</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              disabled={loading} 
              onClick={() => runAnalysis('upcoming_events')}
              className="bg-slate-950 border border-slate-850 hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-50 px-6 py-4 rounded-xl font-bold text-sm transition-all shadow-md text-slate-200"
            >
              Analyze Upcoming Events View
            </button>
            <button 
              disabled={loading} 
              onClick={() => runAnalysis('my_registrations')}
              className="bg-slate-950 border border-slate-850 hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-50 px-6 py-4 rounded-xl font-bold text-sm transition-all shadow-md text-slate-200"
            >
              Analyze My Registrations View
            </button>
            <button 
              disabled={loading} 
              onClick={() => runAnalysis('event_lookup_by_email')}
              className="bg-slate-950 border border-slate-850 hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-50 px-6 py-4 rounded-xl font-bold text-sm transition-all shadow-md text-slate-200"
            >
              Analyze Email Lookup Query
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-6">
            <p className="text-indigo-400 animate-pulse font-semibold">Running EXPLAIN ANALYZE on PostgreSQL...</p>
          </div>
        )}

        {results && (
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-slate-150 mb-2">Analysis Results</h2>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 overflow-x-auto">
                <code className="text-sm text-indigo-400 font-mono">{results.sql}</code>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Without Index */}
              <div className="bg-slate-950 border border-slate-850 p-6 rounded-xl space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-400">Without Index</h3>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Scan Node Type</p>
                  <p className="font-extrabold text-slate-200">{results.withoutIndex.planSummary}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Execution Latency</p>
                  <p className="font-extrabold text-slate-200">{results.withoutIndex.executionTimeMs} ms</p>
                </div>
              </div>
              
              {/* With Index */}
              <div className="bg-slate-950 border border-slate-850 p-6 rounded-xl space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-450">With Index</h3>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Scan Node Type</p>
                  <p className="font-extrabold text-slate-200">{results.withIndex.planSummary}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Execution Latency</p>
                  <p className="font-extrabold text-slate-200">{results.withIndex.executionTimeMs} ms</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-xl text-center">
              <span className="block text-xs text-slate-400 font-semibold uppercase tracking-wider">Index Performance Benefit</span>
              <span className="text-3xl font-black text-indigo-400 mt-1 inline-block">
                {results.speedup}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
