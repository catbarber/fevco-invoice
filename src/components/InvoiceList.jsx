import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import '../styles/InvoiceList.css';

const InvoiceList = ({ onViewInvoice, onEditInvoice }) => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'draft', 'sent', 'paid', 'overdue'

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'invoices'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invoicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInvoices(invoicesData);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const sendEmail = async (invoice) => {
    setSendingEmail(invoice.id);
    
    try {
      const sendInvoiceEmail = httpsCallable(functions, 'sendInvoiceEmail');
      const result = await sendInvoiceEmail({ 
        invoiceId: invoice.id 
      });
      
      alert('Invoice sent successfully!');
      console.log('Email sent:', result.data);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send invoice: ' + error.message);
    } finally {
      setSendingEmail(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'status-draft',
      sent: 'status-sent',
      paid: 'status-paid',
      overdue: 'status-overdue'
    };
    
    return <span className={`status-badge ${statusClasses[status] || ''}`}>{status}</span>;
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true;
    return invoice.status === filter;
  });

  const getStats = () => {
    const stats = {
      total: invoices.length,
      draft: invoices.filter(i => i.status === 'draft').length,
      sent: invoices.filter(i => i.status === 'sent').length,
      paid: invoices.filter(i => i.status === 'paid').length,
      overdue: invoices.filter(i => i.status === 'overdue').length,
      totalAmount: invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0),
      paidAmount: invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, invoice) => sum + (invoice.total || 0), 0)
    };
    return stats;
  };

  const stats = getStats();

  if (loading) {
    return <div className="loading">Loading invoices...</div>;
  }

  return (
    <div className="invoice-list">
      <div className="invoice-list-header">
        <div className="header-top">
          <h2>My Invoices</h2>
          <div className="header-actions">
            <button 
              className="create-invoice-btn"
              onClick={() => onEditInvoice(null)}
            >
              + New Invoice
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Invoices</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Amount Due</span>
            <span className="stat-value">${(stats.totalAmount - stats.paidAmount).toFixed(2)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Amount Paid</span>
            <span className="stat-value paid">${stats.paidAmount.toFixed(2)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Paid Invoices</span>
            <span className="stat-value">{stats.paid}</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          <button 
            className={`filter-tab ${filter === 'draft' ? 'active' : ''}`}
            onClick={() => setFilter('draft')}
          >
            Draft ({stats.draft})
          </button>
          <button 
            className={`filter-tab ${filter === 'sent' ? 'active' : ''}`}
            onClick={() => setFilter('sent')}
          >
            Sent ({stats.sent})
          </button>
          <button 
            className={`filter-tab ${filter === 'paid' ? 'active' : ''}`}
            onClick={() => setFilter('paid')}
          >
            Paid ({stats.paid})
          </button>
          <button 
            className={`filter-tab ${filter === 'overdue' ? 'active' : ''}`}
            onClick={() => setFilter('overdue')}
          >
            Overdue ({stats.overdue})
          </button>
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="no-invoices">
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No invoices found</h3>
            <p>Create your first invoice to get started</p>
            <button 
              className="create-invoice-btn primary"
              onClick={() => onEditInvoice(null)}
            >
              Create Invoice
            </button>
          </div>
        </div>
      ) : (
        <div className="invoices-grid">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="invoice-card">
              <div className="invoice-header">
                <div className="invoice-number-status">
                  <h3>{invoice.invoiceNumber}</h3>
                  {getStatusBadge(invoice.status)}
                </div>
                <div className="invoice-total">
                  ${invoice.total?.toFixed(2)}
                </div>
              </div>
              
              <div className="invoice-client">
                <strong>{invoice.clientName}</strong>
                <p>{invoice.clientEmail}</p>
              </div>
              
              <div className="invoice-details">
                <div className="invoice-dates">
                  <div className="invoice-date">
                    <span className="label">Date:</span>
                    <span>{new Date(invoice.date).toLocaleDateString()}</span>
                  </div>
                  {invoice.dueDate && (
                    <div className="invoice-due-date">
                      <span className="label">Due:</span>
                      <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {invoice.paidDate && (
                    <div className="invoice-paid-date">
                      <span className="label">Paid:</span>
                      <span>{new Date(invoice.paidDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="invoice-actions">
                <button 
                  onClick={() => onViewInvoice(invoice)}
                  className="action-btn view-btn"
                  title="View Invoice"
                >
                  👁️ View
                </button>
                <button 
                  onClick={() => onEditInvoice(invoice)}
                  className="action-btn edit-btn"
                  title="Edit Invoice"
                  disabled={invoice.status === 'paid'}
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => sendEmail(invoice)}
                  className="action-btn send-btn"
                  disabled={sendingEmail === invoice.id || invoice.status === 'sent' || invoice.status === 'paid'}
                  title={invoice.status === 'paid' ? 'Cannot send paid invoice' : 'Send Email'}
                >
                  {sendingEmail === invoice.id ? '⏳ Sending...' : 
                   invoice.status === 'sent' ? '📨 Sent' : 
                   invoice.status === 'paid' ? '✅ Paid' : '📧 Send'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoiceList;