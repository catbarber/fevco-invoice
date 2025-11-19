// src/pages/InvoiceDetails.jsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';

const InvoiceDetails = () => {
  const { invoiceId } = useParams();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Invoice Details</h1>
        <Link to="/dashboard" className="btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>
      <div className="page-content">
        <p>Invoice ID: {invoiceId}</p>
        {/* Add invoice details implementation */}
      </div>
    </div>
  );
};

export default InvoiceDetails;