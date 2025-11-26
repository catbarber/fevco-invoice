import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('subscription');
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState({});
  const [invoiceUsage, setInvoiceUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load subscription status
      const getSubscriptionStatus = httpsCallable(functions, 'getSubscriptionStatus');
      const subscriptionResult = await getSubscriptionStatus();
      setSubscription(subscriptionResult.data.subscription);

      // Load pricing plans
      const getPricingPlans = httpsCallable(functions, 'getPricingPlans');
      const plansResult = await getPricingPlans();
      setPlans(plansResult.data.plans);

      // Load invoice usage
      const checkInvoiceLimit = httpsCallable(functions, 'checkInvoiceLimit');
      const usageResult = await checkInvoiceLimit();
      setInvoiceUsage(usageResult.data);

    } catch (error) {
      console.error('Error loading profile data:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId, priceId) => {
    if (!priceId) {
      setMessage({ type: 'error', text: 'This plan is not available for purchase' });
      return;
    }

    try {
      setUpdating(true);
      setMessage({ type: '', text: '' });

      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession({ 
        priceId, 
        planId 
      });

      // Redirect to Stripe Checkout
      window.location.href = result.data.url;

    } catch (error) {
      console.error('Error creating checkout session:', error);
      setMessage({ type: 'error', text: `Failed to start subscription: ${error.message}` });
    } finally {
      setUpdating(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setUpdating(true);
      setMessage({ type: '', text: '' });

      const createCustomerPortalSession = httpsCallable(functions, 'createCustomerPortalSession');
      const result = await createCustomerPortalSession();

      // Redirect to Stripe Customer Portal
      window.location.href = result.data.url;

    } catch (error) {
      console.error('Error creating portal session:', error);
      setMessage({ type: 'error', text: `Failed to open customer portal: ${error.message}` });
    } finally {
      setUpdating(false);
    }
  };

  const getPlanDisplayName = (planId) => {
    const plan = plans[planId];
    return plan ? plan.name : 'Free';
  };

  const getPlanPrice = (planId) => {
    const plan = plans[planId];
    return plan ? `$${plan.price}/${plan.interval}` : 'Free';
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Account Profile</h1>
        <p>Manage your subscription and account settings</p>
      </div>

      {message.text && (
        <div className={`profile-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'subscription' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscription')}
        >
          💳 Subscription
        </button>
        <button 
          className={`tab-btn ${activeTab === 'usage' ? 'active' : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          📊 Usage
        </button>
        <button 
          className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          👤 Account
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'subscription' && (
          <div className="subscription-section">
            <div className="current-plan-card">
              <h2>Current Plan</h2>
              <div className="plan-details">
                <div className="plan-name">{getPlanDisplayName(subscription?.plan)}</div>
                <div className="plan-price">{getPlanPrice(subscription?.plan)}</div>
                <div className="plan-status">
                  Status: <span className={`status-badge ${subscription?.status}`}>
                    {subscription?.status?.charAt(0).toUpperCase() + subscription?.status?.slice(1)}
                  </span>
                </div>
                {subscription?.currentPeriodEnd && (
                  <div className="renewal-date">
                    Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              {subscription?.status === 'active' && subscription.plan !== 'free' && (
                <button 
                  onClick={handleManageSubscription}
                  disabled={updating}
                  className="manage-subscription-btn"
                >
                  {updating ? 'Loading...' : 'Manage Subscription'}
                </button>
              )}
            </div>

            <div className="upgrade-section">
              <h2>Upgrade Your Plan</h2>
              <p>Choose the plan that works best for your business</p>
              
              <div className="plans-grid">
                {Object.values(plans).map((plan) => (
                  <div 
                    key={plan.id} 
                    className={`plan-card ${subscription?.plan === plan.id ? 'current' : ''} ${
                      plan.id === 'premium' ? 'featured' : ''
                    }`}
                  >
                    {plan.id === 'premium' && <div className="popular-badge">Most Popular</div>}
                    
                    <div className="plan-header">
                      <h3>{plan.name}</h3>
                      <div className="plan-price">
                        {plan.price === 0 ? 'Free' : `$${plan.price}/${plan.interval}`}
                      </div>
                    </div>

                    <div className="plan-features">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="feature">
                          <span className="checkmark">✓</span>
                          {feature}
                        </div>
                      ))}
                    </div>

                    <div className="plan-action">
                      {subscription?.plan === plan.id ? (
                        <button className="current-plan-btn" disabled>
                          Current Plan
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleSubscribe(plan.id, plan.stripePriceId)}
                          disabled={updating || !plan.stripePriceId}
                          className="subscribe-btn"
                        >
                          {updating ? 'Processing...' : 
                           plan.price === 0 ? 'Select Free' : 'Upgrade Now'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usage' && invoiceUsage && (
          <div className="usage-section">
            <h2>Invoice Usage</h2>
            <div className="usage-card">
              <div className="usage-header">
                <div className="usage-info">
                  <h3>Monthly Invoice Limit</h3>
                  <p>Your usage resets on the first of each month</p>
                </div>
                <div className="usage-stats">
                  <span className="usage-count">{invoiceUsage.currentCount}</span>
                  <span className="usage-separator">/</span>
                  <span className="usage-limit">{invoiceUsage.limit}</span>
                </div>
              </div>
              
              <div className="usage-bar">
                <div 
                  className="usage-progress"
                  style={{ 
                    width: `${Math.min((invoiceUsage.currentCount / invoiceUsage.limit) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              
              <div className="usage-footer">
                {invoiceUsage.canCreateMore ? (
                  <div className="usage-message success">
                    You can create {invoiceUsage.limit - invoiceUsage.currentCount} more invoices this month
                  </div>
                ) : (
                  <div className="usage-message warning">
                    You've reached your monthly limit. Upgrade to create more invoices.
                  </div>
                )}
              </div>
            </div>

            <div className="plan-comparison">
              <h3>Plan Comparison</h3>
              <div className="comparison-table">
                <div className="comparison-header">
                  <div>Feature</div>
                  <div>Free</div>
                  <div>Basic</div>
                  <div>Premium</div>
                </div>
                <div className="comparison-row">
                  <div>Monthly Invoices</div>
                  <div>10</div>
                  <div>100</div>
                  <div>Unlimited</div>
                </div>
                <div className="comparison-row">
                  <div>Email Templates</div>
                  <div>Basic</div>
                  <div>Professional</div>
                  <div>Advanced</div>
                </div>
                <div className="comparison-row">
                  <div>Support</div>
                  <div>Standard</div>
                  <div>Priority</div>
                  <div>24/7 Priority</div>
                </div>
                <div className="comparison-row">
                  <div>Custom Branding</div>
                  <div>❌</div>
                  <div>✅</div>
                  <div>✅</div>
                </div>
                <div className="comparison-row">
                  <div>Advanced Analytics</div>
                  <div>❌</div>
                  <div>✅</div>
                  <div>✅</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="account-section">
            <h2>Account Information</h2>
            <div className="account-card">
              <div className="account-info">
                <div className="info-row">
                  <label>Name</label>
                  <span>{user.displayName || 'Not set'}</span>
                </div>
                <div className="info-row">
                  <label>Email</label>
                  <span>{user.email}</span>
                </div>
                <div className="info-row">
                  <label>User ID</label>
                  <span className="user-id">{user.uid}</span>
                </div>
                <div className="info-row">
                  <label>Account Created</label>
                  <span>{new Date(user.metadata.creationTime).toLocaleDateString()}</span>
                </div>
                <div className="info-row">
                  <label>Last Sign In</label>
                  <span>{new Date(user.metadata.lastSignInTime).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="account-actions">
              <h3>Account Actions</h3>
              <div className="action-buttons">
                <button className="action-btn secondary">
                  Update Profile
                </button>
                <button className="action-btn secondary">
                  Change Password
                </button>
                <button className="action-btn danger">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;