import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
      <Link to="/" className="text-xl font-bold tracking-wider text-indigo-400">
        CAMPUS<span className="text-white">CONNECT</span>
      </Link>
      
      <div className="flex items-center gap-6">
        {user ? (
          <>
            {user.role === 'student' ? (
              <>
                <Link to="/dashboard" className="hover:text-indigo-400 transition-colors text-sm font-medium">Dashboard</Link>
                <Link to="/events" className="hover:text-indigo-400 transition-colors text-sm font-medium">Find Events</Link>
                <Link to="/profile" className="hover:text-indigo-400 transition-colors text-sm font-medium">My Profile</Link>
              </>
            ) : (
              <>
                <Link to="/admin/dashboard" className="hover:text-indigo-400 transition-colors text-sm font-medium">Dashboard</Link>
                <Link to="/admin/events" className="hover:text-indigo-400 transition-colors text-sm font-medium">Manage Events</Link>
                <Link to="/admin/announcements" className="hover:text-indigo-400 transition-colors text-sm font-medium">Announcements</Link>
                <Link to="/admin/concurrency-lab" className="hover:text-indigo-400 transition-colors text-sm font-medium">Concurrency Lab</Link>
                <Link to="/admin/query-optimizer" className="hover:text-indigo-400 transition-colors text-sm font-medium">Query Optimizer</Link>
              </>
            )}
            
            <div className="flex items-center gap-4 pl-4 border-l border-slate-700">
              <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">({user.role})</span>
              <button 
                onClick={handleLogout} 
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-indigo-400 transition-colors text-sm font-medium">Login</Link>
            <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm transition-colors font-medium">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
