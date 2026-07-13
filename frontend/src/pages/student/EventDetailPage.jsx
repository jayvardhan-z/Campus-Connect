import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

export default function StudentEventDetailPage() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null); // 'registered', 'none', 'cancelled'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const [eventRes, myRegsRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get('/reports/student-summary')
      ]);

      setEvent(eventRes.data.data);
      
      // Determine if registered for this event
      const myRegs = myRegsRes.data.data?.myRegistrations || [];
      const match = myRegs.find(r => r.event_id === id);
      if (match) {
        setRegistrationStatus(match.registration_status);
      } else {
        setRegistrationStatus('none');
      }
    } catch (err) {
      setError('Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleRegister = async () => {
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      await api.post(`/registrations/${id}`);
      setSuccess('Successfully registered for the event!');
      setRegistrationStatus('registered');
      // Refresh details to show seat updates
      const eventRes = await api.get(`/events/${id}`);
      setEvent(eventRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete registration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      await api.delete(`/registrations/${id}`);
      setSuccess('Successfully cancelled your registration.');
      setRegistrationStatus('cancelled');
      // Refresh details to show seat updates
      const eventRes = await api.get(`/events/${id}`);
      setEvent(eventRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel registration.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-lg animate-pulse text-indigo-400 font-medium">Loading event details...</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl max-w-md mx-auto mt-10">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation back */}
        <Link to="/events" className="inline-block text-slate-400 hover:text-indigo-400 text-sm font-semibold transition-colors">
          &larr; Back to Events Listings
        </Link>

        {/* Message Banner */}
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

        {/* Event detail block */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-extrabold text-indigo-400 tracking-tight">{event.title}</h1>
            {event.isDemo && (
              <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Demo Event
              </span>
            )}
          </div>

          <p className="text-slate-300 text-base leading-relaxed whitespace-pre-wrap">{event.description || 'No description provided.'}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Organizing Club</p>
              <p className="text-sm font-bold text-slate-200">{event.club?.name}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Event Venue</p>
              <p className="text-sm font-bold text-slate-200">{event.venue}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Event Date</p>
              <p className="text-sm font-bold text-indigo-400">{new Date(event.eventDate).toLocaleDateString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Available Seats</p>
              <p className="text-sm font-bold text-slate-200">
                <span className="text-xl font-black text-indigo-400">{event.remainingSeats}</span> / {event.totalSeats} seats
              </p>
            </div>
          </div>

          {/* Action trigger panel */}
          <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500">Registration Status</p>
              <p className="text-sm font-bold capitalize text-slate-300">
                {registrationStatus === 'registered' ? (
                  <span className="text-emerald-400 font-semibold">Registered</span>
                ) : registrationStatus === 'cancelled' ? (
                  <span className="text-amber-400 font-semibold">Cancelled</span>
                ) : (
                  'Not Registered'
                )}
              </p>
            </div>

            {registrationStatus === 'registered' ? (
              <button 
                onClick={handleCancel}
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg"
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Registration'}
              </button>
            ) : (
              <button 
                onClick={handleRegister}
                disabled={actionLoading || event.remainingSeats <= 0 || event.status !== 'active'}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg"
              >
                {event.remainingSeats <= 0 
                  ? 'Event Full' 
                  : event.status !== 'active' 
                  ? 'Unavailable' 
                  : actionLoading 
                  ? 'Registering...' 
                  : 'Register Now'
                }
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
