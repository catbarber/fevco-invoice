// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import InvoiceList from '../components/InvoiceList';
import InvoiceForm from '../components/InvoiceForm';
import { useAuthWithRoles } from '../hooks/useAuthWithRoles';
import AdminPanel from '../components/AdminPanel';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config.js'; // Make sure to include .js extension
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
const { userRole, hasRole, hasPermission } = useAuthWithRoles();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const q = query(
        collection(db, 'invoices'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const invoicesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setInvoices(invoicesData);
          setLoading(false);
          setError('');
        },
        (error) => {
          console.error('Error getting invoices:', error);
          setError('Failed to load invoices. Please check your permissions.');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up invoice listener:', error);
      setError('Failed to set up invoice listener.');
      setLoading(false);
    }
  }, [user]);

  const handleCreateInvoice = async (invoiceData) => {
    try {
      setError('');
      await addDoc(collection(db, 'invoices'), {
        ...invoiceData,
        userId: user.uid,
        createdAt: new Date(),
        status: 'pending',
        updatedAt: new Date()
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Failed to create invoice. Please check your permissions.');
    }
  };

  const handleUpdateInvoice = async (invoiceData) => {
    try {
      setError('');
      await updateDoc(doc(db, 'invoices', editingInvoice.id), {
        ...invoiceData,
        updatedAt: new Date()
      });
      setEditingInvoice(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error updating invoice:', error);
      setError('Failed to update invoice. Please check your permissions.');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      setError('');
      await deleteDoc(doc(db, 'invoices', invoiceId));
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setError('Failed to delete invoice. Please check your permissions.');
    }
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to logout. Please try again.');
    }
  };

  const clearError = () => {
    setError('');
  };

  return (
    <div className="dashboard">

      <header className="dashboard-header">
        <div className="header-content">
          <h1>Invoice Manager</h1>
           <div className="user-info">
          <span>{user?.displayName}</span>
          <span className="user-role">({userRole?.role})</span>
        </div>
          <div className="user-info">
            <span>Welcome, {user?.displayName}</span>
            <img 
              src={user?.photoURL} 
              alt="Profile" 
              className="user-avatar"
            />
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={clearError} className="error-close">×</button>
          </div>
        )}

        <div className="dashboard-actions">
          <button 
            className="btn-primary"
            onClick={() => {
              setEditingInvoice(null);
              setShowForm(true);
            }}
          >
            + Create Invoice
          </button>
        </div>

        {showForm && (
          <InvoiceForm
            invoice={editingInvoice}
            onSubmit={editingInvoice ? handleUpdateInvoice : handleCreateInvoice}
            onCancel={() => {
              setShowForm(false);
              setEditingInvoice(null);
            }}
          />
        )}
{hasRole('admin') && <AdminPanel />}
        {loading ? (
          <div className="loading">Loading invoices...</div>
        ) : (
          <InvoiceList
            invoices={invoices}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;

