import React, { useState, useEffect } from 'react';
import ParticipantPage from './pages/ParticipantPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAdminRoute = currentPath === '/admin' || currentPath === '/admin-portal' || currentPath.startsWith('/admin/');

  return (
    <div className="min-h-screen text-slate-800">
      {isAdminRoute ? <AdminPage /> : <ParticipantPage />}
    </div>
  );
}

