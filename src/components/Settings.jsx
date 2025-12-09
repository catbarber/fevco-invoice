import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom'; // Add this import
import '../styles/Settings.css';

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate(); // Add this
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [errors, setErrors] = useState({});
  
  // Settings state
  const [settings, setSettings] = useState({
    // Profile Settings
    profile: {
      displayName: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      website: '',
      bio: '',
    },
    
    // Company Settings
    company: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States',
      phone: '',
      email: '',
      website: '',
      taxId: '',
      currency: 'USD',
      timezone: 'America/New_York',
    },
    
    // Invoice Settings
    invoice: {
      prefix: 'INV-',
      nextNumber: 1001,
      defaultTerms: 'Net 30',
      defaultNotes: 'Thank you for your business!',
      lateFeePercentage: 1.5,
      lateFeeEnabled: true,
      autoReminders: true,
      reminderDays: [7, 3, 1],
      enableOnlinePayments: true,
      paymentMethods: ['credit_card', 'bank_transfer', 'paypal'],
    },
    
    // Notification Settings
    notifications: {
      emailInvoiceSent: true,
      emailPaymentReceived: true,
      emailPaymentReminder: true,
      emailClientAdded: true,
      pushInvoiceViewed: true,
      pushPaymentReceived: true,
      pushOverdueInvoice: true,
      digestFrequency: 'daily', // daily, weekly, never
    },
    
    // Appearance Settings
    appearance: {
      theme: 'system', // light, dark, system
      density: 'comfortable', // compact, comfortable, spacious
      sidebarCollapsed: false,
      showStats: true,
      showRecentActivity: true,
      showUpcomingPayments: true,
      language: 'en-US',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h', // 12h or 24h
      numberFormat: 'en-US',
    },
    
    // Security Settings
    security: {
      twoFactorAuth: false,
      loginNotifications: true,
      sessionTimeout: 60, // minutes
      passwordExpiry: 90, // days
      ipWhitelist: [],
      requirePasswordChange: false,
      failedLoginAttempts: 5,
      failedLoginLockout: 15, // minutes
    },
    
    // Billing Settings
    billing: {
      plan: 'pro',
      status: 'active',
      billingCycle: 'monthly',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentMethod: 'credit_card',
      autoRenew: true,
      invoicesEmail: true,
      receiptsEmail: true,
    },
  });

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const settingsRef = doc(db, 'settings', user.uid);
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          const savedSettings = settingsSnap.data();
          setSettings(prev => ({
            ...prev,
            ...savedSettings,
            profile: {
              ...prev.profile,
              ...savedSettings.profile,
              email: user.email || '',
              displayName: user.displayName || '',
            }
          }));
        } else {
          // Initialize with user data
          setSettings(prev => ({
            ...prev,
            profile: {
              ...prev.profile,
              email: user.email || '',
              displayName: user.displayName || '',
            }
          }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setSaveMessage('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [user]);

  // Handle input changes
  const handleInputChange = useCallback((section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  // Handle toggle changes
  const handleToggleChange = useCallback((section, field) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field]
      }
    }));
  }, []);

  // Handle array changes (for payment methods, reminder days, etc.)
  const handleArrayChange = useCallback((section, field, value, checked) => {
    setSettings(prev => {
      const currentArray = prev[section][field] || [];
      let newArray;
      
      if (checked) {
        newArray = [...currentArray, value];
      } else {
        newArray = currentArray.filter(item => item !== value);
      }
      
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray
        }
      };
    });
  }, []);

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Profile validation
    if (!settings.profile.displayName?.trim()) {
      newErrors.displayName = 'Display name is required';
    }
    
    if (settings.profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.profile.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Company validation
    if (settings.company.name && settings.company.name.length < 2) {
      newErrors.companyName = 'Company name must be at least 2 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save settings to Firestore
  const handleSaveSettings = async (section) => {
    if (!validateForm()) {
      setSaveMessage('Please fix the errors before saving');
      return;
    }
    
    setSaving(true);
    setSaveMessage('');
    
    try {
      // Update Firebase Auth profile if needed
      if (section === 'profile') {
        await updateProfile({
          displayName: settings.profile.displayName,
        });
      }
      
      // Save to Firestore
      const settingsRef = doc(db, 'settings', user.uid);
      await setDoc(settingsRef, {
        ...settings,
        userId: user.uid,
        lastUpdated: new Date(),
      }, { merge: true });
      
      setSaveMessage('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset section to default
  const handleResetSection = (section) => {
    if (window.confirm('Are you sure you want to reset these settings to defaults?')) {
      const defaults = {
        profile: {
          displayName: user?.displayName || '',
          email: user?.email || '',
          phone: '',
          company: '',
          position: '',
          website: '',
          bio: '',
        },
        company: {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'United States',
          phone: '',
          email: '',
          website: '',
          taxId: '',
          currency: 'USD',
          timezone: 'America/New_York',
        },
        invoice: {
          prefix: 'INV-',
          nextNumber: 1001,
          defaultTerms: 'Net 30',
          defaultNotes: 'Thank you for your business!',
          lateFeePercentage: 1.5,
          lateFeeEnabled: true,
          autoReminders: true,
          reminderDays: [7, 3, 1],
          enableOnlinePayments: true,
          paymentMethods: ['credit_card', 'bank_transfer', 'paypal'],
        },
        notifications: {
          emailInvoiceSent: true,
          emailPaymentReceived: true,
          emailPaymentReminder: true,
          emailClientAdded: true,
          pushInvoiceViewed: true,
          pushPaymentReceived: true,
          pushOverdueInvoice: true,
          digestFrequency: 'daily',
        },
        appearance: {
          theme: 'system',
          density: 'comfortable',
          sidebarCollapsed: false,
          showStats: true,
          showRecentActivity: true,
          showUpcomingPayments: true,
          language: 'en-US',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          numberFormat: 'en-US',
        },
        security: {
          twoFactorAuth: false,
          loginNotifications: true,
          sessionTimeout: 60,
          passwordExpiry: 90,
          ipWhitelist: [],
          requirePasswordChange: false,
          failedLoginAttempts: 5,
          failedLoginLockout: 15,
        },
        billing: {
          plan: 'pro',
          status: 'active',
          billingCycle: 'monthly',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentMethod: 'credit_card',
          autoRenew: true,
          invoicesEmail: true,
          receiptsEmail: true,
        },
      };
      
      setSettings(prev => ({
        ...prev,
        [section]: defaults[section]
      }));
      
      setSaveMessage(`${section.charAt(0).toUpperCase() + section.slice(1)} settings reset to defaults`);
      
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    }
  };

  // Export settings
  // const handleExportSettings = () => {
  //   const dataStr = JSON.stringify(settings, null, 2);
  //   const dataBlob = new Blob([dataStr], { type: 'application/json' });
  //   const url = URL.createObjectURL(dataBlob);
  //   const link = document.createElement('a');
  //   link.href = url;
  //   link.download = `simply-invoicing-settings-${new Date().toISOString().split('T')[0]}.json`;
  //   link.click();
  //   URL.revokeObjectURL(url);
  // };

  // Import settings (placeholder)
  // const handleImportSettings = () => {
  //   const input = document.createElement('input');
  //   input.type = 'file';
  //   input.accept = '.json';
  //   input.onchange = (e) => {
  //     const file = e.target.files[0];
  //     const reader = new FileReader();
  //     reader.onload = (event) => {
  //       try {
  //         const importedSettings = JSON.parse(event.target.result);
  //         setSettings(importedSettings);
  //         setSaveMessage('Settings imported successfully!');
  //       } catch (error) {
  //         setSaveMessage('Error importing settings: Invalid file format');
  //       }
  //     };
  //     reader.readAsText(file);
  //   };
  //   input.click();
  // };

  // Handle back to dashboard
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Available options for selects
  const countryOptions = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Spain', 'Italy', 'Japan', 'China', 'India'];
  const currencyOptions = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];
  const timezoneOptions = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];
  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];
  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' },
    { value: 'ja-JP', label: 'Japanese' },
  ];
  const dateFormatOptions = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MMMM D, YYYY'];
  const digestFrequencyOptions = [
    { value: 'never', label: 'Never' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
  ];

  if (loading) {
    return (
      <div className="settings-container">
        <div className="settings-loading">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="header-content">
          <h1 className="settings-title">Settings</h1>
          <p className="settings-description">
            Manage your account preferences and configuration
          </p>
        </div>
        
        <div className="header-actions">
          {/* Back to Dashboard Button */}
          <button 
            className="btn-secondary back-button"
            onClick={handleBackToDashboard}
          >
            <span className="btn-icon">←</span>
            Back to Dashboard
          </button>
          
          {/* <button 
            className="btn-secondary"
            onClick={handleExportSettings}
          >
            Export Settings
          </button>
          <button 
            className="btn-secondary"
            onClick={handleImportSettings}
          >
            Import Settings
          </button> */}
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('success') ? 'success' : 'error'}`}>
          {saveMessage}
        </div>
      )}

      {/* Main Content */}
      <div className="settings-content">
        {/* Sidebar Navigation */}
        <div className="settings-sidebar">
          <nav className="settings-nav">
            <button
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="nav-icon">👤</span>
              <span className="nav-text">Profile</span>
            </button>
            
            <button
              className={`nav-item ${activeTab === 'company' ? 'active' : ''}`}
              onClick={() => setActiveTab('company')}
            >
              <span className="nav-icon">🏢</span>
              <span className="nav-text">Company</span>
            </button>
            
            <button
              className={`nav-item ${activeTab === 'invoice' ? 'active' : ''}`}
              onClick={() => setActiveTab('invoice')}
            >
              <span className="nav-icon">📄</span>
              <span className="nav-text">Invoicing</span>
            </button>
            
            <button
              className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <span className="nav-icon">🔔</span>
              <span className="nav-text">Notifications</span>
            </button>
            
            <button
              className={`nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <span className="nav-icon">🎨</span>
              <span className="nav-text">Appearance</span>
            </button>
            
            <button
              className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <span className="nav-icon">🔒</span>
              <span className="nav-text">Security</span>
            </button>
            
            <button
              className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              <span className="nav-icon">💰</span>
              <span className="nav-text">Billing</span>
            </button>
          </nav>
          
          <div className="sidebar-info">
            <div className="info-card">
              <h4>Settings Status</h4>
              <p>Your settings are saved automatically</p>
              <div className="last-saved">
                <span className="label">Last saved:</span>
                <span className="value">Just now</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="settings-form">
          <div className="form-header">
            <h2 className="form-title">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings
            </h2>
            <button
              className="btn-secondary"
              onClick={() => handleResetSection(activeTab)}
            >
              Reset to Defaults
            </button>
          </div>

          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="settings-section">
              <div className="section-header">
                <h3>Personal Information</h3>
                <p>Update your personal details and contact information</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="displayName">Display Name *</label>
                  <input
                    type="text"
                    id="displayName"
                    value={settings.profile.displayName}
                    onChange={(e) => handleInputChange('profile', 'displayName', e.target.value)}
                    className={errors.displayName ? 'error' : ''}
                    placeholder="John Smith"
                  />
                  {errors.displayName && (
                    <span className="error-text">{errors.displayName}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={settings.profile.email}
                    onChange={(e) => handleInputChange('profile', 'email', e.target.value)}
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
                    value={settings.profile.phone}
                    onChange={(e) => handleInputChange('profile', 'phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="company">Company</label>
                  <input
                    type="text"
                    id="company"
                    value={settings.profile.company}
                    onChange={(e) => handleInputChange('profile', 'company', e.target.value)}
                    placeholder="Acme Inc."
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="position">Position</label>
                  <input
                    type="text"
                    id="position"
                    value={settings.profile.position}
                    onChange={(e) => handleInputChange('profile', 'position', e.target.value)}
                    placeholder="CEO"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="website">Website</label>
                  <input
                    type="url"
                    id="website"
                    value={settings.profile.website}
                    onChange={(e) => handleInputChange('profile', 'website', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    value={settings.profile.bio}
                    onChange={(e) => handleInputChange('profile', 'bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows="4"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Company Settings */}
          {activeTab === 'company' && (
            <div className="settings-section">
              <div className="section-header">
                <h3>Company Information</h3>
                <p>These details will appear on your invoices and other documents</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="companyName">Company Name</label>
                  <input
                    type="text"
                    id="companyName"
                    value={settings.company.name}
                    onChange={(e) => handleInputChange('company', 'name', e.target.value)}
                    className={errors.companyName ? 'error' : ''}
                    placeholder="Acme Inc."
                  />
                  {errors.companyName && (
                    <span className="error-text">{errors.companyName}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="companyEmail">Company Email</label>
                  <input
                    type="email"
                    id="companyEmail"
                    value={settings.company.email}
                    onChange={(e) => handleInputChange('company', 'email', e.target.value)}
                    placeholder="info@acme.com"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="companyPhone">Company Phone</label>
                  <input
                    type="tel"
                    id="companyPhone"
                    value={settings.company.phone}
                    onChange={(e) => handleInputChange('company', 'phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="companyAddress">Address</label>
                  <input
                    type="text"
                    id="companyAddress"
                    value={settings.company.address}
                    onChange={(e) => handleInputChange('company', 'address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="companyCity">City</label>
                  <input
                    type="text"
                    id="companyCity"
                    value={settings.company.city}
                    onChange={(e) => handleInputChange('company', 'city', e.target.value)}
                    placeholder="New York"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="companyState">State/Province</label>
                  <input
                    type="text"
                    id="companyState"
                    value={settings.company.state}
                    onChange={(e) => handleInputChange('company', 'state', e.target.value)}
                    placeholder="NY"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="companyZip">Zip/Postal Code</label>
                  <input
                    type="text"
                    id="companyZip"
                    value={settings.company.zipCode}
                    onChange={(e) => handleInputChange('company', 'zipCode', e.target.value)}
                    placeholder="10001"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="companyCountry">Country</label>
                  <select
                    id="companyCountry"
                    value={settings.company.country}
                    onChange={(e) => handleInputChange('company', 'country', e.target.value)}
                  >
                    {countryOptions.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="companyWebsite">Website</label>
                  <input
                    type="url"
                    id="companyWebsite"
                    value={settings.company.website}
                    onChange={(e) => handleInputChange('company', 'website', e.target.value)}
                    placeholder="https://acme.com"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="taxId">Tax ID</label>
                  <input
                    type="text"
                    id="taxId"
                    value={settings.company.taxId}
                    onChange={(e) => handleInputChange('company', 'taxId', e.target.value)}
                    placeholder="TAX-123456"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    value={settings.company.currency}
                    onChange={(e) => handleInputChange('company', 'currency', e.target.value)}
                  >
                    {currencyOptions.map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="timezone">Timezone</label>
                  <select
                    id="timezone"
                    value={settings.company.timezone}
                    onChange={(e) => handleInputChange('company', 'timezone', e.target.value)}
                  >
                    {timezoneOptions.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Settings */}
          {activeTab === 'invoice' && (
            <div className="settings-section">
              <div className="section-header">
                <h3>Invoicing Preferences</h3>
                <p>Customize how your invoices are generated and managed</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="invoicePrefix">Invoice Prefix</label>
                  <input
                    type="text"
                    id="invoicePrefix"
                    value={settings.invoice.prefix}
                    onChange={(e) => handleInputChange('invoice', 'prefix', e.target.value)}
                    placeholder="INV-"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="nextNumber">Next Invoice Number</label>
                  <input
                    type="number"
                    id="nextNumber"
                    value={settings.invoice.nextNumber}
                    onChange={(e) => handleInputChange('invoice', 'nextNumber', parseInt(e.target.value) || 1001)}
                    min="1"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="defaultTerms">Default Payment Terms</label>
                  <input
                    type="text"
                    id="defaultTerms"
                    value={settings.invoice.defaultTerms}
                    onChange={(e) => handleInputChange('invoice', 'defaultTerms', e.target.value)}
                    placeholder="Net 30"
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="defaultNotes">Default Notes</label>
                  <textarea
                    id="defaultNotes"
                    value={settings.invoice.defaultNotes}
                    onChange={(e) => handleInputChange('invoice', 'defaultNotes', e.target.value)}
                    placeholder="Thank you for your business!"
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="lateFeePercentage">Late Fee Percentage (%)</label>
                  <input
                    type="number"
                    id="lateFeePercentage"
                    value={settings.invoice.lateFeePercentage}
                    onChange={(e) => handleInputChange('invoice', 'lateFeePercentage', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="50"
                    step="0.1"
                  />
                </div>
                
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Enable Late Fees</label>
                    <span className="toggle-description">Automatically add late fees to overdue invoices</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.invoice.lateFeeEnabled}
                      onChange={() => handleToggleChange('invoice', 'lateFeeEnabled')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Auto Reminders</label>
                    <span className="toggle-description">Send automatic payment reminders</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.invoice.autoReminders}
                      onChange={() => handleToggleChange('invoice', 'autoReminders')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Online Payments</label>
                    <span className="toggle-description">Enable online payment options</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.invoice.enableOnlinePayments}
                      onChange={() => handleToggleChange('invoice', 'enableOnlinePayments')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="form-group full-width">
                  <label>Payment Methods</label>
                  <div className="checkbox-group">
                    {['credit_card', 'bank_transfer', 'paypal', 'check', 'cash'].map(method => (
                      <label key={method} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={settings.invoice.paymentMethods.includes(method)}
                          onChange={(e) => handleArrayChange('invoice', 'paymentMethods', method, e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        <span className="checkbox-text">
                          {method.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="form-group full-width">
                  <label>Reminder Days</label>
                  <div className="checkbox-group">
                    {[1, 2, 3, 5, 7, 14, 30].map(day => (
                      <label key={day} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={settings.invoice.reminderDays.includes(day)}
                          onChange={(e) => handleArrayChange('invoice', 'reminderDays', day, e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        <span className="checkbox-text">{day} day{day !== 1 ? 's' : ''} before due date</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="section-header">
                <h3>Notification Preferences</h3>
                <p>Choose which notifications you want to receive and how often</p>
              </div>
              
              <div className="form-grid">
                <h4 className="subsection-title">Email Notifications</h4>
                
                {[
                  { id: 'emailInvoiceSent', label: 'Invoice Sent', description: 'When an invoice is sent to a client' },
                  { id: 'emailPaymentReceived', label: 'Payment Received', description: 'When a payment is received' },
                  { id: 'emailPaymentReminder', label: 'Payment Reminders', description: 'Automated payment reminders' },
                  { id: 'emailClientAdded', label: 'New Client Added', description: 'When a new client is added' },
                ].map(item => (
                  <div key={item.id} className="form-group toggle-group">
                    <div className="toggle-label">
                      <label>{item.label}</label>
                      <span className="toggle-description">{item.description}</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.notifications[item.id]}
                        onChange={() => handleToggleChange('notifications', item.id)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                ))}
                
                <h4 className="subsection-title">Push Notifications</h4>
                
                {[
                  { id: 'pushInvoiceViewed', label: 'Invoice Viewed', description: 'When a client views your invoice' },
                  { id: 'pushPaymentReceived', label: 'Payment Received', description: 'When a payment is received' },
                  { id: 'pushOverdueInvoice', label: 'Overdue Invoice', description: 'When an invoice becomes overdue' },
                ].map(item => (
                  <div key={item.id} className="form-group toggle-group">
                    <div className="toggle-label">
                      <label>{item.label}</label>
                      <span className="toggle-description">{item.description}</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.notifications[item.id]}
                        onChange={() => handleToggleChange('notifications', item.id)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                ))}
                
                <div className="form-group">
                  <label htmlFor="digestFrequency">Digest Frequency</label>
                  <select
                    id="digestFrequency"
                    value={settings.notifications.digestFrequency}
                    onChange={(e) => handleInputChange('notifications', 'digestFrequency', e.target.value)}
                  >
                    {digestFrequencyOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <div className="section-header">
                <h3>Appearance & Display</h3>
                <p>Customize how the application looks and feels</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="theme">Theme</label>
                  <select
                    id="theme"
                    value={settings.appearance.theme}
                    onChange={(e) => handleInputChange('appearance', 'theme', e.target.value)}
                  >
                    {themeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="density">Density</label>
                  <select
                    id="density"
                    value={settings.appearance.density}
                    onChange={(e) => handleInputChange('appearance', 'density', e.target.value)}
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="language">Language</label>
                  <select
                    id="language"
                    value={settings.appearance.language}
                    onChange={(e) => handleInputChange('appearance', 'language', e.target.value)}
                  >
                    {languageOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="dateFormat">Date Format</label>
                  <select
                    id="dateFormat"
                    value={settings.appearance.dateFormat}
                    onChange={(e) => handleInputChange('appearance', 'dateFormat', e.target.value)}
                  >
                    {dateFormatOptions.map(format => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="timeFormat">Time Format</label>
                  <select
                    id="timeFormat"
                    value={settings.appearance.timeFormat}
                    onChange={(e) => handleInputChange('appearance', 'timeFormat', e.target.value)}
                  >
                    <option value="12h">12-hour (AM/PM)</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="numberFormat">Number Format</label>
                  <select
                    id="numberFormat"
                    value={settings.appearance.numberFormat}
                    onChange={(e) => handleInputChange('appearance', 'numberFormat', e.target.value)}
                  >
                    <option value="en-US">1,234.56</option>
                    <option value="de-DE">1.234,56</option>
                    <option value="fr-FR">1 234,56</option>
                  </select>
                </div>
                
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Show Dashboard Stats</label>
                    <span className="toggle-description">Display statistics on the dashboard</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.appearance.showStats}
                      onChange={() => handleToggleChange('appearance', 'showStats')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Show Recent Activity</label>
                    <span className="toggle-description">Display recent activity on the dashboard</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.appearance.showRecentActivity}
                      onChange={() => handleToggleChange('appearance', 'showRecentActivity')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Show Upcoming Payments</label>
                    <span className="toggle-description">Display upcoming payments on the dashboard</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.appearance.showUpcomingPayments}
                      onChange={() => handleToggleChange('appearance', 'showUpcomingPayments')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <div className="section-header">
                <h3>Security Settings</h3>
                <p>Manage your account security and privacy preferences</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Two-Factor Authentication</label>
                    <span className="toggle-description">Add an extra layer of security to your account</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.security.twoFactorAuth}
                      onChange={() => handleToggleChange('security', 'twoFactorAuth')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Login Notifications</label>
                    <span className="toggle-description">Get notified when someone logs into your account</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.security.loginNotifications}
                      onChange={() => handleToggleChange('security', 'loginNotifications')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Require Password Change</label>
                    <span className="toggle-description">Force password change on next login</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.security.requirePasswordChange}
                      onChange={() => handleToggleChange('security', 'requirePasswordChange')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="form-group">
                  <label htmlFor="sessionTimeout">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    id="sessionTimeout"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value) || 60)}
                    min="1"
                    max="1440"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="passwordExpiry">Password Expiry (days)</label>
                  <input
                    type="number"
                    id="passwordExpiry"
                    value={settings.security.passwordExpiry}
                    onChange={(e) => handleInputChange('security', 'passwordExpiry', parseInt(e.target.value) || 90)}
                    min="1"
                    max="365"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="failedLoginAttempts">Failed Login Attempts</label>
                  <input
                    type="number"
                    id="failedLoginAttempts"
                    value={settings.security.failedLoginAttempts}
                    onChange={(e) => handleInputChange('security', 'failedLoginAttempts', parseInt(e.target.value) || 5)}
                    min="1"
                    max="20"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="failedLoginLockout">Lockout Duration (minutes)</label>
                  <input
                    type="number"
                    id="failedLoginLockout"
                    value={settings.security.failedLoginLockout}
                    onChange={(e) => handleInputChange('security', 'failedLoginLockout', parseInt(e.target.value) || 15)}
                    min="1"
                    max="1440"
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="ipWhitelist">IP Whitelist</label>
                  <textarea
                    id="ipWhitelist"
                    value={settings.security.ipWhitelist.join('\n')}
                    onChange={(e) => handleInputChange('security', 'ipWhitelist', e.target.value.split('\n').filter(ip => ip.trim()))}
                    placeholder="Enter one IP address per line&#10;192.168.1.1&#10;10.0.0.1"
                    rows="4"
                  />
                  <span className="input-help">Enter one IP address per line. Leave empty to allow from anywhere.</span>
                </div>
              </div>
            </div>
          )}

          {/* Billing Settings */}
          {activeTab === 'billing' && (
            <div className="settings-section">
              <div className="section-header">
                <h3>Billing & Subscription</h3>
                <p>Manage your subscription plan and billing preferences</p>
              </div>
              
              <div className="billing-overview">
                <div className="plan-card">
                  <div className="plan-header">
                    <h4>Current Plan</h4>
                    <span className={`plan-badge plan-${settings.billing.plan}`}>
                      {settings.billing.plan.toUpperCase()}
                    </span>
                  </div>
                  <div className="plan-details">
                    <div className="plan-feature">
                      <span className="feature-icon">✅</span>
                      <span>Unlimited Invoices</span>
                    </div>
                    <div className="plan-feature">
                      <span className="feature-icon">✅</span>
                      <span>Unlimited Clients</span>
                    </div>
                    <div className="plan-feature">
                      <span className="feature-icon">✅</span>
                      <span>Advanced Reports</span>
                    </div>
                    <div className="plan-feature">
                      <span className="feature-icon">✅</span>
                      <span>Priority Support</span>
                    </div>
                  </div>
                  <div className="plan-actions">
                    <button className="btn-secondary">Upgrade Plan</button>
                  </div>
                </div>
                
                <div className="billing-info">
                  <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className={`info-value status-${settings.billing.status}`}>
                      {settings.billing.status}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Billing Cycle</span>
                    <span className="info-value">{settings.billing.billingCycle}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Next Billing Date</span>
                    <span className="info-value">
                      {new Date(settings.billing.nextBillingDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Payment Method</span>
                    <span className="info-value">
                      {settings.billing.paymentMethod.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Auto-Renew</label>
                    <span className="toggle-description">Automatically renew subscription</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.billing.autoRenew}
                      onChange={() => handleToggleChange('billing', 'autoRenew')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Email Invoices</label>
                    <span className="toggle-description">Receive billing invoices via email</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.billing.invoicesEmail}
                      onChange={() => handleToggleChange('billing', 'invoicesEmail')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                
                <div className="form-group toggle-group">
                  <div className="toggle-label">
                    <label>Email Receipts</label>
                    <span className="toggle-description">Receive payment receipts via email</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.billing.receiptsEmail}
                      onChange={() => handleToggleChange('billing', 'receiptsEmail')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              
              <div className="billing-actions">
                <button className="btn-secondary">Update Payment Method</button>
                <button className="btn-secondary">View Billing History</button>
                <button className="btn-danger">Cancel Subscription</button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={() => handleSaveSettings(activeTab)}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading-spinner"></span>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;