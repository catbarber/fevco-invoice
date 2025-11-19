// src/components/InvoiceList.jsx
import React, { useState, useMemo } from 'react';
import EmailInvoice from './EmailInvoice';
import '../styles/InvoiceList.css';

const InvoiceList = ({ invoices, onEdit, onDelete, onStatusChange }) => {
  const [emailInvoice, setEmailInvoice] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices;

    // Apply filter
    if (filter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filter);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.clientName.toLowerCase().includes(term) ||
        invoice.clientEmail.toLowerCase().includes(term) ||
        invoice.invoiceNumber.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt?.toDate()) - new Date(a.createdAt?.toDate());
        case 'oldest':
          return new Date(a.createdAt?.toDate()) - new Date(b.createdAt?.toDate());
        case 'amount-high':
          return b.total - a.total;
        case 'amount-low':
          return a.total - b.total;
        case 'due-date':
          return new Date(a.dueDate) - new Date(b.dueDate);
        default:
          return 0;
      }
    });

    return filtered;
  }, [invoices, filter, sortBy, searchTerm]);

  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const pending = invoices.filter(i => i.status === 'pending').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;
    const totalAmount = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const pendingAmount = invoices
      .filter(i => i.status === 'pending' || i.status === 'overdue')
      .reduce((sum, invoice) => sum + (invoice.total || 0), 0);

    return { total, paid, pending, overdue, totalAmount, pendingAmount };
  }, [invoices]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount, currency = 'USD') => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    });
    return formatter.format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: { class: 'status-paid', label: 'Paid', icon: '✓' },
      pending: { class: 'status-pending', label: 'Pending', icon: '⏳' },
      overdue: { class: 'status-overdue', label: 'Overdue', icon: '⚠️' },
      draft: { class: 'status-draft', label: 'Draft', icon: '📝' },
      sent: { class: 'status-sent', label: 'Sent', icon: '📧' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`status-badge ${config.class}`} title={config.label}>
        {config.icon} {config.label}
      </span>
    );
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && dueDate;
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    if (onStatusChange) {
      await onStatusChange(invoiceId, newStatus);
    }
  };

  const handleEmailSent = () => {
    // Optional: Refresh data or show notification
    console.log('Email sent successfully');
  };

  if (invoices.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📄</div>
        <h3>No invoices yet</h3>
        <p>Create your first invoice to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="invoice-list-container">
        {/* Stats Overview */}
        <div className="invoice-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total Invoices</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-number">{formatCurrency(stats.totalAmount)}</span>
              <span className="stat-label">Total Amount</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <span className="stat-number">{stats.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-info">
              <span className="stat-number">{stats.overdue}</span>
              <span className="stat-label">Overdue</span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="list-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="filter-controls">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="draft">Draft</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Amount (High to Low)</option>
              <option value="amount-low">Amount (Low to High)</option>
              <option value="due-date">Due Date</option>
            </select>
          </div>
        </div>

        {/* Invoices Grid */}
        <div className="invoice-grid">
          {filteredAndSortedInvoices.map((invoice) => (
            <div key={invoice.id} className="invoice-card">
              <div className="invoice-header">
                <div className="invoice-title">
                  <h3>{invoice.clientName}</h3>
                  <span className="invoice-number">{invoice.invoiceNumber}</span>
                </div>
                <div className="invoice-status">
                  {getStatusBadge(invoice.status)}
                  {invoice.emailSent && (
                    <span className="email-sent-indicator" title="Email sent">
                      📧
                    </span>
                  )}
                  {isOverdue(invoice.dueDate) && invoice.status !== 'paid' && (
                    <span className="overdue-indicator" title="Overdue">
                      ⚠️
                    </span>
                  )}
                </div>
              </div>
              
              <div className="invoice-details">
                <div className="detail-row">
                  <span className="detail-label">Amount:</span>
                  <span className="invoice-total">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Due Date:</span>
                  <span className={`due-date ${isOverdue(invoice.dueDate) ? 'overdue' : ''}`}>
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Client Email:</span>
                  <span className="client-email">{invoice.clientEmail || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span>{formatDate(invoice.createdAt?.toDate())}</span>
                </div>
                {invoice.lastSent && (
                  <div className="detail-row">
                    <span className="detail-label">Last Sent:</span>
                    <span>{formatDate(invoice.lastSent?.toDate())}</span>
                  </div>
                )}
              </div>

              <div className="invoice-actions">
                {invoice.clientEmail && (
                  <button 
                    className="btn-email"
                    onClick={() => setEmailInvoice(invoice)}
                    title="Send via email"
                  >
                    📧 Email
                  </button>
                )}
                <select 
                  value={invoice.status} 
                  onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                  className="status-select"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
                <button 
                  className="btn-edit"
                  onClick={() => onEdit(invoice)}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn-delete"
                  onClick={() => onDelete(invoice.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredAndSortedInvoices.length === 0 && (
          <div className="no-results">
            <p>No invoices found matching your criteria.</p>
          </div>
        )}
      </div>

      {emailInvoice && (
        <EmailInvoice
          invoice={emailInvoice}
          onClose={() => setEmailInvoice(null)}
          onSent={handleEmailSent}
        />
      )}
    </>
  );
};

export default InvoiceList;