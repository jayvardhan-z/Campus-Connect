import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';

export default function AdminParticipantsPage() {
  const { id } = useParams();
  const [participants, setParticipants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [participantsRes, statsRes] = await Promise.all([
        api.get(`/registrations/event/${id}`, { params: { limit: 100 } }),
        api.get(`/dashboard/event-stats/${id}`)
      ]);
      setParticipants(participantsRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (err) {
      setError('Failed to fetch participants directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-lg animate-pulse text-indigo-400 font-medium">Loading participants directory...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation back */}
        <Link to="/admin/events" className="inline-block text-slate-400 hover:text-indigo-400 text-sm font-semibold transition-colors">
          &larr; Back to Events Manager
        </Link>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Header Block */}
        {stats && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
            <div>
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full font-bold uppercase">
                {stats.club_name}
              </span>
              <h1 className="text-3xl font-extrabold text-indigo-400 mt-2 tracking-tight">{stats.event_title}</h1>
              <p className="text-slate-400 text-sm mt-1">Registrant directory and seat metrics.</p>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-xl text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Active Registrations</span>
                <span className="text-xl font-black text-emerald-450">{stats.active_registrations}</span>
              </div>
              <div className="bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-xl text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Cancellations</span>
                <span className="text-xl font-black text-rose-400">{stats.cancellations}</span>
              </div>
              <div className="bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-xl text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Fill Rate</span>
                <span className="text-xl font-black text-indigo-405">{(parseFloat(stats.fill_rate) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Directory Listing */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-850">
            <h2 className="text-lg font-bold text-slate-100">Participant Logs</h2>
          </div>
          {participants.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              No students have registered for this event yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-850 text-slate-400 uppercase font-semibold text-xs">
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Year of Study</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Signed Up At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {participants.map(reg => (
                    <tr key={reg.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-200">{reg.user?.profile?.fullName || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-300">{reg.user?.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-400">{reg.user?.profile?.department || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-400">{reg.user?.profile?.yearOfStudy ? `${reg.user.profile.yearOfStudy} Year` : 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-400">{reg.user?.profile?.phone || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          reg.status === 'registered' 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        }`}>
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(reg.registeredAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
