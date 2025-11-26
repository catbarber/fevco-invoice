import { useState } from 'react';
import Header from './Header';
import InvoiceForm from './InvoiceForm';
import InvoiceList from './InvoiceList';
import InvoicePreview from './InvoicePreview';
import Admin from './Admin';
import Profile from './Profile';
import { useAdmin } from '../context/AdminContext';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [activeView, setActiveView] = useState('list');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { isAdmin, loading: adminLoading } = useAdmin();

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
          📄 Invoices
        </button>
        <button 
          className={`nav-btn ${activeView === 'create' ? 'active' : ''}`}
          onClick={() => setActiveView('create')}
        >
          ➕ Create Invoice
        </button>
        <button 
          className={`nav-btn ${activeView === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveView('profile')}
        >
          👤 Profile
        </button>
        {isAdmin && (
          <button 
            className={`nav-btn ${activeView === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveView('admin')}
          >
            ⚙️ Admin
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
        {activeView === 'profile' && <Profile />}
        {activeView === 'admin' && <Admin />}
      </main>
    </div>
  );
};

export default Dashboard;