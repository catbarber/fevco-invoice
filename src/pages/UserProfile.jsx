// src/pages/UserProfile.jsx
import React from 'react';
import { useAuthWithAdmin } from '../hooks/useAuthWithAdmin';

const UserProfile = () => {
  const { user, userRole } = useAuthWithAdmin();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>User Profile</h1>
      </div>
      <div className="page-content">
        <div className="profile-card">
          <img src={user?.photoURL} alt="Profile" className="profile-avatar" />
          <h2>{user?.displayName}</h2>
          <p>{user?.email}</p>
          <div className="profile-details">
            <p><strong>Role:</strong> {userRole?.role || 'User'}</p>
            <p><strong>Permissions:</strong> {userRole?.permissions?.join(', ') || 'Basic'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;