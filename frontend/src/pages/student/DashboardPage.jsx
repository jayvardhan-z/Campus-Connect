import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function StudentDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/reports/student-summary');
        setData(res.data.data);
      } catch (err) {
        setError('Failed to fetch dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-lg animate-pulse text-indigo-400 font-medium">Loading summary...</p>
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

  const { upcomingEvents = [], myRegistrations = [], recentAnnouncements = [], totalRegisteredCount = 0 } = data || {};

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl gap-4 shadow-xl">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-indigo-400">Student Dashboard</h1>
            <p className="text-slate-400 mt-1">Stay updated with campus activities, clubs, and registrations.</p>
          </div>
          <div className="bg-indigo-600/10 border border-indigo-500/20 px-6 py-3 rounded-2xl text-center">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Registered Events</p>
            <p className="text-3xl font-black text-indigo-400">{totalRegisteredCount}</p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: Upcoming & My Registrations */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Upcoming Events */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-indigo-400 border-b border-slate-800 pb-2">Upcoming Events</h2>
              {upcomingEvents.length === 0 ? (
                <p className="text-slate-500 text-sm">No upcoming events listed right now.</p>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map(event => (
                    <div key={event.event_id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center hover:border-indigo-500/50 transition-all">
                      <div>
                        <h3 className="font-bold text-slate-100">{event.event_title}</h3>
                        <p className="text-xs text-slate-400 mt-1">Club: {event.club_name} | Venue: {event.venue}</p>
                        <p className="text-xs text-indigo-400 mt-0.5">Date: {new Date(event.event_date).toLocaleDateString()}</p>
                      </div>
                      <Link to={`/events/${event.event_id}`} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-xs font-semibold transition-colors">
                        Details
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Registrations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-indigo-400 border-b border-slate-800 pb-2">My Recent Registrations</h2>
              {myRegistrations.length === 0 ? (
                <p className="text-slate-500 text-sm">You haven't signed up for any events yet.</p>
              ) : (
                <div className="space-y-4">
                  {myRegistrations.map(reg => (
                    <div key={reg.registration_id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-100">{reg.event_title}</h3>
                        <p className="text-xs text-slate-400 mt-1">Club: {reg.club_name} | Date: {new Date(reg.event_date).toLocaleDateString()}</p>
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          {reg.registration_status}
                        </span>
                      </div>
                      <Link to={`/events/${reg.event_id}`} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-semibold transition-colors">
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Column 3: Recent Announcements */}
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-full">
              <h2 className="text-xl font-bold mb-4 text-indigo-400 border-b border-slate-800 pb-2">Announcements</h2>
              {recentAnnouncements.length === 0 ? (
                <p className="text-slate-500 text-sm">No announcements posted recently.</p>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {recentAnnouncements.map(ann => (
                    <div key={ann.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase">
                          {ann.club_name || 'General'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-100">{ann.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
