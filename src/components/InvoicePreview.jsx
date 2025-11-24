import { useRef } from 'react';
import '../styles/InvoicePreview.css';

const InvoicePreview = ({ invoice, onClose }) => {
  const invoiceRef = useRef();

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .total-section { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
            @media print { 
              button { display: none; } 
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.afterprint = () => printWindow.close();
  };

  return (
    <div className="invoice-preview">
      <div className="preview-actions">
        <button onClick={handlePrint} className="print-btn">
          Print Invoice
        </button>
        <button onClick={onClose} className="close-btn">
          Close
        </button>
      </div>
      
      <div ref={invoiceRef} className="invoice-container">
        <div className="invoice-header">
          <h1>INVOICE</h1>
          <div className="invoice-meta">
            <div><strong>Invoice Number:</strong> {invoice.invoiceNumber}</div>
            <div><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString()}</div>
            {invoice.dueDate && (
              <div><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</div>
            )}
          </div>
        </div>

        <div className="details-grid">
          <div className="from-details">
            <h3>From:</h3>
            <p>Your Company Name</p>
            <p>Your Address</p>
            <p>Your Email</p>
          </div>
          
          <div className="to-details">
            <h3>To:</h3>
            <p>{invoice.clientName}</p>
            <p>{invoice.clientEmail}</p>
            <p>{invoice.clientAddress}</p>
          </div>
        </div>

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
        </table>

        <div className="total-section">
          <div className="total-amount">
            Total: ${invoice.total?.toFixed(2)}
          </div>
        </div>

        {invoice.notes && (
          <div className="notes-section">
            <h3>Notes:</h3>
            <p>{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePreview;