// src/components/SuperAdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { withAdmin } from './AdminOnly';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config.js'; // Make sure to include .js extension
import '../styles/SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Load all invoices
      const invoicesSnapshot = await getDocs(collection(db, 'invoices'));
      const invoicesData = invoicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading admin data:', error);
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
      loadAllData();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="super-admin-dashboard">
      <div className="admin-header">
        <h1>👑 Super Admin Dashboard</h1>
        <p>Full system access for administrators</p>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <h3>Total Users</h3>
          <span className="stat-number">{users.length}</span>
        </div>
        <div className="stat-card">
          <h3>Total Invoices</h3>
          <span className="stat-number">{invoices.length}</span>
        </div>
        <div className="stat-card">
          <h3>Admin Users</h3>
          <span className="stat-number">
            {users.filter(u => u.isAdmin).length}
          </span>
        </div>
      </div>

      <div className="admin-sections">
        <section className="admin-section">
          <h2>User Management</h2>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Admin</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info">
                        <img src={user.photoURL} alt="Avatar" className="user-avatar" />
                        {user.displayName}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.isAdmin ? '✅' : '❌'}
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
        </section>

        <section className="admin-section">
          <h2>All Invoices</h2>
          <div className="invoices-table">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="invoice-id">{invoice.id.slice(0, 8)}...</td>
                    <td>{invoice.clientName}</td>
                    <td>${invoice.total?.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-${invoice.status}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      {invoice.createdAt?.toDate().toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default withAdmin(SuperAdminDashboard);