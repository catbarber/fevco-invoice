// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuthWithAdmin } from '../hooks/useAuthWithAdmin';
import InvoiceList from '../components/InvoiceList';
import InvoiceForm from '../components/InvoiceForm';
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
import { db,functions } from '../firebase/config.js'; // Ensure .js extension
import '../styles/Dashboard.css';
import { httpsCallable } from 'firebase/functions';


  export const useUserPermissions = () => {
    const { user } = useAuthWithAdmin();
    const [permissions, setPermissions] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (user) {
        initializeUserPermissions();
      }
    }, [user]);

    const initializeUserPermissions = async () => {
      try {
        // First, try to get existing permissions
        const getPermissions = httpsCallable(functions, 'getUserPermissions');
        const result = await getPermissions();

        setPermissions(result.data);

        // If user doesn't have a role, initialize one
        if (!result.data.hasRole) {
          const initializeUser = httpsCallable(functions, 'initializeAdminUser');
          await initializeUser();

          // Refresh permissions
          const newResult = await getPermissions();
          setPermissions(newResult.data);
        }
      } catch (error) {
        console.error('Error initializing user permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    return { permissions, loading };
  };
const Dashboard = () => {
  const { user, logout } = useAuthWithAdmin();
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Custom hook for user permissions

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
      const newInvoice = {
        ...invoiceData,
        userId: user.uid,
        createdAt: new Date(),
        status: invoiceData.status || 'pending',
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'invoices'), newInvoice);
      setShowForm(false);

      // Show success message
      setError('Invoice created successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Failed to create invoice. Please try again.');
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

      setError('Invoice updated successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      console.error('Error updating invoice:', error);
      setError('Failed to update invoice. Please try again.');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      await deleteDoc(doc(db, 'invoices', invoiceId));

      setError('Invoice deleted successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setError('Failed to delete invoice. Please try again.');
    }
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      await updateDoc(doc(db, 'invoices', invoiceId), {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating invoice status:', error);
      setError('Failed to update invoice status.');
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
          <div className="header-title">
            <h1>📊 Invoice Manager</h1>
            <p>Manage your invoices efficiently</p>
          </div>
          <div className="user-info">
            <img
              src={user?.photoURL}
              alt="Profile"
              className="user-avatar"
            />
            <div className="user-details">
              <span className="user-name">Welcome, {user?.displayName}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {error && (
          <div className={`message-banner ${error.includes('successfully') ? 'success' : 'error'}`}>
            <span>{error}</span>
            <button onClick={clearError} className="message-close">×</button>
          </div>
        )}

        <div className="dashboard-actions">
          <div className="actions-left">
            <h2>Your Invoices</h2>
            <span className="invoices-count">{invoices.length} total</span>
          </div>
          <div className="actions-right">
            <button
              className="btn-primary create-invoice-btn"
              onClick={() => {
                setEditingInvoice(null);
                setShowForm(true);
              }}
            >
              + Create New Invoice
            </button>
          </div>
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

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your invoices...</p>
          </div>
        ) : (
          <InvoiceList
            invoices={invoices}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;