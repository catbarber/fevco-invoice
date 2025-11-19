// src/components/SubscriptionStatus.jsx
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

const SubscriptionStatus = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubscriptionStatus();
    }
  }, [user]);

  const loadSubscriptionStatus = async () => {
    try {
      const getStatus = httpsCallable(functions, 'getSubscriptionStatus');
      const result = await getStatus();
      setSubscription(result.data.subscription);
      setUsage(result.data.usage);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading subscription status...</div>;
  }

  if (!subscription) {
    return <div>No subscription data found.</div>;
  }

  return (
    <div className="subscription-status">
      <h3>Your Subscription</h3>
      
      <div className="status-card">
        <div className="plan-info">
          <h4>{subscription.plan.toUpperCase()} PLAN</h4>
          <p>${subscription.price}/month</p>
          <span className={`status-badge ${subscription.status}`}>
            {subscription.status}
          </span>
        </div>

        <div className="usage-info">
          <h5>Monthly Usage</h5>
          <div className="usage-bar">
            <div 
              className="usage-progress"
              style={{ width: `${usage.usagePercentage}%` }}
            ></div>
          </div>
          <p>{usage.invoicesThisMonth} / {usage.invoiceLimit} invoices used</p>
        </div>

        <div className="features-status">
          <h5>Features</h5>
          <ul>
            <li>Custom Templates: {usage.hasCustomTemplates ? '✅' : '❌'}</li>
            <li>Advanced Analytics: {usage.hasAdvancedAnalytics ? '✅' : '❌'}</li>
            <li>API Access: {usage.hasApiAccess ? '✅' : '❌'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatus;