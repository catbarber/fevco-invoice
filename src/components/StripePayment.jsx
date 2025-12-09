import React, { useState } from 'react';
import '../styles/StripePayment.css';

const StripePayment = () => {
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Your actual Stripe payment links
  const STRIPE_PAYMENT_LINKS = {
    basic: 'https://buy.stripe.com/14A4gz2er1CH2JPcGe3ZK00',
    premium: 'https://buy.stripe.com/fZuaEX7yL815gAFgWu3ZK01'
  };

  const plans = {
    basic: {
      id: 'basic',
      name: 'Basic Plan',
      price: 4.99,
      interval: 'month',
      features: [
        'Up to 10 invoices per month',
        'Professional email templates',
        'Priority email support',
        'Custom branding',
        'Basic analytics',
        'PDF export included'
      ],
      description: 'Perfect for freelancers and small businesses',
      popular: false
    },
    premium: {
      id: 'premium',
      name: 'Premium Plan',
      price: 8.99,
      interval: 'month',
      features: [
        'Unlimited invoices',
        'Advanced email templates',
        '24/7 priority support',
        'Custom branding & logos',
        'Advanced analytics dashboard',
        'API access',
        'Bulk operations',
        'Custom invoice numbering'
      ],
      description: 'Best for growing businesses and agencies',
      popular: true
    }
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const paymentLink = STRIPE_PAYMENT_LINKS[selectedPlan];
      
      if (!paymentLink) {
        throw new Error('Payment link not available for the selected plan.');
      }

      // Open Stripe checkout in a new window
      const paymentWindow = window.open(paymentLink, 'StripeCheckout', 
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!paymentWindow) {
        throw new Error('Please allow popups for this website to complete your payment.');
      }

      // Check if window was successfully opened
      paymentWindow.focus();

      setMessage({ 
        type: 'info', 
        text: 'Opening secure payment window... If it doesn\'t open, please check your popup blocker.' 
      });

      // Reset loading state after a short delay
      setTimeout(() => {
        setLoading(false);
      }, 2000);

    } catch (error) {
      console.error('Payment error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to open payment window. Please try again.' 
      });
      setLoading(false);
    }
  };

  const currentPlan = plans[selectedPlan];

  return (
    <div className="stripe-payment-container">
      <div className="payment-header">
        <h2>Upgrade Your Plan</h2>
        <p>Choose the plan that works best for your business and start accepting payments securely through Stripe</p>
      </div>

      {message.text && (
        <div className={`payment-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="plan-selection">
        <div className="plan-tabs">
          <button
            className={`plan-tab ${selectedPlan === 'basic' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('basic')}
          >
            <span className="plan-name">Basic</span>
            <span className="plan-price">${plans.basic.price}/month</span>
            <span className="plan-savings">Save 50% vs Premium</span>
          </button>
          <button
            className={`plan-tab ${selectedPlan === 'premium' ? 'active' : ''} ${plans.premium.popular ? 'popular' : ''}`}
            onClick={() => setSelectedPlan('premium')}
          >
            {plans.premium.popular && <div className="popular-badge-tab">Most Popular</div>}
            <span className="plan-name">Premium</span>
            <span className="plan-price">${plans.premium.price}/month</span>
            <span className="plan-savings">Best Value</span>
          </button>
        </div>

        <div className="plan-details">
          <div className="plan-card">
            <div className="plan-header">
              <h3>{currentPlan.name}</h3>
              <div className="plan-price-display">
                ${currentPlan.price}
                <span className="interval">/{currentPlan.interval}</span>
              </div>
              {currentPlan.popular && (
                <div className="popular-badge">Most Popular</div>
              )}
            </div>

            <p className="plan-description">{currentPlan.description}</p>

            <div className="plan-features">
              {currentPlan.features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span className="feature-text">{feature}</span>
                </div>
              ))}
            </div>

            <div className="plan-value">
              <div className="value-metric">
                <span className="value-number">
                  {currentPlan.id === 'basic' ? '~$0.10' : 'Unlimited'}
                </span>
                <span className="value-label">
                  {currentPlan.id === 'basic' ? 'per invoice' : 'invoices'}
                </span>
              </div>
            </div>

            <div className="payment-security">
              <div className="security-badges">
                <div className="security-badge">
                  <span className="lock-icon">🔒</span>
                  Secure Payment
                </div>
                <div className="security-badge">
                  <span className="stripe-icon">💳</span>
                  Powered by Stripe
                </div>
                <div className="security-badge">
                  <span className="ssl-icon">🔐</span>
                  SSL Encrypted
                </div>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className={`payment-button ${currentPlan.popular ? 'popular' : ''}`}
            >
              {loading ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Opening Payment...
                </>
              ) : (
                <>
                  <span className="button-icon">🚀</span>
                  Upgrade to {currentPlan.name} - ${currentPlan.price}/month
                </>
              )}
            </button>

            <div className="payment-note">
              <p>You'll be redirected to Stripe to complete your payment securely. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="plan-comparison">
        <h3>Plan Comparison</h3>
        <div className="comparison-table">
          <div className="comparison-row header">
            <div>Feature</div>
            <div>Basic</div>
            <div>Premium</div>
          </div>
          <div className="comparison-row">
            <div>Monthly Price</div>
            <div>$4.99</div>
            <div>$8.99</div>
          </div>
          <div className="comparison-row">
            <div>Invoices per Month</div>
            <div>50</div>
            <div>Unlimited</div>
          </div>
          <div className="comparison-row">
            <div>Email Templates</div>
            <div>Professional</div>
            <div>Advanced</div>
          </div>
          <div className="comparison-row">
            <div>Support</div>
            <div>Priority Email</div>
            <div>24/7 Priority</div>
          </div>
          <div className="comparison-row">
            <div>Custom Branding</div>
            <div>✅</div>
            <div>✅</div>
          </div>
          <div className="comparison-row">
            <div>Analytics</div>
            <div>Basic</div>
            <div>Advanced</div>
          </div>
          <div className="comparison-row">
            <div>API Access</div>
            <div>❌</div>
            <div>✅</div>
          </div>
          <div className="comparison-row">
            <div>Bulk Operations</div>
            <div>❌</div>
            <div>✅</div>
          </div>
        </div>
      </div>

      <div className="stripe-info">
        <div className="stripe-logo">
          <span>Powered by</span>
          <div className="stripe-text">Stripe</div>
        </div>
        <p className="security-info">
          Your payment information is processed securely by Stripe. We never store your credit card details.
          All payments are encrypted and secure.
        </p>
      </div>
    </div>
  );
};

export default StripePayment;