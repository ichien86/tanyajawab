import React, { useState, useEffect } from 'react';
import ParticipantPage from './pages/ParticipantPage';
import AdminPage from './pages/AdminPage';
import LandingPage from './pages/LandingPage';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentSearch, setCurrentSearch] = useState(window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setCurrentSearch(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAdminRoute =
    currentPath === '/admin' || currentPath === '/admin-portal' || currentPath.startsWith('/admin/');

  // Cek apakah URL memiliki parameter sesi (?s=... atau ?session=...)
  const searchParams = new URLSearchParams(currentSearch);
  const hasSessionParam = Boolean(searchParams.get('s') || searchParams.get('session'));

  return (
    <div className="min-h-screen text-slate-800">
      {isAdminRoute ? (
        <AdminPage />
      ) : hasSessionParam ? (
        <ParticipantPage />
      ) : (
        <LandingPage />
      )}
    </div>
  );
}
