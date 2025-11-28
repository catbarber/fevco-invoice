import React, { useState } from 'react';
import AdComponent from './AdComponent/AdComponent';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const { signInWithGoogle } = useAuth();
  const [showNewUserInfo, setShowNewUserInfo] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const features = [
    {
      icon: '📄',
      title: 'Create Professional Invoices',
      description: 'Generate beautiful, customizable invoices in seconds'
    },
    {
      icon: '✉️',
      title: 'Email Invoices Directly',
      description: 'Send invoices to clients with one click'
    },
    {
      icon: '💰',
      title: 'Track Payments',
      description: 'Monitor invoice status and payment history'
    },
    {
      icon: '📱',
      title: 'Access Anywhere',
      description: 'Use on desktop, tablet, or mobile'
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description: 'Your data is protected with enterprise security'
    },
    {
      icon: '🚀',
      title: 'Free to Start',
      description: 'Free plan available with upgrade options'
    }
  ];

  const plans = [
    {
      name: 'Free Plan',
      price: '$0',
      features: ['10 invoices per month', 'Basic templates', 'Email support'],
      color: '#6c757d'
    },
    {
      name: 'Basic Plan',
      price: '$4.99/month',
      features: ['50 invoices per month', 'Professional templates', 'Priority support'],
      color: '#007bff'
    },
    {
      name: 'Premium Plan',
      price: '$8.99/month',
      features: ['Unlimited invoices', 'Advanced templates', '24/7 support', 'API access'],
      color: '#6f42c1'
    }
  ];

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Simply Invoicing</h1>
          <p className="login-subtitle">Manage your invoices efficiently</p>
        </div>

        <div className="login-buttons">
          <button
            className="google-signin-btn"
            onClick={handleGoogleSignIn}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          <button
            className="new-user-btn"
            onClick={() => setShowNewUserInfo(true)}
          >
            🆕 New User? Click Here
          </button>
        </div>
      </div>

      {/* Ad Component integrated below the login card */}
      <div className="login-ad">
        <AdComponent />
      </div>
      <div style={{
        borderTop: '1px solid rgba(247, 247, 247, 0.93)',
        paddingTop: '1rem',
        textAlign: 'center',
        opacity: 0.7
      }}>
        <p style={{
          color: "#fff"
        }}>&copy; 2025 Created by <a href='https://chris-feveck.web.app' target='_blank'>Chris</a>. All rights reserved.</p>
      </div>
      {/* New User Information Modal */}
      {showNewUserInfo && (
        <div className="modal-overlay">
          <div className="new-user-modal">
            <div className="modal-header">
              <h2>Welcome to Simply Invoicing! 🎉</h2>
              <button
                className="close-modal"
                onClick={() => setShowNewUserInfo(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="welcome-section">
                <p className="welcome-text">
                  Simply Invoicing helps you create, send, and manage professional invoices
                  effortlessly. Perfect for freelancers, small businesses, and entrepreneurs.
                </p>
              </div>

              <div className="features-section">
                <h3>✨ Key Features</h3>
                <div className="features-grid">
                  {features.map((feature, index) => (
                    <div key={index} className="feature-card">
                      <div className="feature-icon">{feature.icon}</div>
                      <div className="feature-content">
                        <h4>{feature.title}</h4>
                        <p>{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="plans-section">
                <h3>💳 Pricing Plans</h3>
                <div className="plans-grid">
                  {plans.map((plan, index) => (
                    <div
                      key={index}
                      className="plan-card"
                      style={{ borderTop: `4px solid ${plan.color}` }}
                    >
                      <div className="plan-header">
                        <h4>{plan.name}</h4>
                        <div className="plan-price">{plan.price}</div>
                      </div>
                      <ul className="plan-features">
                        {plan.features.map((feature, idx) => (
                          <li key={idx}>✓ {feature}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="getting-started">
                <h3>🚀 Getting Started</h3>
                <div className="steps">
                  <div className="step">
                    <span className="step-number">1</span>
                    <div className="step-content">
                      <strong>Sign up with Google</strong>
                      <p>Quick and secure authentication</p>
                    </div>
                  </div>
                  <div className="step">
                    <span className="step-number">2</span>
                    <div className="step-content">
                      <strong>Create your first invoice</strong>
                      <p>Use our intuitive invoice builder</p>
                    </div>
                  </div>
                  <div className="step">
                    <span className="step-number">3</span>
                    <div className="step-content">
                      <strong>Send to clients</strong>
                      <p>Email invoices directly from the app</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-primary large"
                  onClick={handleGoogleSignIn}
                >
                  Get Started Free
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowNewUserInfo(false)}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;