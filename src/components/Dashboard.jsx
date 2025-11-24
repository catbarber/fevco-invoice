import { useState } from 'react';
import Header from './Header';
import InvoiceForm from './InvoiceForm';
import InvoiceList from './InvoiceList';
import InvoicePreview from './InvoicePreview';
import Admin from './Admin';
import { useAdmin } from '../context/AdminContext';
import AdComponent from './AdComponent/AdComponent';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [activeView, setActiveView] = useState('list');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { isAdmin, loading: adminLoading } = useAdmin();

  // Don't show admin tab while loading
  if (adminLoading) {
    return (
      <div className="dashboard">
        <Header />
        <div className="dashboard-loading">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header />
      <nav className="dashboard-nav">
        <button 
          className={`nav-btn ${activeView === 'list' ? 'active' : ''}`}
          onClick={() => setActiveView('list')}
        >
          Invoices
        </button>
        <button 
          className={`nav-btn ${activeView === 'create' ? 'active' : ''}`}
          onClick={() => setActiveView('create')}
        >
          Create Invoice
        </button>
        {isAdmin && (
          <button 
            className={`nav-btn ${activeView === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveView('admin')}
          >
            Admin
          </button>
        )}
      </nav>
      
      <main className="dashboard-main">
        {activeView === 'list' && (
          <InvoiceList 
            onViewInvoice={setSelectedInvoice}
            onEditInvoice={(invoice) => {
              setSelectedInvoice(invoice);
              setActiveView('create');
            }}
          />
        )}
        {activeView === 'create' && (
          <InvoiceForm 
            invoice={selectedInvoice}
            onSave={() => {
              setSelectedInvoice(null);
              setActiveView('list');
            }}
            onCancel={() => {
              setSelectedInvoice(null);
              setActiveView('list');
            }}
          />
        )}
        {selectedInvoice && activeView === 'preview' && (
          <InvoicePreview 
            invoice={selectedInvoice}
            onClose={() => {
              setSelectedInvoice(null);
              setActiveView('list');
            }}
          />
        )}
        {activeView === 'admin' && <Admin />}
      </main>

      <div style={{width:"40%", display:"flex", justifyContent:"center", alignContent:"center", margin:"2rem auto"  }}>
        <AdComponent />
      </div>
    </div>
  );
};

export default Dashboard;