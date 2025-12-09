import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import StripePayment from './StripePayment';
import '../styles/Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    displayName: '',
    companyName: '',
    phone: '',
    address: '',
    website: ''
  });

  const loadProfileData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(userData);
        setFormData({
          displayName: userData.displayName || user.displayName || '',
          companyName: userData.companyName || '',
          phone: userData.phone || '',
          address: userData.address || '',
          website: userData.website || ''
        });
      } else {
        const defaultProfile = {
          displayName: user.displayName || '',
          email: user.email,
          companyName: '',
          phone: '',
          address: '',
          website: '',
          createdAt: new Date(),
          plan: 'free',
          subscriptionStatus: 'inactive'
        };
        
        setProfile(defaultProfile);
        setFormData({
          displayName: defaultProfile.displayName,
          companyName: defaultProfile.companyName,
          phone: defaultProfile.phone,
          address: defaultProfile.address,
          website: defaultProfile.website
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      setError(`Failed to load profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      if (!user) {
        throw new Error('No user found');
      }

      const updateData = {
        displayName: formData.displayName.trim(),
        companyName: formData.companyName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        website: formData.website.trim(),
        updatedAt: new Date()
      };

      // Remove empty or whitespace-only fields
      Object.keys(updateData).forEach(key => {
        if (!updateData[key] || updateData[key].trim() === '') {
          delete updateData[key];
        }
      });

      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      await loadProfileData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(`Failed to update profile: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getPlanBadge = (plan) => {
    const planStyles = {
      free: { class: 'plan-badge-free', label: 'Free' },
      basic: { class: 'plan-badge-basic', label: 'Basic' },
      premium: { class: 'plan-badge-premium', label: 'Premium' },
      admin: { class: 'plan-badge-admin', label: 'Admin' }
    };
    
    const style = planStyles[plan] || planStyles.free;
    return <span className={`plan-badge ${style.class}`}>{style.label}</span>;
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Account Settings</h1>
        <p>Manage your profile and subscription</p>
      </div>

      {error && (
        <AlertMessage type="error" message={error} onDismiss={() => setError('')} />
      )}

      {success && (
        <AlertMessage type="success" message={success} onDismiss={() => setSuccess('')} />
      )}

      <div className="profile-tabs">
        <TabButton
          active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
          icon="📝"
          label="Profile"
        />
        <TabButton
          active={activeTab === 'billing'}
          onClick={() => setActiveTab('billing')}
          icon="💳"
          label="Billing & Plans"
        />
        <TabButton
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          icon="⚙️"
          label="Settings"
        />
      </div>

      <div className="profile-content">
        {activeTab === 'profile' ? (
          <ProfileTab
            user={user}
            profile={profile}
            isEditing={isEditing}
            formData={formData}
            onEdit={() => setIsEditing(true)}
            onCancel={() => setIsEditing(false)}
            onSubmit={handleUpdateProfile}
            onChange={handleInputChange}
            getPlanBadge={getPlanBadge}
          />
        ) : activeTab === 'billing' ? (
          <BillingTab
            profile={profile}
            getPlanBadge={getPlanBadge}
          />
        ) : (
          <SettingsTab />
        )}
      </div>
    </div>
  );
};

// Reusable Alert Component
const AlertMessage = ({ type, message, onDismiss }) => (
  <div className={`alert-banner ${type}`}>
    <span>{message}</span>
    <button 
      onClick={onDismiss} 
      className="alert-dismiss"
      aria-label="Dismiss alert"
    >
      ×
    </button>
  </div>
);

// Tab Button Component
const TabButton = ({ active, onClick, icon, label }) => (
  <button 
    className={`tab-button ${active ? 'active' : ''}`}
    onClick={onClick}
    aria-selected={active}
    role="tab"
  >
    <span className="tab-icon" aria-hidden="true">{icon}</span>
    <span className="tab-label">{label}</span>
  </button>
);

// Profile Tab Component
const ProfileTab = ({ 
  user, 
  profile, 
  isEditing, 
  formData, 
  onEdit, 
  onCancel, 
  onSubmit, 
  onChange,
  getPlanBadge 
}) => (
  <div className="profile-info">
    <div className="info-section">
      <h3>Account Information</h3>
      <div className="info-grid">
        <InfoItem label="Email" value={user?.email} />
        <InfoItem label="User ID" value={user?.uid} className="user-id" />
        <InfoItem 
          label="Current Plan" 
          value={
            <div className="plan-info">
              {getPlanBadge(profile?.plan || 'free')}
              <span className={`plan-status ${profile?.subscriptionStatus}`}>
                {profile?.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          }
        />
      </div>
    </div>

    {isEditing ? (
      <ProfileForm
        formData={formData}
        onSubmit={onSubmit}
        onChange={onChange}
        onCancel={onCancel}
      />
    ) : (
      <ProfileDisplay
        profile={profile}
        onEdit={onEdit}
      />
    )}
  </div>
);

// Info Item Component
const InfoItem = ({ label, value, className = '' }) => (
  <div className="info-item">
    <label>{label}</label>
    <div className={`info-value ${className}`}>
      {value || 'Not set'}
    </div>
  </div>
);

// Profile Form Component
const ProfileForm = ({ formData, onSubmit, onChange, onCancel }) => (
  <form onSubmit={onSubmit} className="profile-form">
    <div className="form-section">
      <h3>Personal Information</h3>
      <div className="form-grid">
        <FormField
          label="Display Name *"
          name="displayName"
          value={formData.displayName}
          onChange={onChange}
          required
          placeholder="Enter your name"
        />
        <FormField
          label="Company Name"
          name="companyName"
          value={formData.companyName}
          onChange={onChange}
          placeholder="Enter company name"
        />
        <FormField
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={onChange}
          type="tel"
          placeholder="Enter phone number"
        />
        <FormField
          label="Website"
          name="website"
          value={formData.website}
          onChange={onChange}
          type="url"
          placeholder="Enter website URL"
        />
        <div className="form-group full-width">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={onChange}
            rows="3"
            placeholder="Enter your address"
          />
        </div>
      </div>
    </div>

    <div className="form-actions">
      <button
        type="button"
        className="btn-secondary"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button type="submit" className="btn-primary">
        Save Changes
      </button>
    </div>
  </form>
);

// Form Field Component
const FormField = ({ label, name, value, onChange, type = 'text', required = false, placeholder }) => (
  <div className="form-group">
    <label htmlFor={name}>{label}</label>
    <input
      id={name}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
    />
  </div>
);

// Profile Display Component
const ProfileDisplay = ({ profile, onEdit }) => (
  <div className="profile-display">
    <div className="info-section">
      <h3>Personal Information</h3>
      <div className="info-grid">
        <InfoItem label="Display Name" value={profile?.displayName} />
        <InfoItem label="Company Name" value={profile?.companyName} />
        <InfoItem label="Phone" value={profile?.phone} />
        <InfoItem label="Website" value={profile?.website} />
        <InfoItem 
          label="Address" 
          value={profile?.address} 
          className="full-width"
        />
      </div>
    </div>

    <button
      className="btn-primary"
      onClick={onEdit}
    >
      Edit Profile
    </button>
  </div>
);

// Billing Tab Component
const BillingTab = ({ profile, getPlanBadge }) => (
  <div className="billing-section">
    <div className="current-plan-card">
      <h3>Your Current Plan</h3>
      <div className="plan-details">
        <div className="plan-header">
          {getPlanBadge(profile?.plan || 'free')}
          <div className="plan-price">
            {profile?.plan === 'free' && 'Free'}
            {profile?.plan === 'basic' && '$4.99/month'}
            {profile?.plan === 'premium' && '$8.99/month'}
          </div>
        </div>
        <PlanFeatures plan={profile?.plan || 'free'} />
      </div>
    </div>

    {(profile?.plan === 'free' || !profile?.plan) && (
      <UpgradeSection />
    )}

    {profile?.plan !== 'free' && profile?.plan && (
      <SubscriptionInfo profile={profile} />
    )}
  </div>
);

// Plan Features Component
const PlanFeatures = ({ plan }) => {
  const features = {
    free: [
      'Up to 10 invoices per month',
      'Basic email templates',
      'Standard support',
      'PDF export included'
    ],
    basic: [
      'Up to 50 invoices per month',
      'Professional email templates',
      'Priority email support',
      'Custom branding',
      'Basic analytics'
    ],
    premium: [
      'Unlimited invoices',
      'Advanced email templates',
      '24/7 priority support',
      'Custom branding & logos',
      'Advanced analytics',
      'API access',
      'Bulk operations'
    ]
  };

  const currentFeatures = features[plan] || features.free;

  return (
    <div className="plan-features-list">
      {currentFeatures.map((feature, index) => (
        <div key={index} className="feature">
          <span className="feature-icon">✓</span>
          {feature}
        </div>
      ))}
      {plan === 'free' && (
        <div className="upgrade-note">
          Upgrade to unlock more features!
        </div>
      )}
    </div>
  );
};

// Upgrade Section Component
const UpgradeSection = () => (
  <div className="upgrade-section">
    <h3>Upgrade Your Plan</h3>
    <p>Get access to more features and higher limits</p>
    <StripePayment />
  </div>
);

// Subscription Info Component
const SubscriptionInfo = ({ profile }) => (
  <div className="subscription-info">
    <h3>Subscription Management</h3>
    <div className="subscription-card">
      <div className="subscription-details">
        <DetailItem label="Current Plan" value={profile?.plan} />
        <DetailItem 
          label="Status" 
          value={
            <span className={`status ${profile?.subscriptionStatus || 'inactive'}`}>
              {profile?.subscriptionStatus || 'inactive'}
            </span>
          } 
        />
        <DetailItem label="Billing" value="Managed by Stripe" />
      </div>
      <div className="subscription-actions">
        <button className="btn-secondary">
          Manage Subscription
        </button>
        <button className="btn-outline">
          View Invoices
        </button>
      </div>
    </div>
  </div>
);

// Detail Item Component
const DetailItem = ({ label, value }) => (
  <div className="detail-item">
    <label>{label}</label>
    <span>{value}</span>
  </div>
);

// Settings Tab Component
const SettingsTab = () => (
  <div className="settings-section">
    <h3>Account Settings</h3>
    <div className="settings-list">
      <SettingItem
        icon="🔔"
        title="Notifications"
        description="Manage email and push notifications"
      />
      <SettingItem
        icon="🌍"
        title="Language & Region"
        description="Set your preferred language and timezone"
      />
      <SettingItem
        icon="🔐"
        title="Security"
        description="Change password and security settings"
      />
      <SettingItem
        icon="📊"
        title="Data & Privacy"
        description="Manage your data and privacy settings"
      />
    </div>
  </div>
);

// Setting Item Component
const SettingItem = ({ icon, title, description }) => (
  <div className="setting-item">
    <div className="setting-icon" aria-hidden="true">{icon}</div>
    <div className="setting-content">
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
    <button className="setting-action">
      Configure
    </button>
  </div>
);

export default Profile;