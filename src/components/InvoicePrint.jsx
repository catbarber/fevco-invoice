import React from 'react';
import '../styles/InvoicePrint.css';

const InvoicePrint = ({ invoice }) => {
  if (!invoice) return null;

  return (
    <div className="invoice-print" style={{ 
      padding: '2rem', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: '#2563eb', margin: 0 }}>INVOICE</h1>
          <p style={{ margin: '0.5rem 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {invoice.invoiceNumber}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0.25rem 0' }}>{invoice.userName}</p>
          <p style={{ margin: '0.25rem 0' }}>{invoice.userEmail}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ borderBottom: '2px solid #2563eb', paddingBottom: '0.5rem' }}>Bill To:</h3>
          <p style={{ fontWeight: 'bold' }}>{invoice.clientName}</p>
          <p>{invoice.clientEmail}</p>
          {invoice.clientAddress && (
            <p style={{ whiteSpace: 'pre-wrap' }}>{invoice.clientAddress}</p>
          )}
        </div>
        
        <div>
          <h3 style={{ borderBottom: '2px solid #2563eb', paddingBottom: '0.5rem' }}>Invoice Details:</h3>
          <p><strong>Issue Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
          <p>
            <strong>Status:</strong> 
            <span style={{ 
              color: invoice.status === 'paid' ? '#10b981' : '#f59e0b',
              fontWeight: 'bold',
              marginLeft: '0.5rem'
            }}>
              {invoice.status?.toUpperCase()}
            </span>
          </p>
        </div>
      </div>

      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        marginBottom: '2rem'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Description</th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Quantity</th>
            <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Price</th>
            <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item, index) => (
            <tr key={index}>
              <td style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>{item.description}</td>
              <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>{item.quantity}</td>
              <td style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>
                ${item.price.toFixed(2)}
              </td>
              <td style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>
                ${(item.quantity * item.price).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        marginBottom: '2rem'
      }}>
        <div style={{ width: '300px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <strong>Subtotal:</strong>
            <span>${invoice.total?.toFixed(2)}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <strong>Tax (0%):</strong>
            <span>$0.00</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '1rem',
            backgroundColor: '#2563eb',
            color: 'white',
            fontWeight: 'bold'
          }}>
            <strong>TOTAL:</strong>
            <span>${invoice.total?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div>
          <h3 style={{ borderBottom: '2px solid #2563eb', paddingBottom: '0.5rem' }}>Notes:</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
        </div>
      )}

      <div style={{ 
        marginTop: '3rem', 
        paddingTop: '2rem', 
        borderTop: '2px solid #e2e8f0',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
};

export default InvoicePrint;