// src/components/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import StripePayment from './StripePayment';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'billing'
  const [formData, setFormData] = useState({
    displayName: '',
    companyName: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user) {
        throw new Error('No user found');
      }

      console.log('Loading profile for user:', user.uid);
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('Profile data loaded:', userData);
        
        setProfile(userData);
        setFormData({
          displayName: userData.displayName || user.displayName || '',
          companyName: userData.companyName || '',
          phone: userData.phone || '',
          address: userData.address || ''
        });
      } else {
        console.log('No profile found, creating default');
        // Initialize with default data
        const defaultProfile = {
          displayName: user.displayName || '',
          email: user.email,
          companyName: '',
          phone: '',
          address: '',
          createdAt: new Date(),
          plan: 'free',
          subscriptionStatus: 'inactive'
        };
        
        setProfile(defaultProfile);
        setFormData({
          displayName: defaultProfile.displayName,
          companyName: defaultProfile.companyName,
          phone: defaultProfile.phone,
          address: defaultProfile.address
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      setError(`Failed to load profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      if (!user) {
        throw new Error('No user found');
      }

      const updateData = {
        displayName: formData.displayName,
        companyName: formData.companyName,
        phone: formData.phone,
        address: formData.address,
        updatedAt: new Date()
      };

      // Remove empty fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '' || updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      console.log('Updating profile with:', updateData);
      
      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      await loadProfileData(); // Reload the profile data
      
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
        <div className="loading-spinner">Loading profile...</div>
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
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="success-banner">
          {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          📝 Profile
        </button>
        <button 
          className={`tab-button ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          💳 Billing & Plans
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'profile' ? (
          <div className="profile-info">
            <div className="info-section">
              <h3>Account Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Email</label>
                  <p>{user?.email}</p>
                </div>
                <div className="info-item">
                  <label>User ID</label>
                  <p className="user-id">{user?.uid}</p>
                </div>
                <div className="info-item">
                  <label>Current Plan</label>
                  <div className="plan-info">
                    {getPlanBadge(profile?.plan || 'free')}
                    <span className="plan-status">
                      {profile?.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="profile-form">
                <div className="form-section">
                  <h3>Personal Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Display Name *</label>
                      <input
                        type="text"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Company Name</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Address</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows="3"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-display">
                <div className="info-section">
                  <h3>Personal Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Display Name</label>
                      <p>{profile?.displayName || 'Not set'}</p>
                    </div>
                    <div className="info-item">
                      <label>Company Name</label>
                      <p>{profile?.companyName || 'Not set'}</p>
                    </div>
                    <div className="info-item">
                      <label>Phone</label>
                      <p>{profile?.phone || 'Not set'}</p>
                    </div>
                    <div className="info-item full-width">
                      <label>Address</label>
                      <p>{profile?.address || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        ) : (
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
                <div className="plan-features-list">
                  {profile?.plan === 'free' && (
                    <>
                      <div className="feature">✓ Up to 10 invoices per month</div>
                      <div className="feature">✓ Basic email templates</div>
                      <div className="feature">✓ Standard support</div>
                      <div className="feature upgrade-note">
                        Upgrade to unlock more features!
                      </div>
                    </>
                  )}
                  {profile?.plan === 'basic' && (
                    <>
                      <div className="feature">✓ Up to 50 invoices per month</div>
                      <div className="feature">✓ Professional email templates</div>
                      <div className="feature">✓ Priority email support</div>
                      <div className="feature">✓ Custom branding</div>
                    </>
                  )}
                  {profile?.plan === 'premium' && (
                    <>
                      <div className="feature">✓ Unlimited invoices</div>
                      <div className="feature">✓ Advanced email templates</div>
                      <div className="feature">✓ 24/7 priority support</div>
                      <div className="feature">✓ Custom branding & logos</div>
                      <div className="feature">✓ Advanced analytics</div>
                      <div className="feature">✓ API access</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {(profile?.plan === 'free' || !profile?.plan) && (
              <div className="upgrade-section">
                <h3>Upgrade Your Plan</h3>
                <p>Get access to more features and higher limits</p>
                <StripePayment />
              </div>
            )}

            {profile?.plan !== 'free' && profile?.plan && (
              <div className="subscription-info">
                <h3>Subscription Management</h3>
                <div className="subscription-card">
                  <div className="subscription-details">
                    <div className="detail-item">
                      <label>Current Plan</label>
                      <span>{profile?.plan || 'free'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Status</label>
                      <span className={`status ${profile?.subscriptionStatus || 'inactive'}`}>
                        {profile?.subscriptionStatus || 'inactive'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Billing</label>
                      <span>Managed by Stripe</span>
                    </div>
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;