// src/components/InvoiceForm.jsx
import React, { useState, useEffect } from 'react';
import '../styles/InvoiceForm.css';

const InvoiceForm = ({ invoice, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    items: [{ description: '', quantity: 1, price: 0 }],
    dueDate: '',
    notes: ''
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        clientName: invoice.clientName || '',
        clientEmail: invoice.clientEmail || '',
        clientAddress: invoice.clientAddress || '',
        items: invoice.items || [{ description: '', quantity: 1, price: 0 }],
        dueDate: invoice.dueDate || '',
        notes: invoice.notes || ''
      });
    }
  }, [invoice]);

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    setFormData({ ...formData, items: updatedItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, price: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: updatedItems });
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      return total + (item.quantity * item.price);
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      total: calculateTotal(),
      updatedAt: new Date()
    });
  };

  return (
    <div className="invoice-form-overlay">
      <div className="invoice-form">
        <h2>{invoice ? 'Edit Invoice' : 'Create Invoice'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Client Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Client Name *</label>
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
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Client Address</label>
              <textarea
                value={formData.clientAddress}
                onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                rows="3"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Invoice Items</h3>
            {formData.items.map((item, index) => (
              <div key={index} className="invoice-item">
                <div className="item-row">
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Price</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  
                  <button
                    type="button"
                    className="remove-item-btn"
                    onClick={() => removeItem(index)}
                    disabled={formData.items.length === 1}
                  >
                    ×
                  </button>
                </div>
                <div className="item-total">
                  Total: ${(item.quantity * item.price).toFixed(2)}
                </div>
              </div>
            ))}
            
            <button type="button" className="add-item-btn" onClick={addItem}>
              + Add Item
            </button>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              
              <div className="total-display">
                <strong>Grand Total: ${calculateTotal().toFixed(2)}</strong>
              </div>
            </div>
            
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                placeholder="Additional notes or terms..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {invoice ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;