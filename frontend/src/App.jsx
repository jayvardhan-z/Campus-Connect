import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// Student Pages
import StudentDashboardPage from './pages/student/DashboardPage';
import StudentEventsPage from './pages/student/EventsPage';
import StudentEventDetailPage from './pages/student/EventDetailPage';
import StudentProfilePage from './pages/student/ProfilePage';

// Admin Pages
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminEventsManagePage from './pages/admin/EventsManagePage';
import AdminParticipantsPage from './pages/admin/ParticipantsPage';
import AdminAnnouncementsPage from './pages/admin/AnnouncementsPage';
import AdminConcurrencyLabPage from './pages/admin/ConcurrencyLabPage';
import AdminQueryOptimizerPage from './pages/admin/QueryOptimizerPage';

// Shared Pages
import NotFoundPage from './pages/shared/NotFoundPage';

function RootRedirect() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-lg animate-pulse text-indigo-400 font-semibold">Redirecting...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function MainApp() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Student Protected Routes */}
            <Route element={<PrivateRoute allowedRoles={['student']} />}>
              <Route path="/dashboard" element={<StudentDashboardPage />} />
              <Route path="/events" element={<StudentEventsPage />} />
              <Route path="/events/:id" element={<StudentEventDetailPage />} />
              <Route path="/profile" element={<StudentProfilePage />} />
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<PrivateRoute allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/events" element={<AdminEventsManagePage />} />
              <Route path="/admin/events/:id/participants" element={<AdminParticipantsPage />} />
              <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
              <Route path="/admin/concurrency-lab" element={<AdminConcurrencyLabPage />} />
              <Route path="/admin/query-optimizer" element={<AdminQueryOptimizerPage />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
