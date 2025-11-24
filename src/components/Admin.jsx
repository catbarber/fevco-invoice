import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import '../styles/Admin.css';

const Admin = () => {
  const { isAdmin, adminUsers, allUsers, addAdmin, removeAdmin, SUPER_ADMINS, loading, error } = useAdmin();
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner">Loading admin panel...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-unauthorized">
        <div className="unauthorized-card">
          <h2>Access Denied</h2>
          <p>You do not have permission to access the admin panel.</p>
          <div className="admin-icon">🔒</div>
        </div>
      </div>
    );
  }

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    setAddingAdmin(true);
    setMessage({ type: '', text: '' });

    try {
      await addAdmin(newAdminEmail);
      setMessage({ type: 'success', text: `Admin ${newAdminEmail} added successfully!` });
      setNewAdminEmail('');
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to add admin: ${error.message}` });
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (email) => {
    if (!window.confirm(`Are you sure you want to remove ${email} as admin?`)) return;

    try {
      await removeAdmin(email);
      setMessage({ type: 'success', text: `Admin ${email} removed successfully!` });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to remove admin: ${error.message}` });
    }
  };

  const allAdmins = [...SUPER_ADMINS.map(email => ({ 
    email, 
    isSuperAdmin: true,
    addedBy: 'System'
  })), ...adminUsers];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage users and administrator access</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="admin-message error">
          <strong>Error:</strong> {error}
          <br />
          <small>Make sure you're signed in with an admin account and Firebase rules are properly configured.</small>
        </div>
      )}

      {message.text && (
        <div className={`admin-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="admin-sections">
        {/* Add Admin Section */}
        <section className="admin-section">
          <h2>Add New Admin</h2>
          <form onSubmit={handleAddAdmin} className="add-admin-form">
            <div className="form-group">
              <label htmlFor="adminEmail">Email Address</label>
              <input
                id="adminEmail"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="Enter email address to grant admin access"
                required
                disabled={!!error}
              />
            </div>
            <button 
              type="submit" 
              disabled={addingAdmin || !newAdminEmail.trim() || !!error}
              className="add-admin-btn"
            >
              {addingAdmin ? 'Adding...' : 'Add Admin'}
            </button>
          </form>
        </section>

        {/* Current Admins Section */}
        <section className="admin-section">
          <h2>Current Administrators ({allAdmins.length})</h2>
          <div className="admins-list">
            {allAdmins.map((admin) => (
              <div key={admin.email} className="admin-item">
                <div className="admin-info">
                  <span className="admin-email">{admin.email}</span>
                  <div className="admin-meta">
                    <span className={`admin-badge ${admin.isSuperAdmin ? 'super-admin' : 'regular-admin'}`}>
                      {admin.isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </span>
                    {!admin.isSuperAdmin && (
                      <span className="added-by">Added by: {admin.addedBy}</span>
                    )}
                  </div>
                </div>
                {!admin.isSuperAdmin && (
                  <button
                    onClick={() => handleRemoveAdmin(admin.email)}
                    className="remove-admin-btn"
                    title="Remove admin access"
                    disabled={!!error}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* All Users Section */}
        <section className="admin-section">
          <h2>All Users ({allUsers.length})</h2>
          {error ? (
            <div className="error-state">
              <p>Unable to load users due to permissions error.</p>
            </div>
          ) : (
            <div className="users-list">
              {allUsers.map((user) => (
                <div key={user.id} className="user-item">
                  <div className="user-avatar">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || user.email} />
                    ) : (
                      <span className="avatar-fallback">
                        {(user.displayName || user.email).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="user-info">
                    <span className="user-name">{user.displayName || 'No Name'}</span>
                    <span className="user-email">{user.email}</span>
                    <span className="user-joined">
                      Joined: {user.createdAt ? new Date(user.createdAt?.toDate()).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                  <div className="user-status">
                    <span className={`admin-indicator ${allAdmins.some(admin => admin.email === user.email) ? 'is-admin' : ''}`}>
                      {allAdmins.some(admin => admin.email === user.email) ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Admin;