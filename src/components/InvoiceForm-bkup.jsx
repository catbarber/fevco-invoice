// src/components/InvoiceForm.jsx
import React, { useState, useEffect } from 'react';
import { useAuthWithAdmin } from '../hooks/useAuthWithAdmin';
import '../styles/InvoiceForm.css';

const InvoiceForm = ({ invoice, onSubmit, onCancel }) => {
  const { user } = useAuthWithAdmin();
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    clientPhone: '',
    companyName: user?.displayName || '',
    companyEmail: user?.email || '',
    companyAddress: '',
    companyPhone: '',
    items: [{ id: Date.now(), description: '', quantity: 1, price: 0, tax: 0 }],
    dueDate: getDefaultDueDate(),
    issueDate: new Date().toISOString().split('T')[0],
    notes: '',
    terms: 'Payment due within 15 days. Late fees may apply.',
    taxRate: 0,
    discount: 0,
    currency: 'USD'
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (invoice) {
      setFormData({
        invoiceNumber: invoice.invoiceNumber || generateInvoiceNumber(),
        clientName: invoice.clientName || '',
        clientEmail: invoice.clientEmail || '',
        clientAddress: invoice.clientAddress || '',
        clientPhone: invoice.clientPhone || '',
        companyName: invoice.companyName || user?.displayName || '',
        companyEmail: invoice.companyEmail || user?.email || '',
        companyAddress: invoice.companyAddress || '',
        companyPhone: invoice.companyPhone || '',
        items: invoice.items?.map(item => ({ ...item, id: item.id || Date.now() + Math.random() })) || [{ id: Date.now(), description: '', quantity: 1, price: 0, tax: 0 }],
        dueDate: invoice.dueDate || getDefaultDueDate(),
        issueDate: invoice.issueDate || new Date().toISOString().split('T')[0],
        notes: invoice.notes || '',
        terms: invoice.terms || 'Payment due within 15 days. Late fees may apply.',
        taxRate: invoice.taxRate || 0,
        discount: invoice.discount || 0,
        currency: invoice.currency || 'USD'
      });
    } else {
      setFormData(prev => ({
        ...prev,
        invoiceNumber: generateInvoiceNumber()
      }));
    }
  }, [invoice, user]);

  function generateInvoiceNumber() {
    return `INV-${Date.now().toString().slice(-6)}`;
  }

  function getDefaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().split('T')[0];
  }

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'clientEmail':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.clientEmail = 'Please enter a valid email address';
        } else {
          delete newErrors.clientEmail;
        }
        break;
      case 'clientName':
        if (!value.trim()) {
          newErrors.clientName = 'Client name is required';
        } else {
          delete newErrors.clientName;
        }
        break;
      case 'items':
        const itemErrors = value.map((item, index) => {
          if (!item.description.trim()) {
            return `Item ${index + 1} description is required`;
          }
          if (item.quantity <= 0) {
            return `Item ${index + 1} quantity must be greater than 0`;
          }
          if (item.price < 0) {
            return `Item ${index + 1} price cannot be negative`;
          }
          return null;
        }).filter(error => error);

        if (itemErrors.length > 0) {
          newErrors.items = itemErrors;
        } else {
          delete newErrors.items;
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = field === 'description' ? value :
      field === 'quantity' ? Math.max(0, parseInt(value) || 0) :
        Math.max(0, parseFloat(value) || 0);

    setFormData(prev => ({ ...prev, items: updatedItems }));

    if (touched.items) {
      validateField('items', updatedItems);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        id: Date.now() + Math.random(),
        description: '',
        quantity: 1,
        price: 0,
        tax: 0
      }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: updatedItems }));

      if (touched.items) {
        validateField('items', updatedItems);
      }
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((total, item) => {
      return total + (item.quantity * item.price);
    }, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = subtotal * (formData.discount / 100);
    return (subtotal - discountAmount) * (formData.taxRate / 100);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = subtotal * (formData.discount / 100);
    const taxAmount = calculateTax();
    return subtotal - discountAmount + taxAmount;
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form data on submit:', formData); // For debugging
    // Validate all fields
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    const isItemsValid = validateField('items', formData.items);
    const isClientNameValid = validateField('clientName', formData.clientName);
    const isClientEmailValid = !formData.clientEmail || validateField('clientEmail', formData.clientEmail);

    if (!isItemsValid || !isClientNameValid || !isClientEmailValid) {
      return;
    }

    // Prepare the data to submit - only include form fields, not calculated values
    const submitData = {
      ...formData,
      // Include calculated totals if needed, but they might be better computed in Cloud Functions
      subtotal: calculateSubtotal(),
      taxAmount: calculateTax(),
      total: calculateTotal(),
      // Ensure status is included
      status: invoice?.status || 'pending'
    };

    // Remove any undefined values
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === undefined) {
        delete submitData[key];
      }
    });

   
    onSubmit(submitData);
  };


  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="invoice-form-overlay">
      <div className="invoice-form">
        <div className="form-header">
          <h2>{invoice ? 'Edit Invoice' : 'Create New Invoice'}</h2>
          <button onClick={onCancel} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit} className="invoice-form-content">
          {/* Company Information */}
          <div className="form-section">
            <h3>📋 Your Company Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('companyName')}
                  required
                />
              </div>
              <div className="form-group">
                <label>Company Email</label>
                <input
                  type="email"
                  name="companyEmail"
                  value={formData.companyEmail}
                  onChange={handleChange}
                  onBlur={() => handleBlur('companyEmail')}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Company Address</label>
                <textarea
                  name="companyAddress"
                  value={formData.companyAddress}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Your company address"
                />
              </div>
              <div className="form-group">
                <label>Company Phone</label>
                <input
                  type="tel"
                  name="companyPhone"
                  value={formData.companyPhone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="form-section">
            <h3>👤 Client Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Client Name *</label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('clientName')}
                  required
                  className={touched.clientName && errors.clientName ? 'error' : ''}
                />
                {touched.clientName && errors.clientName && (
                  <span className="error-text">{errors.clientName}</span>
                )}
              </div>
              <div className="form-group">
                <label>Client Email</label>
                <input
                  type="email"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  onBlur={() => handleBlur('clientEmail')}
                  className={touched.clientEmail && errors.clientEmail ? 'error' : ''}
                />
                {touched.clientEmail && errors.clientEmail && (
                  <span className="error-text">{errors.clientEmail}</span>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Client Address</label>
                <textarea
                  name="clientAddress"
                  value={formData.clientAddress}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Client's address"
                />
              </div>
              <div className="form-group">
                <label>Client Phone</label>
                <input
                  type="tel"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="form-section">
            <h3>📄 Invoice Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Invoice Number</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Issue Date</label>
                <input
                  type="date"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="form-section">
            <h3>🛒 Items & Services</h3>
            {formData.items.map((item, index) => (
              <div key={item.id} className="invoice-item">
                <div className="item-header">
                  <span>Item #{index + 1}</span>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => removeItem(index)}
                      title="Remove item"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="item-row">
                  <div className="form-group">
                    <label>Description *</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      onBlur={() => handleBlur('items')}
                      placeholder="Item or service description"
                      className={touched.items && errors.items?.[index] ? 'error' : ''}
                    />
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      min="1"
                      step="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit Price</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Tax (%)</label>
                    <input
                      type="number"
                      value={item.tax}
                      onChange={(e) => handleItemChange(index, 'tax', e.target.value)}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                </div>
                <div className="item-total">
                  Total: {formData.currency === 'USD' ? '$' :
                    formData.currency === 'EUR' ? '€' :
                      formData.currency === 'GBP' ? '£' : 'C$'}
                  {(item.quantity * item.price).toFixed(2)}
                  {item.tax > 0 && ` (incl. ${item.tax}% tax)`}
                </div>
                {touched.items && errors.items?.[index] && (
                  <span className="error-text">{errors.items[index]}</span>
                )}
              </div>
            ))}

            <button type="button" className="add-item-btn" onClick={addItem}>
              + Add Another Item
            </button>
          </div>

          {/* Totals & Additional Info */}
          <div className="form-section">
            <h3>💰 Totals & Additional Information</h3>
            <div className="totals-grid">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>
                  {formData.currency === 'USD' ? '$' :
                    formData.currency === 'EUR' ? '€' :
                      formData.currency === 'GBP' ? '£' : 'C$'}
                  {calculateSubtotal().toFixed(2)}
                </span>
              </div>

              <div className="total-row">
                <div className="form-group inline">
                  <label>Discount (%)</label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    style={{ width: '80px' }}
                  />
                </div>
                <span className="discount-amount">
                  -{formData.currency === 'USD' ? '$' :
                    formData.currency === 'EUR' ? '€' :
                      formData.currency === 'GBP' ? '£' : 'C$'}
                  {(calculateSubtotal() * (formData.discount / 100)).toFixed(2)}
                </span>
              </div>

              <div className="total-row">
                <div className="form-group inline">
                  <label>Tax Rate (%)</label>
                  <input
                    type="number"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    style={{ width: '80px' }}
                  />
                </div>
                <span className="tax-amount">
                  {formData.currency === 'USD' ? '$' :
                    formData.currency === 'EUR' ? '€' :
                      formData.currency === 'GBP' ? '£' : 'C$'}
                  {calculateTax().toFixed(2)}
                </span>
              </div>

              <div className="total-row grand-total">
                <span>Grand Total:</span>
                <span>
                  {formData.currency === 'USD' ? '$' :
                    formData.currency === 'EUR' ? '€' :
                      formData.currency === 'GBP' ? '£' : 'C$'}
                  {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Additional notes for the client..."
                />
              </div>
              <div className="form-group">
                <label>Terms & Conditions</label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Payment terms and conditions..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={hasErrors}
            >
              {invoice ? 'Update Invoice' : 'Create Invoice'}
              {hasErrors && ' (Please fix errors)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;