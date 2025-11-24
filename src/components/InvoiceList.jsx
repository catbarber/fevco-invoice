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

  if (loading) {
    return <div className="loading">Loading invoices...</div>;
  }

  return (
    <div className="invoice-list">
      <div className="invoice-list-header">
        <h2>My Invoices</h2>
        {invoices.length === 0 && (
          <p className="no-invoices">No invoices yet. Create your first invoice!</p>
        )}
      </div>

      <div className="invoices-grid">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="invoice-card">
            <div className="invoice-header">
              <h3>{invoice.invoiceNumber}</h3>
              {getStatusBadge(invoice.status)}
            </div>
            
            <div className="invoice-client">
              <strong>{invoice.clientName}</strong>
              <p>{invoice.clientEmail}</p>
            </div>
            
            <div className="invoice-details">
              <div className="invoice-date">
                Date: {new Date(invoice.date).toLocaleDateString()}
              </div>
              <div className="invoice-total">
                Total: ${invoice.total?.toFixed(2)}
              </div>
            </div>
            
            <div className="invoice-actions">
              <button 
                onClick={() => onViewInvoice(invoice)}
                className="action-btn view-btn"
              >
                View
              </button>
              <button 
                onClick={() => onEditInvoice(invoice)}
                className="action-btn edit-btn"
              >
                Edit
              </button>
              <button 
                onClick={() => sendEmail(invoice)}
                className="action-btn send-btn"
                disabled={sendingEmail === invoice.id || invoice.status === 'sent'}
              >
                {sendingEmail === invoice.id ? 'Sending...' : 
                 invoice.status === 'sent' ? 'Sent' : 'Send Email'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceList;