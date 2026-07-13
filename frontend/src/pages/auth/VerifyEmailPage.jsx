import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        const response = await axios.get(`/api/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.data?.message || 'Email verified successfully! You can now log in.');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification token is invalid or has expired.');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl text-center">
        <h2 className="text-3xl font-extrabold text-indigo-400 mb-6 tracking-tight">Email Verification</h2>

        {status === 'verifying' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-6"></div>
            <p className="text-slate-300">Activating your account, please wait...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-6 text-sm">
              {message}
            </div>
            <Link to="/login" className="inline-block bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold tracking-wide transition-colors">
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 text-sm">
              {message}
            </div>
            <Link to="/register" className="inline-block bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold tracking-wide transition-colors">
              Back to Registration
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
