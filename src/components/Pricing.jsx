// src/components/Pricing.jsx
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import { useAuthWithAdmin } from '../hooks/useAuthWithAdmin';
import '../styles/Pricing.css';

const Pricing = () => {
  const { user } = useAuthWithAdmin();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSubscription, setUserSubscription] = useState(null);

  useEffect(() => {
    loadPlans();
    loadUserSubscription();
  }, [user]);

  const loadPlans = async () => {
    try {
      const getPlans = httpsCallable(functions, 'getSubscriptionPlans');
      const result = await getPlans();
      setPlans(result.data.plans);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserSubscription = async () => {
    if (!user) return;
    
    try {
      const getSubscription = httpsCallable(functions, 'getUserSubscription');
      const result = await getSubscription();
      setUserSubscription(result.data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const handleSubscribe = async (priceId) => {
    if (!user) {
      alert('Please sign in to subscribe');
      return;
    }

    try {
      const createCheckout = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckout({
        priceId: priceId,
        successUrl: window.location.origin + '/subscription/success',
        cancelUrl: window.location.origin + '/pricing'
      });

      // Redirect to Stripe Checkout
      window.location.href = result.data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Error starting subscription: ' + error.message);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const createPortal = httpsCallable(functions, 'createCustomerPortalSession');
      const result = await createPortal();
      window.location.href = result.data.url;
    } catch (error) {
      console.error('Error managing subscription:', error);
      alert('Error accessing customer portal: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="pricing-loading">
        <div className="loading-spinner"></div>
        <p>Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>Select the perfect plan for your invoicing needs</p>
        
        {userSubscription?.hasActiveSubscription && (
          <div className="current-plan-banner">
            <span>🎉 You're currently on the <strong>{userSubscription.subscription?.plan?.name}</strong> plan</span>
            <button onClick={handleManageSubscription} className="manage-subscription-btn">
              Manage Subscription
            </button>
          </div>
        )}
      </div>

      <div className="pricing-grid">
        {plans.map((plan, index) => (
          <div key={plan.id} className={`pricing-card ${index === 1 ? 'featured' : ''}`}>
            {index === 1 && <div className="popular-badge">Most Popular</div>}
            
            <div className="plan-header">
              <h3>{plan.name}</h3>
              <div className="price">
                ${plan.price}<span>/month</span>
              </div>
              <p className="plan-description">{plan.description}</p>
            </div>

            <div className="plan-features">
              <ul>
                {plan.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
            </div>

            <div className="plan-limits">
              <div className="limit-item">
                <strong>Invoices:</strong> {plan.limits.invoices}
              </div>
              <div className="limit-item">
                <strong>Clients:</strong> {plan.limits.clients}
              </div>
              <div className="limit-item">
                <strong>Storage:</strong> {plan.limits.storage}
              </div>
            </div>

            <div className="plan-action">
              {userSubscription?.hasActiveSubscription ? (
                userSubscription.subscription?.plan?.id === plan.id ? (
                  <button className="btn-current" disabled>
                    Current Plan
                  </button>
                ) : (
                  <button 
                    className="btn-secondary"
                    onClick={() => handleManageSubscription()}
                  >
                    Change Plan
                  </button>
                )
              ) : (
                <button 
                  className={index === 1 ? 'btn-primary featured-btn' : 'btn-secondary'}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="pricing-faq">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>Can I change plans anytime?</h4>
            <p>Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div className="faq-item">
            <h4>Is there a free trial?</h4>
            <p>All plans include a 14-day free trial. No credit card required to start.</p>
          </div>
          <div className="faq-item">
            <h4>What payment methods do you accept?</h4>
            <p>We accept all major credit cards through our secure Stripe payment processor.</p>
          </div>
          <div className="faq-item">
            <h4>Can I cancel anytime?</h4>
            <p>Yes, you can cancel your subscription at any time. No long-term contracts.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;