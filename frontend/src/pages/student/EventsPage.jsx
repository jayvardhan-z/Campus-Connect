import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function StudentEventsPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Search & Filters state
  const [search, setSearch] = useState('');
  const [clubId, setClubId] = useState('');
  const [category, setCategory] = useState('');
  const [timeframe, setTimeframe] = useState('upcoming'); // default upcoming
  const [department, setDepartment] = useState('');
  const [sort, setSort] = useState('latest');
  const [date, setDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dropdown options
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const res = await api.get('/clubs');
        setClubs(res.data.data || []);
      } catch (err) {
        console.error('Failed to load clubs', err);
      }
    };
    fetchClubs();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: search,
        club: clubId,
        category,
        timeframe,
        department,
        sort,
        date,
        dateFrom,
        dateTo
      };
      
      const res = await api.get('/events', { params });
      setEvents(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, clubId, category, timeframe, department, sort, date, dateFrom, dateTo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleReset = () => {
    setSearch('');
    setClubId('');
    setCategory('');
    setTimeframe('upcoming');
    setDepartment('');
    setSort('latest');
    setDate('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-400">Explore Campus Events</h1>
          <p className="text-slate-400 mt-1">Filter, search, and register for active events.</p>
        </div>

        {/* Filter and Search Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <input 
              type="text"
              placeholder="Search by event title or club name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none transition-all"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold transition-colors">
              Search
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Filter by Club */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Club</label>
              <select 
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 outline-none text-sm"
              >
                <option value="">All Clubs</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Filter by Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 outline-none text-sm"
              >
                <option value="">All Categories</option>
                <option value="Technical">Technical</option>
                <option value="Coding">Coding</option>
                <option value="Robotics">Robotics</option>
                <option value="Music">Music</option>
                <option value="Dance">Dance</option>
                <option value="Sports">Sports</option>
                <option value="Management">Management</option>
              </select>
            </div>

            {/* Filter by Student Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Student Dept</label>
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 outline-none text-sm"
              >
                <option value="">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
              </select>
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Timeframe</label>
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 outline-none text-sm"
              >
                <option value="upcoming">Upcoming Events</option>
                <option value="past">Past Events</option>
                <option value="">All Events</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sort By</label>
              <select 
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 outline-none text-sm"
              >
                <option value="latest">Latest Created</option>
                <option value="oldest">Oldest Created</option>
                <option value="popular">Popularity (Most Regs)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-4">
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 outline-none text-sm text-slate-300"
                placeholder="Exact Date"
              />
              <span className="self-center text-xs text-slate-500">OR RANGE</span>
              <input 
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 outline-none text-sm text-slate-300"
              />
              <span className="self-center text-xs text-slate-500">to</span>
              <input 
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 outline-none text-sm text-slate-300"
              />
            </div>

            <button type="button" onClick={handleReset} className="text-slate-400 hover:text-indigo-400 text-sm font-semibold transition-colors">
              Reset Filters
            </button>
          </div>
        </div>

        {/* Events List Grid */}
        {loading ? (
          <div className="text-center py-10">
            <p className="text-indigo-400 animate-pulse font-medium">Refreshing list...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center shadow-xl">
            <p className="text-slate-400">No events matched your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div key={event.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-indigo-500/50 transition-all">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full font-bold uppercase">
                      {event.club?.category || 'General'}
                    </span>
                    {event.isDemo && (
                      <span className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full font-bold uppercase">
                        Demo
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-xl text-slate-100">{event.title}</h3>
                  <p className="text-xs text-slate-400">Club: <span className="text-slate-300 font-semibold">{event.club?.name}</span></p>
                  <p className="text-xs text-slate-400">Venue: <span className="text-slate-300">{event.venue}</span></p>
                  <p className="text-xs text-slate-400">Date: <span className="text-indigo-400">{new Date(event.eventDate).toLocaleDateString()}</span></p>
                  
                  <div className="flex gap-4 pt-2">
                    <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-center flex-1">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Remaining Seats</p>
                      <p className="text-lg font-black text-indigo-400">{event.remainingSeats}</p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-center flex-1">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Registrations</p>
                      <p className="text-lg font-black text-emerald-400">{event.registrationCount}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <Link to={`/events/${event.id}`} className="block text-center bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-6">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            >
              Previous
            </button>
            <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            >
              Next
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
