import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function AdminEventsManagePage() {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [clubId, setClubId] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchClubs = async () => {
    try {
      const res = await api.get('/clubs');
      setClubs(res.data.data || []);
      if (res.data.data?.length > 0) {
        setClubId(res.data.data[0].id);
      }
    } catch (err) {
      setError('Failed to fetch clubs.');
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Fetch all events (including cancelled ones by sending empty timeframe)
      const res = await api.get('/events', { params: { timeframe: '', limit: 100 } });
      setEvents(res.data.data || []);
    } catch (err) {
      setError('Failed to fetch events database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
    fetchEvents();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormLoading(true);

    try {
      await api.post('/events', {
        clubId,
        title,
        description,
        venue,
        eventDate,
        eventTime: eventTime || undefined,
        totalSeats: parseInt(totalSeats, 10)
      });
      setSuccess('Event created successfully!');
      setTitle('');
      setDescription('');
      setVenue('');
      setEventDate('');
      setEventTime('');
      setTotalSeats('');
      fetchEvents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel (soft-delete) this event? All current registrations will remain in history.')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/events/${id}`);
      setSuccess('Event cancelled successfully.');
      fetchEvents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel event.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-400">Manage Events Catalog</h1>
          <p className="text-slate-400 mt-1">Deploy, modify, and monitor campus event registrations.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Event Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
            <h2 className="text-xl font-bold mb-4 text-indigo-400 border-b border-slate-800 pb-2">Deploy New Event</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hosting Club</label>
                <select 
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 outline-none text-sm"
                >
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Event Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Hackathon 2026"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Venue</label>
                  <input 
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Seminar Hall"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 outline-none text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Seats</label>
                  <input 
                    type="number"
                    required
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(e.target.value)}
                    placeholder="100"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 outline-none text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date</label>
                  <input 
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 outline-none text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Time (Optional)</label>
                  <input 
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 outline-none text-sm text-slate-200"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={formLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-3 rounded-xl font-bold transition-all shadow-md"
              >
                {formLoading ? 'Deploying...' : 'Deploy Event'}
              </button>
            </form>
          </div>

          {/* List Events database */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-indigo-400 border-b border-slate-800 pb-2">Active & Cancelled Events</h2>
            {loading ? (
              <p className="text-center py-6 text-indigo-400 animate-pulse">Loading database...</p>
            ) : events.length === 0 ? (
              <p className="text-slate-500 text-sm">No events found in directory.</p>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
                {events.map(event => (
                  <div key={event.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center hover:border-slate-700 transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-100">{event.title}</h3>
                        {event.status === 'cancelled' ? (
                          <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold uppercase">Cancelled</span>
                        ) : (
                          <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">Active</span>
                        )}
                        {event.isDemo && (
                          <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">Demo Lab</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Club: {event.club?.name} | Venue: {event.venue}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Date: {new Date(event.eventDate).toLocaleDateString()} | Seats: {event.remainingSeats} / {event.totalSeats}</p>
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/admin/events/${event.id}/participants`} className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                        Registrants
                      </Link>
                      {event.status !== 'cancelled' && (
                        <button 
                          onClick={() => handleCancel(event.id)}
                          className="bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
