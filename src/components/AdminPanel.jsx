// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { useAuthWithRoles } from '../hooks/useAuthWithRoles';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config.js'; // Make sure to include .js extension
import '../styles/AdminPanel.css';

const AdminPanel = () => {
  const { user, userRole, hasRole } = useAuthWithRoles();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasRole('admin')) {
      loadUsers();
    }
  }, [hasRole]);

  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'userRoles'));
      const usersData = await Promise.all(
        usersSnapshot.docs.map(async (doc) => {
          const userData = doc.data();
          const userDoc = await getDocs(doc(db, 'users', doc.id));
          return {
            id: doc.id,
            ...userData,
            ...userDoc.data()
          };
        })
      );
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, 'userRoles', userId), {
        role: newRole,
        permissions: getDefaultPermissions(newRole),
        updatedAt: new Date()
      });
      loadUsers(); // Reload users
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  if (!hasRole('admin')) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You need administrator privileges to access this panel.</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h2>User Management</h2>
      
      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Current Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.displayName}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <select 
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="guest">Guest</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Helper function (should be in a shared file)
const getDefaultPermissions = (role) => {
  const permissions = {
    admin: ['read_invoices', 'write_invoices', 'create_invoices', 'delete_invoices', 'manage_users'],
    manager: ['read_invoices', 'write_invoices', 'create_invoices'],
    user: ['read_invoices', 'create_invoices'],
    guest: ['read_invoices']
  };
  return permissions[role] || permissions.user;
};

export default AdminPanel;