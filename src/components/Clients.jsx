import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getClients, 
  createClient, 
  updateClient, 
  deleteClient, 
  searchClients,
  getClientStats 
} from '../firebase/clientServices.js';
import '../styles/Clients.css';

const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ totalClients: 0, activeClients: 0, inactiveClients: 0 });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    taxId: '',
    notes: '',
    status: 'active'
  });

  // Validation state
  const [errors, setErrors] = useState({});

  // Load clients on component mount
  useEffect(() => {
    if (user) {
      loadClients();
      loadStats();
    }
  }, [user]);

  // Filter clients when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const loadClients = async () => {
    setLoading(true);
    setError('');
    const result = await getClients(user.uid);
    if (result.success) {
      setClients(result.data);
      setFilteredClients(result.data);
    } else {
      setError('Failed to load clients: ' + result.error);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const result = await getClientStats(user.uid);
    if (result.success) {
      setStats(result.data);
    }
  };

  const handleSearch = useCallback(async () => {
    if (searchTerm.trim() === '') {
      loadClients();
      return;
    }
    
    setLoading(true);
    const result = await searchClients(user.uid, searchTerm);
    if (result.success) {
      setFilteredClients(result.data);
    }
    setLoading(false);
  }, [searchTerm, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.phone && !/^[\d\s\-\+\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    if (editingClient) {
      // Update existing client
      const result = await updateClient(editingClient.id, formData);
      if (result.success) {
        setSuccessMessage(result.message);
        loadClients();
        loadStats();
        handleCloseModal();
      } else {
        setError('Failed to update client: ' + result.error);
      }
    } else {
      // Create new client
      const result = await createClient(formData, user.uid);
      if (result.success) {
        setSuccessMessage(result.message);
        loadClients();
        loadStats();
        handleCloseModal();
      } else {
        setError('Failed to create client: ' + result.error);
      }
    }
    
    setLoading(false);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zipCode: client.zipCode || '',
      country: client.country || '',
      taxId: client.taxId || '',
      notes: client.notes || '',
      status: client.status || 'active'
    });
    setShowModal(true);
  };

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    
    setLoading(true);
    const result = await deleteClient(clientToDelete.id);
    if (result.success) {
      setSuccessMessage(result.message);
      loadClients();
      loadStats();
    } else {
      setError('Failed to delete client: ' + result.error);
    }
    setLoading(false);
    setShowDeleteModal(false);
    setClientToDelete(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      taxId: '',
      notes: '',
      status: 'active'
    });
    setErrors({});
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Company', 'Address', 'City', 'State', 'Zip Code', 'Country', 'Tax ID', 'Status', 'Created Date'],
      ...clients.map(client => [
        client.name || '',
        client.email || '',
        client.phone || '',
        client.company || '',
        client.address || '',
        client.city || '',
        client.state || '',
        client.zipCode || '',
        client.country || '',
        client.taxId || '',
        client.status || '',
        client.createdAt?.toDate().toLocaleDateString() || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="clients-container">
      {/* Header Section */}
      <div className="clients-header">
        <div className="header-content">
          <h1 className="page-title">Client Management</h1>
          <p className="page-description">Manage your clients and their information</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn-primary"
            onClick={() => setShowModal(true)}
          >
            <span className="btn-icon">➕</span>
            Add Client
          </button>
          <button 
            className="btn-secondary"
            onClick={handleExport}
            disabled={clients.length === 0}
          >
            <span className="btn-icon">📤</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalClients}</div>
              <div className="stat-label">Total Clients</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeClients}</div>
              <div className="stat-label">Active</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⏸️</div>
            <div className="stat-content">
              <div className="stat-value">{stats.inactiveClients}</div>
              <div className="stat-label">Inactive</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-value">{clients.length > 0 ? formatDate(clients[0].createdAt) : 'N/A'}</div>
              <div className="stat-label">Last Added</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-container">
          <div className="search-input-group">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search clients by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button 
            className="search-button"
            onClick={handleSearch}
          >
            Search
          </button>
          {searchTerm && (
            <button 
              className="clear-button"
              onClick={() => {
                setSearchTerm('');
                loadClients();
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="success-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {error}
        </div>
      )}

      {/* Clients Table */}
      <div className="clients-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No clients found</h3>
            <p>{searchTerm ? 'Try a different search term' : 'Add your first client to get started'}</p>
            <button 
              className="btn-primary"
              onClick={() => setShowModal(true)}
            >
              Add Your First Client
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.id}>
                    <td>
                      <div className="client-name">
                        <div className="client-avatar">
                          {client.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div className="client-details">
                          <div className="name">{client.name}</div>
                          {client.email && (
                            <div className="email">{client.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="company-info">
                        {client.company || '—'}
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        {client.phone && (
                          <div className="phone">{client.phone}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="location-info">
                        {client.city && (
                          <div>{client.city}, {client.state || ''}</div>
                        )}
                        {!client.city && client.country && (
                          <div>{client.country}</div>
                        )}
                        {!client.city && !client.country && '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${client.status}`}>
                        {client.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="date-info">
                        {formatDate(client.createdAt)}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => handleEdit(client)}
                          title="Edit client"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </button>
                        <button 
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteClick(client)}
                          title="Delete client"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {filteredClients.length > 0 && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {filteredClients.length} of {clients.length} clients
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Client Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button 
                className="modal-close"
                onClick={handleCloseModal}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={errors.name ? 'error' : ''}
                      placeholder="John Smith"
                    />
                    {errors.name && (
                      <span className="error-text">{errors.name}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={errors.email ? 'error' : ''}
                      placeholder="john@example.com"
                    />
                    {errors.email && (
                      <span className="error-text">{errors.email}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={errors.phone ? 'error' : ''}
                      placeholder="+1 (555) 123-4567"
                    />
                    {errors.phone && (
                      <span className="error-text">{errors.phone}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="company">Company</label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Acme Inc."
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label htmlFor="address">Address</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="123 Main Street"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="New York"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="state">State/Province</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="NY"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="zipCode">Zip/Postal Code</label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="10001"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="United States"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="taxId">Tax ID</label>
                    <input
                      type="text"
                      id="taxId"
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleInputChange}
                      placeholder="TAX-123456"
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  
                  <div className="form-group full-width">
                    <label htmlFor="notes">Notes</label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Additional notes about this client..."
                      rows="3"
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span>
                      {editingClient ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingClient ? 'Update Client' : 'Create Client'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && clientToDelete && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h2 className="modal-title">Delete Client</h2>
            </div>
            
            <div className="modal-body">
              <div className="warning-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <h3>Are you sure?</h3>
                <p>
                  You are about to delete <strong>{clientToDelete.name}</strong>. 
                  This action cannot be undone and will remove all associated data.
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setClientToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-danger"
                onClick={handleDeleteConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Deleting...
                  </>
                ) : 'Delete Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;