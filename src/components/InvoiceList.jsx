// src/components/InvoiceList.jsx
import React from 'react';
import '../styles/InvoiceList.css';

const InvoiceList = ({ invoices, onEdit, onDelete }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const statusClass = {
      paid: 'status-paid',
      pending: 'status-pending',
      overdue: 'status-overdue'
    }[status] || 'status-pending';
    
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  if (invoices.length === 0) {
    return (
      <div className="empty-state">
        <h3>No invoices yet</h3>
        <p>Create your first invoice to get started</p>
      </div>
    );
  }

  return (
    <div className="invoice-list">
      <div className="invoice-grid">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="invoice-card">
            <div className="invoice-header">
              <h3>{invoice.clientName}</h3>
              {getStatusBadge(invoice.status)}
            </div>
            
            <div className="invoice-details">
              <div className="detail-row">
                <span>Email:</span>
                <span>{invoice.clientEmail || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span>Due Date:</span>
                <span>{invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span>Total:</span>
                <span className="invoice-total">${invoice.total?.toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span>Created:</span>
                <span>{formatDate(invoice.createdAt?.toDate())}</span>
              </div>
            </div>

            <div className="invoice-actions">
              <button 
                className="btn-edit"
                onClick={() => onEdit(invoice)}
              >
                Edit
              </button>
              <button 
                className="btn-delete"
                onClick={() => onDelete(invoice.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceList;