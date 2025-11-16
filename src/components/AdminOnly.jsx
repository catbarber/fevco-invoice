// src/components/AdminOnly.jsx
import React from 'react';
import { useAuthWithAdmin } from '../hooks/useAuthWithAdmin';

// Higher Order Component for admin-only access
export const withAdmin = (Component) => {
  return (props) => {
    const { isAdmin, loading } = useAuthWithAdmin();
    
    if (loading) return <div>Loading...</div>;
    if (!isAdmin()) return <AccessDenied />;
    
    return <Component {...props} />;
  };
};

// Access denied component
export const AccessDenied = () => (
  <div className="access-denied">
    <h2>🔒 Access Denied</h2>
    <p>You need administrator privileges to access this area.</p>
  </div>
);

// Admin badge component
export const AdminBadge = () => {
  const { isAdmin } = useAuthWithAdmin();
  
  if (!isAdmin()) return null;
  
  return (
    <span className="admin-badge">
      👑 Admin
    </span>
  );
};