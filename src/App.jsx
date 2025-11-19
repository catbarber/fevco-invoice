// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthWithAdmin } from './hooks/useAuthWithAdmin';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import InvoiceDetails from './pages/InvoiceDetails';
import UserProfile from './pages/UserProfile';
import EmailLogs from './pages/EmailLogs';
import Settings from './pages/Settings';
import { AdminBadge } from './components/AdminOnly';
import Navigation from './components/Navigation';
import './styles/global.css';

// Protected Route component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuthWithAdmin();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuthWithAdmin();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

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
    <Router>
      <div className="app">
        {user && <Navigation />}
        
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/invoices/:invoiceId" 
            element={
              <ProtectedRoute>
                <InvoiceDetails />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Only Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/email-logs" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <EmailLogs />
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect */}
          <Route 
            path="/" 
            element={
              <Navigate to={user ? "/dashboard" : "/login"} replace />
            } 
          />
          
          {/* 404 fallback */}
          <Route 
            path="*" 
            element={
              <div className="not-found">
                <h2>404 - Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
                <Navigate to="/dashboard" replace />
              </div>
            } 
          />
        </Routes>

        {user && <AdminBadge />}
      </div>
    </Router>
  );
}

export default App;