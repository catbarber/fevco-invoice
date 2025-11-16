// Updated App.jsx
import React from 'react';
import { useAuthWithAdmin } from './hooks/useAuthWithAdmin';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { AdminBadge } from './components/AdminOnly';
import './styles/global.css';

function App() {
  const { user, loading, isAdmin } = useAuthWithAdmin();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {user ? (
        <>
          {isAdmin() ? <SuperAdminDashboard /> : <Dashboard />}
          <AdminBadge />
        </>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;