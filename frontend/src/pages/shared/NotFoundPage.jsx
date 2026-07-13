import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <h1 className="text-6xl font-extrabold text-indigo-500 mb-4">404</h1>
      <p className="text-xl text-slate-400 mb-8">Oops! Page not found.</p>
      <Link to="/" className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg transition-colors font-medium shadow-lg">
        Go Back Home
      </Link>
    </div>
  );
}
