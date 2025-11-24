import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import '../styles/InvoiceForm.css';

const InvoiceForm = ({ invoice, onSave, onCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [{ description: '', quantity: 1, price: 0 }],
    notes: ''
  });

  useEffect(() => {
    if (invoice) {
      setFormData(invoice);
    } else {
      // Generate invoice number
      setFormData(prev => ({
        ...prev,
        invoiceNumber: `INV-${Date.now()}`
      }));
    }
  }, [invoice]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
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
      alert('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invoice-form-container">
      <form onSubmit={handleSubmit} className="invoice-form">
        <div className="form-section">
          <h2>{invoice ? 'Edit Invoice' : 'Create New Invoice'}</h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                required
              />
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
                onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Client Email</label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group full-width">
              <label>Client Address</label>
              <textarea
                value={formData.clientAddress}
                onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
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
              />
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                min="1"
                className="item-quantity"
              />
              <input
                type="number"
                placeholder="Price"
                value={item.price}
                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                step="0.01"
                min="0"
                className="item-price"
              />
              <span className="item-total">
                ${(item.quantity * item.price).toFixed(2)}
              </span>
              {formData.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="remove-item-btn"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          
          <button type="button" onClick={addItem} className="add-item-btn">
            + Add Item
          </button>
          
          <div className="total-section">
            <strong>Total: ${calculateTotal().toFixed(2)}</strong>
          </div>
        </div>

        <div className="form-section">
          <div className="form-group full-width">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="3"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="save-btn">
            {loading ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;