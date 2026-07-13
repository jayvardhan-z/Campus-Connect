import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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
      setError('Failed to fetch clubs list.');
    }
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.data || []);
    } catch (err) {
      setError('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormLoading(true);

    try {
      await api.post('/announcements', {
        title,
        content,
        clubId
      });
      setSuccess('Announcement broadcasted successfully!');
      setTitle('');
      setContent('');
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to dispatch announcement.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/announcements/${id}`);
      setSuccess('Announcement deleted.');
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete announcement.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-400">Manage Announcements</h1>
          <p className="text-slate-400 mt-1">Dispatch broad updates and notices to club members and student feeds.</p>
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
          
          {/* Create Announcement Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
            <h2 className="text-xl font-bold mb-4 text-indigo-400 border-b border-slate-800 pb-2">New Broadcast</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Publishing Club Source</label>
                <select 
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 outline-none text-sm"
                >
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Announcement Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Club Meeting Postponed"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Content Details</label>
                <textarea 
                  rows="5"
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter content text..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm text-slate-200 resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={formLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-3 rounded-xl font-bold transition-all shadow-md"
              >
                {formLoading ? 'Publishing...' : 'Broadcast'}
              </button>
            </form>
          </div>

          {/* List Announcements */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-indigo-400 border-b border-slate-800 pb-2">Broadcast History</h2>
            {loading ? (
              <p className="text-center py-6 text-indigo-400 animate-pulse">Loading list...</p>
            ) : announcements.length === 0 ? (
              <p className="text-slate-500 text-sm">No announcements posted yet.</p>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
                {announcements.map(ann => (
                  <div key={ann.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-start hover:border-slate-700 transition-all">
                    <div className="space-y-1 flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-100">{ann.title}</h3>
                        <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">
                          {ann.club?.name || 'General'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                      <p className="text-[10px] text-slate-500 pt-1">Posted: {new Date(ann.createdAt).toLocaleDateString()}</p>
                    </div>

                    <button 
                      onClick={() => handleDelete(ann.id)}
                      className="bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    >
                      Delete
                    </button>
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
