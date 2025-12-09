import React from 'react';
import '../styles/InvoicePreview.css';

const InvoicePreview = ({ invoice, onClose, onMarkAsPaid }) => {
  const calculateTotal = () => {
    return invoice.items.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="invoice-preview-container">
      <div className="preview-header">
        <h2>Invoice Preview</h2>
        <div className="preview-actions">
          <button className="print-btn" onClick={() => window.print()}>
            🖨️ Print
          </button>
          <button className="download-btn">
            📥 Download PDF
          </button>
          {invoice.status !== 'paid' && (
            <button className="mark-paid-btn" onClick={onMarkAsPaid}>
              ✅ Mark as Paid
            </button>
          )}
          <button className="close-btn" onClick={onClose}>
            × Close
          </button>
        </div>
      </div>

      <div className="invoice-preview">
        <div className="invoice-header">
          <div className="company-info">
            <h1>Simply Invoicing</h1>
            <p>Your Professional Invoice</p>
          </div>
          <div className="invoice-meta">
            <div className="invoice-number">
              <strong>INVOICE #:</strong> {invoice.invoiceNumber}
            </div>
            <div className="invoice-date">
              <strong>DATE:</strong> {formatDate(invoice.date)}
            </div>
            {invoice.dueDate && (
              <div className="invoice-due-date">
                <strong>DUE DATE:</strong> {formatDate(invoice.dueDate)}
              </div>
            )}
            <div className={`invoice-status-badge ${invoice.status}`}>
              {invoice.status.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="invoice-parties">
          <div className="from-section">
            <h3>From</h3>
            <div className="address-box">
              <strong>Simply Invoicing</strong>
              <p>123 Business Street</p>
              <p>City, State 12345</p>
              <p>contact@simplyinvoicing.com</p>
            </div>
          </div>
          <div className="to-section">
            <h3>Bill To</h3>
            <div className="address-box">
              <strong>{invoice.clientName}</strong>
              <p>{invoice.clientEmail}</p>
              <p>{invoice.clientAddress}</p>
            </div>
          </div>
        </div>

        <div className="invoice-items">
          <table className="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan="3" className="total-label">TOTAL</td>
                <td className="total-amount">${calculateTotal().toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
          <div className="payment-history">
            <h3>Payment History</h3>
            {invoice.paymentHistory.map((payment, index) => (
              <div key={index} className="payment-record">
                <span>{formatDate(payment.date)}</span>
                <span>${payment.amount.toFixed(2)}</span>
                <span>{payment.paymentMethod.replace('_', ' ').toUpperCase()}</span>
                {payment.transactionId && (
                  <span>Ref: {payment.transactionId}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {invoice.notes && (
          <div className="invoice-notes">
            <h3>Notes</h3>
            <p>{invoice.notes}</p>
          </div>
        )}

        <div className="invoice-footer">
          <div className="footer-message">
            <p>Thank you for your business!</p>
            <p>Please make payment within 30 days of receiving this invoice.</p>
          </div>
          <div className="footer-contact">
            <p>Simply Invoicing</p>
            <p>contact@simplyinvoicing.com</p>
            <p>www.simplyinvoicing.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;