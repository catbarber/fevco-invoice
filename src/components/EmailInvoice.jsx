// src/components/EmailInvoice.jsx
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config.js'; // Ensure .js extension
import { userCanSendEmails } from '../services/firestoreSetup';
import '../styles/EmailInvoice.css';

const EmailInvoice = ({ invoice, onClose, onSent }) => {
  const [formData, setFormData] = useState({
    clientEmail: invoice.clientEmail || '',
    subject: `Invoice #${invoice.invoiceNumber || invoice.id.slice(-8)} from ${invoice.clientName}`,
    message: `Dear ${invoice.clientName},\n\nPlease find your invoice attached. The payment is due by ${new Date(invoice.dueDate).toLocaleDateString()}.\n\nTotal Amount: $${invoice.total?.toFixed(2)}\n\nThank you for your business!\n\nBest regards,\n${invoice.companyName || 'Your Company'}`
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [canSendEmails, setCanSendEmails] = useState(true);

  useEffect(() => {
    checkEmailPermissions();
  }, [invoice.userId]);



  const checkEmailPermissions = async () => {
    try {
      const canSend = await userCanSendEmails(invoice.userId);
      setCanSendEmails(canSend);

      if (!canSend) {
        setError('You do not have permission to send emails. Please contact an administrator.');
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setError('Error checking email permissions.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSendEmails) {
      setError('You do not have permission to send emails.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const sendEmail = httpsCallable(functions, 'sendInvoiceEmail');
      const result = await sendEmail({
        invoiceId: invoice.id,
        clientEmail: formData.clientEmail,
        message: formData.message,
        subject: formData.subject
      });

      setSuccess(true);
      if (onSent) {
        onSent(result.data);
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
    } catch (error) {
      console.error('Error sending email:', error);

      // Better error messages
      let userMessage = error.message;

      if (error.message.includes('EAUTH') || error.message.includes('authentication')) {
        userMessage = 'Email service not configured properly. Please contact support.';
      } else if (error.message.includes('EENVELOPE') || error.message.includes('Invalid email')) {
        userMessage = 'Invalid email address. Please check the recipient email.';
      } else if (error.message.includes('permission-denied')) {
        userMessage = 'You do not have permission to send emails. Please contact an administrator.';
      } else if (error.message.includes('Invoice not found')) {
        userMessage = 'Invoice not found. Please try again.';
      }

      setError(userMessage);
    } finally {
      setSending(false);
    }
  };
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (success) {
    return (
      <div className="email-invoice-overlay">
        <div className="email-invoice success">
          <div className="success-icon">✓</div>
          <h3>Invoice Sent Successfully!</h3>
          <p>The invoice has been sent to {formData.clientEmail}</p>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="email-invoice-overlay">
      <div className="email-invoice">
        <div className="email-header">
          <h2>Send Invoice via Email</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        {!canSendEmails && (
          <div className="permission-warning">
            <h4>⚠️ Email Permissions Required</h4>
            <p>You don't have permission to send emails. Please contact an administrator to request email sending capabilities.</p>
          </div>
        )}

        <div className="invoice-preview">
          <h4>Invoice Preview</h4>
          <div className="preview-details">
            <p><strong>Invoice #:</strong> {invoice.invoiceNumber || invoice.id.slice(-8)}</p>
            <p><strong>Client:</strong> {invoice.clientName}</p>
            <p><strong>Amount:</strong> ${invoice.total?.toFixed(2)}</p>
            <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {invoice.status}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="email-form">
          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="clientEmail">Recipient Email *</label>
            <input
              type="email"
              id="clientEmail"
              name="clientEmail"
              value={formData.clientEmail}
              onChange={handleChange}
              required
              placeholder="client@example.com"
              disabled={!canSendEmails}
            />
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              disabled={!canSendEmails}
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message *</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows="8"
              placeholder="Add a personalized message for your client..."
              disabled={!canSendEmails}
            />
          </div>

          <div className="email-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={sending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={sending || !formData.clientEmail || !formData.message || !canSendEmails}
            >
              {sending ? (
                <>
                  <div className="spinner"></div>
                  Sending...
                </>
              ) : (
                'Send Invoice'
              )}
            </button>
          </div>
        </form>

        <div className="email-footer">
          <p>
            <small>
              The invoice will be sent as a beautifully formatted HTML email.
              {invoice.emailSent && ` Last sent: ${new Date(invoice.lastSent?.toDate()).toLocaleString()}`}
            </small>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailInvoice;