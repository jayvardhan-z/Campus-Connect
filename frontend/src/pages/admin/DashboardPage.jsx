import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/reports/admin-summary');
        setData(res.data.data);
      } catch (err) {
        setError('Failed to fetch admin summary metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-lg animate-pulse text-indigo-400 font-medium">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl max-w-md mx-auto mt-10">
          {error}
        </div>
      </div>
    );
  }

  const { metrics = {}, mostPopularEvent = null, monthlyRegistrationStats = [] } = data || {};

  // Formats data for line chart
  const chartData = [...monthlyRegistrationStats].reverse().map(item => ({
    name: item.month,
    Registrations: item.count
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Block */}
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-400 tracking-tight">Admin System Console</h1>
          <p className="text-slate-400 mt-1">Global campus metrics, registration volumes, and trends.</p>
        </div>

        {/* Global Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-2">
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total Students</p>
            <p className="text-4xl font-black text-indigo-400">{metrics.total_students || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-2">
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total Clubs</p>
            <p className="text-4xl font-black text-indigo-400">{metrics.total_clubs || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-2">
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total Events</p>
            <p className="text-4xl font-black text-indigo-400">{metrics.total_events || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-2">
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total Registrations</p>
            <p className="text-4xl font-black text-emerald-400">{metrics.total_registrations || 0}</p>
          </div>
        </div>

        {/* Popular & Trends Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Registration Volume Trend (Last 6 Months)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Line type="monotone" dataKey="Registrations" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Popular Event Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-2">Most Popular Event</h3>
              {mostPopularEvent ? (
                <div className="space-y-3">
                  <h4 className="text-xl font-extrabold text-indigo-400">{mostPopularEvent.event_title}</h4>
                  <p className="text-sm text-slate-300">Club: <span className="font-semibold text-slate-100">{mostPopularEvent.club_name}</span></p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Active Registrants</span>
                      <span className="text-lg font-bold text-emerald-400">{mostPopularEvent.active_registrations}</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Cancellations</span>
                      <span className="text-lg font-bold text-amber-400">{mostPopularEvent.cancellations}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Seat Fill Rate</span>
                    <span className="text-lg font-bold text-indigo-400">
                      {(parseFloat(mostPopularEvent.fill_rate) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No registrations recorded yet.</p>
              )}
            </div>

            <div className="pt-6">
              <Link to="/admin/events" className="block text-center bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl text-sm font-bold transition-colors shadow-md">
                Manage Events Database
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
