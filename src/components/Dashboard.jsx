import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Header from './Header';
import InvoiceForm from './InvoiceForm';
import InvoiceList from './InvoiceList';
import InvoicePreview from './InvoicePreview';
import Admin from './Admin';
import Profile from './Profile';
import AdComponent from './AdComponent/AdComponent';
import { useAdmin } from '../context/AdminContext';
import Clients from './Clients';
import Help from './Help';
import Settings from './Settings'; // You'll need to create this
import '../styles/Dashboard.css';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user } = useAuth();

  // Get active view from route
  const getActiveViewFromRoute = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'dashboard';
    if (path === '/invoices') return 'invoices';
    if (path === '/create-invoice') return 'create-invoice';
    if (path === '/profile') return 'profile';
    if (path === '/admin') return 'admin';
    if (path === '/clients') return 'clients';
    if (path === '/settings') return 'settings';
    if (path === '/billing') return 'billing';
    if (path === '/help') return 'help';
    if (path.startsWith('/invoice/')) return 'invoice-preview';
    return 'dashboard';
  };

  const [activeView, setActiveView] = useState(getActiveViewFromRoute());

  // Update active view when route changes
  useEffect(() => {
    setActiveView(getActiveViewFromRoute());

    // Extract invoice ID from URL if previewing
    if (location.pathname.startsWith('/invoice/')) {
      const invoiceId = location.pathname.split('/invoice/')[1];
      // Here you would fetch the invoice data based on ID
      setSelectedInvoice({ id: invoiceId, title: `Invoice ${invoiceId}` });
      setShowInvoicePreview(true);
    } else {
      setShowInvoicePreview(false);
    }
  }, [location.pathname]);

  // Handle invoice view
  const handleViewInvoice = useCallback((invoice) => {
    navigate(`/invoice/${invoice.id}`);
    setSelectedInvoice(invoice);
    setShowInvoicePreview(true);
  }, [navigate]);

  // Handle invoice edit
  const handleEditInvoice = useCallback((invoice) => {
    setSelectedInvoice(invoice);
    navigate('/create-invoice');
  }, [navigate]);

  // Handle save/cancel
  const handleSave = useCallback(() => {
    setSelectedInvoice(null);
    navigate('/invoices');
  }, [navigate]);

  const handleCancel = useCallback(() => {
    setSelectedInvoice(null);
    navigate('/invoices');
  }, [navigate]);

  const handleClosePreview = useCallback(() => {
    setSelectedInvoice(null);
    setShowInvoicePreview(false);
    navigate('/invoices');
  }, [navigate]);

  // Dashboard stats (only for dashboard home)
  const dashboardStats = useMemo(() => [
    { label: 'Total Invoices', value: '24', change: '+12%', icon: '📄', color: '#3B82F6' },
    { label: 'Paid This Month', value: '$4,820', change: '+8%', icon: '💰', color: '#10B981' },
    { label: 'Pending', value: '5', change: '-2', icon: '⏳', color: '#F59E0B' },
    { label: 'Active Clients', value: '18', change: '+3', icon: '👥', color: '#8B5CF6' },
  ], []);

  // Quick actions for dashboard home
  const quickActions = useMemo(() => [
    { id: 'create-invoice', label: 'New Invoice', icon: '📝', color: '#3B82F6', path: '/create-invoice' },
    { id: 'clients', label: 'Manage Clients', icon: '👥', color: '#8B5CF6', path: '/clients' },
    { id: 'invoices', label: 'View Invoices', icon: '📋', color: '#10B981', path: '/invoices' },
    { id: 'export', label: 'Export Data', icon: '📤', color: '#F59E0B', action: () => console.log('Export') },
  ], []);

  // Recent activity (placeholder)
  const recentActivity = useMemo(() => [
    { id: 1, type: 'invoice', title: 'Invoice #INV-001', description: 'Sent to John Doe', time: '2 hours ago', status: 'sent' },
    { id: 2, type: 'payment', title: 'Payment Received', description: '$1,200 from Acme Inc.', time: '1 day ago', status: 'completed' },
    { id: 3, type: 'client', title: 'New Client Added', description: 'Tech Solutions LLC', time: '2 days ago', status: 'added' },
    { id: 4, type: 'invoice', title: 'Invoice #INV-002', description: 'Viewed by Sarah Smith', time: '3 days ago', status: 'viewed' },
  ], []);

  if (adminLoading) {
    return (
      <div className="dashboard">
        <Header />
        <div className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render the appropriate content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <>
            {/* Welcome Header */}
            <div className="welcome-section">
              <div className="welcome-content">
                <h1>Welcome back, {user.displayName}!</h1>
                <p>Here's what's happening with your business today.</p>
              </div>
              <button
                className="btn-primary"
                onClick={() => navigate('/create-invoice')}
              >
                <span className="btn-icon">➕</span>
                New Invoice
              </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-section">
              <div className="stats-grid">
                {dashboardStats.map((stat, index) => (
                  <div key={index} className="stat-card" style={{ '--card-color': stat.color }}>
                    <div className="stat-icon">{stat.icon}</div>
                    <div className="stat-content">
                      <div className="stat-value">{stat.value}</div>
                      <div className="stat-label">{stat.label}</div>
                    </div>
                    <div className={`stat-change ${stat.change.startsWith('+') ? 'positive' : 'negative'}`}>
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
              <h2 className="section-title">Quick Actions</h2>
              <div className="quick-actions-grid">
                {quickActions.map((action) => (
                  <div
                    key={action.id}
                    className="quick-action-card"
                    style={{ '--action-color': action.color }}
                    onClick={action.path ? () => navigate(action.path) : action.action}
                  >
                    <div className="action-icon">{action.icon}</div>
                    <div className="action-label">{action.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Two Column Layout for Recent Activity and Upcoming */}
            <div className="two-column-section">
              {/* Recent Activity */}
              <div className="column-card">
                <div className="column-header">
                  <h3>Recent Activity</h3>
                  <button className="view-all" onClick={() => navigate('/invoices')}>
                    View All
                  </button>
                </div>
                <div className="activity-list">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon">
                        {activity.type === 'invoice' && '📄'}
                        {activity.type === 'payment' && '💰'}
                        {activity.type === 'client' && '👥'}
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">{activity.title}</div>
                        <div className="activity-description">{activity.description}</div>
                      </div>
                      <div className="activity-meta">
                        <span className="activity-time">{activity.time}</span>
                        <span className={`activity-status status-${activity.status}`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Payments */}
              <div className="column-card">
                <div className="column-header">
                  <h3>Upcoming Payments</h3>
                  <button className="view-all" onClick={() => navigate('/invoices')}>
                    View All
                  </button>
                </div>
                <div className="payments-list">
                  <div className="payment-item">
                    <div className="payment-info">
                      <div className="payment-client">Tech Solutions LLC</div>
                      <div className="payment-amount">$2,500</div>
                    </div>
                    <div className="payment-due">
                      Due in 3 days
                    </div>
                  </div>
                  <div className="payment-item">
                    <div className="payment-info">
                      <div className="payment-client">Global Enterprises</div>
                      <div className="payment-amount">$1,800</div>
                    </div>
                    <div className="payment-due">
                      Due in 1 week
                    </div>
                  </div>
                  <div className="payment-item">
                    <div className="payment-info">
                      <div className="payment-client">Creative Agency</div>
                      <div className="payment-amount">$3,200</div>
                    </div>
                    <div className="payment-due">
                      Due in 2 weeks
                    </div>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="quick-tips">
                  <h4>💡 Quick Tip</h4>
                  <p>Send payment reminders 3 days before due dates to improve collection rates.</p>
                </div>
              </div>
            </div>
          </>
        );

      case 'invoices':
        return (
          <>
            <div className="page-header">
              <div className="header-content">
                <div className="page-icon">📄</div>
                <div className="page-info">
                  <h1 className="page-title">Invoices</h1>
                  <p className="page-description">View and manage all your invoices</p>
                </div>
              </div>
              <div className="page-actions">
                <button
                  className="btn-primary"
                  onClick={() => navigate('/create-invoice')}
                >
                  <span className="btn-icon">➕</span>
                  New Invoice
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => console.log('Export')}
                >
                  <span className="btn-icon">📤</span>
                  Export
                </button>
              </div>
            </div>
            <InvoiceList
              onViewInvoice={handleViewInvoice}
              onEditInvoice={handleEditInvoice}
            />
          </>
        );

      case 'create-invoice':
        return (
          <InvoiceForm
            invoice={selectedInvoice}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        );

      case 'clients':
        return <Clients />;

      case 'profile':
        return <Profile />;

      case 'admin':
        return <Admin />;

      case 'settings':
        return <Settings />;

      case 'help':
        return <Help />;

      default:
        return (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h2>Select a section to get started</h2>
            <p>Choose from the navigation above to manage your invoices, clients, or settings.</p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard">
      <Header />
     <span className='makespace'><br /><br /></span> 
      <div className="dashboard-container">
        <main className="dashboard-main">
          {renderContent()}

          {/* Invoice Preview Modal */}
          {showInvoicePreview && selectedInvoice && (
            <div className="preview-modal">
              <InvoicePreview
                invoice={selectedInvoice}
                onClose={handleClosePreview}
              />
            </div>
          )}
        </main>
      </div>

      {/* Ad Section */}
      <div className="dashboard-ad">
        <AdComponent />
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <div className="footer-info">
            <p className="copyright">
              &copy; {new Date().getFullYear()} Simply Invoicing
            </p>
            <p className="author">
              Created by{' '}
              <a
                href='https://chris-feveck.web.app'
                target='_blank'
                rel="noopener noreferrer"
                className="author-link"
              >
                Chris
              </a>
            </p>
          </div>
          <div className="footer-links">
            <button
              className="footer-link"
              onClick={() => navigate('/help')}
            >
              Help
            </button>
            <a href="/terms" className="footer-link">Terms</a>
            <a href="/privacy" className="footer-link">Privacy</a>
            <a href="/contact" className="footer-link">Contact</a>
          </div>
          <div className="footer-version">
            <span className="version">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;