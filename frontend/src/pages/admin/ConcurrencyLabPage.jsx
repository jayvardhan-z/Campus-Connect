import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function ConcurrencyLabPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [concurrentRequests, setConcurrentRequests] = useState(5);
  
  // Simulation results
  const [concurrencyResult, setConcurrencyResult] = useState(null);
  const [isolationResult, setIsolationResult] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/events', { params: { limit: 100 } });
      const demoEvents = (res.data.data || []).filter(e => e.isDemo);
      setEvents(demoEvents);
      if (demoEvents.length > 0) {
        setSelectedEventId(demoEvents[0].id);
      }
    } catch (err) {
      setError('Failed to fetch demo events catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const runConcurrencyTest = async (mode) => {
    if (!selectedEventId) return;
    setSimulating(true);
    setConcurrencyResult(null);
    setError('');
    try {
      const res = await api.post('/concurrency-lab/simulate', {
        eventId: selectedEventId,
        mode,
        concurrentRequests: parseInt(concurrentRequests, 10)
      });
      setConcurrencyResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Concurrency simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  const runIsolationTest = async () => {
    if (!selectedEventId) return;
    setSimulating(true);
    setIsolationResult(null);
    setError('');
    try {
      const res = await api.get('/concurrency-lab/isolation-demo', {
        params: {
          eventId: selectedEventId,
          concurrentRequests: 3
        }
      });
      setIsolationResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Isolation level simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Block */}
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-400">Database Concurrency & ACID Lab</h1>
          <p className="text-slate-400 mt-1">Live simulation lab proving why row locking and transaction isolation matter under load.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-2">Lab Controls</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Demo Event</label>
              {loading ? (
                <p className="text-sm text-indigo-400 animate-pulse">Loading demo events...</p>
              ) : events.length === 0 ? (
                <p className="text-rose-400 text-sm">No demo events found. Please verify the seed script ran successfully.</p>
              ) : (
                <select 
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 outline-none text-sm"
                >
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Concurrent Request Volume</label>
              <input 
                type="number"
                min="2"
                max="10"
                value={concurrentRequests}
                onChange={(e) => setConcurrentRequests(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: Concurrency Safe vs Unsafe Simulation */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-2">Safe vs Unsafe Concurrency</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Fire concurrent API registration requests at the demo event (which only has 1 remaining seat).
                In <b>Unsafe Mode</b>, multiple students will successfully register, resulting in double bookings (negative seats).
                In <b>Safe Mode</b>, row locks prevent double bookings.
              </p>
              
              {concurrencyResult && (
                <div className="mt-6 bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Simulation Result</span>
                    {concurrencyResult.overbooked ? (
                      <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        OVERBOOKED / BUGGED
                      </span>
                    ) : (
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        SAFE / CONSISTENT
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                      <span className="block text-[10px] text-slate-500 uppercase">Successes</span>
                      <span className="text-lg font-black text-emerald-400">{concurrencyResult.successCount}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                      <span className="block text-[10px] text-slate-500 uppercase">Failures</span>
                      <span className="text-lg font-black text-rose-450">{concurrencyResult.failureCount}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                      <span className="block text-[10px] text-slate-500 uppercase">Final Seats</span>
                      <span className={`text-lg font-black ${concurrencyResult.finalRemainingSeats < 0 ? 'text-rose-400' : 'text-indigo-400'}`}>
                        {concurrencyResult.finalRemainingSeats}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-800">
              <button 
                onClick={() => runConcurrencyTest('unsafe')}
                disabled={simulating || !selectedEventId}
                className="flex-1 bg-rose-650 hover:bg-rose-700 disabled:opacity-50 py-3 rounded-xl font-bold text-sm transition-all"
              >
                Run Unsafe
              </button>
              <button 
                onClick={() => runConcurrencyTest('safe')}
                disabled={simulating || !selectedEventId}
                className="flex-1 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 py-3 rounded-xl font-bold text-sm transition-all"
              >
                Run Safe (SELECT FOR UPDATE)
              </button>
            </div>
          </div>

          {/* Card 2: Isolation Level Demonstration */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-2">Isolation Level Comparison</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Demonstrates how database transactions behave at different isolation levels.
                We compare standard Postgres <b>READ COMMITTED</b> isolation vs <b>SERIALIZABLE</b> isolation 
                to test how conflicts are detected and handles.
              </p>

              {isolationResult && (
                <div className="mt-6 bg-slate-950 border border-slate-800 p-6 rounded-xl space-y-6">
                  {/* Read Committed Card */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-indigo-400">READ COMMITTED</span>
                      {isolationResult.readCommittedResults.overbooked ? (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-bold uppercase">Overbooked</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">Safe</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{isolationResult.readCommittedResults.explanation}</p>
                    <p className="text-xs text-slate-300">Successful bookings: <span className="font-bold text-emerald-400">{isolationResult.readCommittedResults.successCount}</span></p>
                  </div>

                  {/* Serializable Card */}
                  <div className="space-y-2 border-t border-slate-800 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-indigo-400">SERIALIZABLE</span>
                      {isolationResult.serializableResults.overbooked ? (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-bold uppercase">Overbooked</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">Safe</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{isolationResult.serializableResults.explanation}</p>
                    <p className="text-xs text-slate-300">
                      Successful bookings: <span className="font-bold text-emerald-400">{isolationResult.serializableResults.successCount}</span>
                      {' '}| Failures (Code 40001): <span className="font-bold text-rose-450">{isolationResult.serializableResults.serializationFailures}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button 
                onClick={runIsolationTest}
                disabled={simulating || !selectedEventId}
                className="w-full bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 py-3 rounded-xl font-bold text-sm transition-all"
              >
                Run Isolation Level Simulation
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
