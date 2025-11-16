import { useState } from 'react';
import { invoiceService } from '../services/invoiceService';
import { useAuth } from '../hooks/useAuth';
import '../styles/AddInvoice.css';

const AddInvoice = ({ onInvoiceAdded, onCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    clientPhone: '',
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    items: [
      {
        description: '',
        quantity: 1,
        price: 0,
        total: 0
      }
    ],
    dueDate: '',
    issueDate: new Date().toISOString().split('T')[0],
    notes: '',
    terms: 'Payment due within 15 days. Late fees may apply.',
    taxRate: 0,
    discount: 0
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    
    if (field === 'quantity' || field === 'price') {
      value = field === 'quantity' ? parseInt(value) || 0 : parseFloat(value) || 0;
    }
    
    updatedItems[index][field] = value;
    
    // Recalculate item total
    if (field === 'quantity' || field === 'price') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].price;
    }
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { description: '', quantity: 1, price: 0, total: 0 }
      ]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * formData.discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    return (taxableAmount * formData.taxRate) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * formData.discount) / 100;
    const taxAmount = calculateTax();
    return subtotal - discountAmount + taxAmount;
  };

  const validateForm = () => {
    if (!formData.clientName.trim()) {
      alert('Client name is required');
      return false;
    }

    if (!formData.dueDate) {
      alert('Due date is required');
      return false;
    }

    if (formData.items.some(item => !item.description.trim() || item.quantity <= 0 || item.price < 0)) {
      alert('Please fill all item fields with valid values');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const invoiceData = {
        ...formData,
        subtotal: calculateSubtotal(),
        taxAmount: calculateTax(),
        totalAmount: calculateTotal(),
        discountAmount: (calculateSubtotal() * formData.discount) / 100,
        status: 'pending',
        createdAt: new Date().toISOString(),
        currency: 'USD'
      };

      const newInvoice = await invoiceService.createInvoice(invoiceData, user.uid);
      
      if (onInvoiceAdded) {
        onInvoiceAdded(newInvoice);
      }
      
      // Reset form
      setFormData({
        clientName: '',
        clientEmail: '',
        clientAddress: '',
        clientPhone: '',
        companyName: '',
        companyAddress: '',
        companyEmail: '',
        companyPhone: '',
        items: [{ description: '', quantity: 1, price: 0, total: 0 }],
        dueDate: '',
        issueDate: new Date().toISOString().split('T')[0],
        notes: '',
        terms: 'Payment due within 15 days. Late fees may apply.',
        taxRate: 0,
        discount: 0
      });

      alert('Invoice created successfully!');

    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateDueDate = (days = 15) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toISOString().split('T')[0];
  };

  return (
    <div className="add-invoice-container">
      <div className="add-invoice-header">
        <h2>Create New Invoice</h2>
        <p>Fill in the details below to create a new invoice</p>
      </div>

      <form onSubmit={handleSubmit} className="add-invoice-form">
        {/* Company Information */}
        <div className="form-section">
          <h3>Your Company Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Your company name"
              />
            </div>
            <div className="form-group">
              <label>Company Email</label>
              <input
                type="email"
                value={formData.companyEmail}
                onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                placeholder="company@example.com"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Company Address</label>
              <textarea
                value={formData.companyAddress}
                onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                placeholder="Your company address"
                rows="2"
              />
            </div>
            <div className="form-group">
              <label>Company Phone</label>
              <input
                type="tel"
                value={formData.companyPhone}
                onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="form-section">
          <h3>Client Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Client Name *</label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                required
                placeholder="Client's full name"
              />
            </div>
            <div className="form-group">
              <label>Client Email</label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Client Address</label>
              <textarea
                value={formData.clientAddress}
                onChange={(e) => handleInputChange('clientAddress', e.target.value)}
                placeholder="Client's address"
                rows="2"
              />
            </div>
            <div className="form-group">
              <label>Client Phone</label>
              <input
                type="tel"
                value={formData.clientPhone}
                onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                placeholder="+1 (555) 987-6543"
              />
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="form-section">
          <h3>Invoice Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Issue Date</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => handleInputChange('issueDate', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Due Date *</label>
              <div className="due-date-group">
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => handleInputChange('dueDate', generateDueDate(15))}
                  className="quick-date-btn"
                >
                  15 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('dueDate', generateDueDate(30))}
                  className="quick-date-btn"
                >
                  30 Days
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="form-section">
          <div className="section-header">
            <h3>Items & Services</h3>
            <button type="button" onClick={addItem} className="add-item-btn">
              + Add Item
            </button>
          </div>
          
          <div className="items-container">
            <div className="items-header">
              <span>Description</span>
              <span>Quantity</span>
              <span>Price</span>
              <span>Total</span>
              <span>Action</span>
            </div>
            
            {formData.items.map((item, index) => (
              <div key={index} className="item-row">
                <div className="form-group">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="Item description or service name"
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <div className="price-input">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    value={`$${(item.quantity * item.price).toFixed(2)}`}
                    disabled
                    className="total-display"
                  />
                </div>
                <div className="form-group">
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="remove-item-btn"
                      title="Remove item"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="form-section pricing-summary">
          <h3>Pricing Summary</h3>
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>${calculateSubtotal().toFixed(2)}</span>
          </div>
          
          <div className="summary-row">
            <div className="discount-group">
              <label>Discount:</label>
              <div className="discount-input">
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span>%</span>
              </div>
            </div>
            <span>-${((calculateSubtotal() * formData.discount) / 100).toFixed(2)}</span>
          </div>
          
          <div className="summary-row">
            <div className="tax-group">
              <label>Tax Rate:</label>
              <div className="tax-input">
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span>%</span>
              </div>
            </div>
            <span>+${calculateTax().toFixed(2)}</span>
          </div>
          
          <div className="summary-row total-row">
            <span>Total Amount:</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes for the client..."
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Terms & Conditions</label>
              <textarea
                value={formData.terms}
                onChange={(e) => handleInputChange('terms', e.target.value)}
                placeholder="Payment terms and conditions..."
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
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
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Creating Invoice...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddInvoice;