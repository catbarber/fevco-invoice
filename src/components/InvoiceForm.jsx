import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import '../styles/InvoiceForm.css';

const InvoiceForm = ({ invoice, onSave, onCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    transactionId: '',
    notes: ''
  });

  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [{ description: '', quantity: 1, price: 0 }],
    notes: '',
    status: 'draft',
    paymentHistory: []
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        ...invoice,
        date: invoice.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate?.split('T')[0] || ''
      });
    } else {
      setFormData(prev => ({
        ...prev,
        invoiceNumber: generateInvoiceNumber(),
        status: 'draft'
      }));
    }
  }, [invoice]);

  const generateInvoiceNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${timestamp}-${random}`;
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'quantity' || field === 'price' ?
      parseFloat(value) || 0 : value;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, price: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      return total + (item.quantity * item.price);
    }, 0);
  };

  const checkInvoiceLimit = async () => {
    try {
      const checkInvoiceCreation = httpsCallable(functions, 'checkInvoiceCreation');
      const result = await checkInvoiceCreation();

      if (!result.data.canCreate) {
        throw new Error(`You have reached your monthly invoice limit (${result.data.limit}). Please upgrade your plan to create more invoices.`);
      }

      return true;
    } catch (error) {
      console.error('Error checking invoice limit:', error);
      throw error;
    }
  };

  const handleMarkAsPaid = () => {
    setPaymentData({
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      transactionId: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    try {
      const newPayment = {
        ...paymentData,
        amount: calculateTotal(),
        date: new Date().toISOString()
      };

      const updatedInvoice = {
        ...formData,
        status: 'paid',
        paidDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId,
        paymentHistory: [...(formData.paymentHistory || []), newPayment]
      };

      await updateDoc(doc(db, 'invoices', invoice.id), updatedInvoice);
      setShowPaymentModal(false);
      onSave();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert('Failed to mark invoice as paid: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Only check invoice limit when creating new invoices
      if (!invoice) {
        setCheckingLimit(true);
        await checkInvoiceLimit();
        setCheckingLimit(false);
      }

      const invoiceData = {
        ...formData,
        total: calculateTotal(),
        status: invoice?.status || 'draft',
        userId: user.uid,
        createdAt: invoice?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (invoice) {
        await updateDoc(doc(db, 'invoices', invoice.id), invoiceData);
      } else {
        await addDoc(collection(db, 'invoices'), invoiceData);
      }

      onSave();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert(error.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
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

  return (
    <div className="invoice-form-container">
      <form onSubmit={handleSubmit} className="invoice-form">
        <div className="form-header">
          <h2>{invoice ? 'Edit Invoice' : 'Create New Invoice'}</h2>
          {invoice && (
            <div className="invoice-status-section">
              <div className="status-info">
                <span>Current Status:</span>
                {getStatusBadge(formData.status)}
              </div>
              {formData.status !== 'paid' && (
                <button
                  type="button"
                  onClick={handleMarkAsPaid}
                  className="mark-paid-btn"
                >
                  Mark as Paid
                </button>
              )}
              {formData.paidDate && (
                <div className="paid-info">
                  <span>Paid on: {new Date(formData.paidDate).toLocaleDateString()}</span>
                  {formData.paymentMethod && (
                    <span>via {formData.paymentMethod.replace('_', ' ').toUpperCase()}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>Invoice Details</h3>
          {!invoice && (
            <div className="limit-info">
              <p>
                {checkingLimit
                  ? 'Checking your invoice limit...'
                  : 'You can create invoices within your monthly limit'
                }
              </p>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                required
                disabled={invoice}
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={invoice && formData.status === 'paid'}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="overdue">Overdue</option>
                <option value="paid" disabled={!invoice}>Paid (use Mark as Paid button)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Client Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Client Name</label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Client Email</label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Client Address</label>
              <textarea
                value={formData.clientAddress}
                onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                rows="3"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Items</h3>
          {formData.items.map((item, index) => (
            <div key={index} className="item-row">
              <input
                type="text"
                placeholder="Description"
                value={item.description}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                className="item-description"
                required
              />
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                min="1"
                step="0.01"
                className="item-quantity"
                required
              />
              <input
                type="number"
                placeholder="Price"
                value={item.price}
                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                step="0.01"
                min="0"
                className="item-price"
                required
              />
              <span className="item-total">
                ${(item.quantity * item.price).toFixed(2)}
              </span>
              {formData.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="remove-item-btn"
                  disabled={loading}
                >
                  ×
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="add-item-btn"
            disabled={loading}
          >
            + Add Item
          </button>

          <div className="total-section">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            <div className="total-row grand-total">
              <strong>Total:</strong>
              <strong>${calculateTotal().toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-group full-width">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || checkingLimit}
            className="save-btn"
          >
            {loading ? 'Saving...' :
              checkingLimit ? 'Checking Limit...' :
                invoice ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="modal-header">
              <h3>Mark Invoice as Paid</h3>
              <button
                className="close-modal"
                onClick={() => setShowPaymentModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="payment-summary">
                <p>Invoice: <strong>{formData.invoiceNumber}</strong></p>
                <p>Client: <strong>{formData.clientName}</strong></p>
                <p>Amount: <strong>${calculateTotal().toFixed(2)}</strong></p>
              </div>

              <div className="form-group">
                <label>Payment Date</label>
                <input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({...paymentData, paymentDate: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                  required
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="paypal">PayPal</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Transaction/Reference ID</label>
                <input
                  type="text"
                  value={paymentData.transactionId}
                  onChange={(e) => setPaymentData({...paymentData, transactionId: e.target.value})}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>Payment Notes</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  rows="2"
                  placeholder="Additional payment details..."
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePaymentSubmit}
                  className="confirm-btn"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;