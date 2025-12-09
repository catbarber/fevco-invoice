import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Help.css';

const Help = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [openFaqs, setOpenFaqs] = useState([]);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const contactFormRef = useRef(null);

  // FAQ Data
  const faqData = {
    'getting-started': [
      {
        id: 'gs1',
        question: 'How do I create my first invoice?',
        answer: 'To create your first invoice, navigate to the "Create Invoice" page from the sidebar or click the "New Invoice" button. Fill in your client details, add line items with descriptions and prices, set payment terms, and click "Save & Send". Your invoice will be saved and can be sent to the client via email.'
      },
      {
        id: 'gs2',
        question: 'How do I add my company information?',
        answer: 'Go to your Profile page and click on "Company Settings". Here you can add your business name, address, contact information, logo, and tax details. This information will automatically appear on all your invoices.'
      },
      {
        id: 'gs3',
        question: 'Can I import existing clients?',
        answer: 'Yes! You can import clients by going to the Clients page and clicking "Import Clients". We support CSV and Excel file formats. Download our template first to ensure proper formatting.'
      }
    ],
    'billing': [
      {
        id: 'b1',
        question: 'How are payments processed?',
        answer: 'Simply Invoicing supports multiple payment methods including credit cards, bank transfers, and PayPal. When you send an invoice, clients can click the "Pay Now" button to complete payment securely through our integrated payment gateway.'
      },
      {
        id: 'b2',
        question: 'What payment methods do you accept?',
        answer: 'We accept Visa, MasterCard, American Express, PayPal, and direct bank transfers. All payments are processed securely with 256-bit SSL encryption.'
      },
      {
        id: 'b3',
        question: 'Are there any transaction fees?',
        answer: 'Credit card payments have a 2.9% + $0.30 transaction fee. Bank transfers and PayPal payments have a 1% fee (minimum $1). These fees are automatically deducted from received payments.'
      }
    ],
    'features': [
      {
        id: 'f1',
        question: 'Can I customize invoice templates?',
        answer: 'Absolutely! Go to Settings > Invoice Templates to choose from our professional templates. You can customize colors, fonts, add your logo, and modify layout to match your brand.'
      },
      {
        id: 'f2',
        question: 'Does it support recurring invoices?',
        answer: 'Yes, you can set up recurring invoices for regular clients. Create an invoice once and set it to recur daily, weekly, monthly, or annually. The system will automatically generate and send invoices on schedule.'
      },
      {
        id: 'f3',
        question: 'Can I track invoice status?',
        answer: 'The dashboard shows real-time status of all invoices: Draft, Sent, Viewed, Paid, Overdue, or Cancelled. You\'ll also receive notifications when clients view or pay invoices.'
      }
    ],
    'account': [
      {
        id: 'a1',
        question: 'How do I reset my password?',
        answer: 'Click on your profile picture in the top right corner, select "Profile", then "Security". Click "Change Password" and follow the instructions. If you\'ve forgotten your password, click "Forgot Password" on the login page.'
      },
      {
        id: 'a2',
        question: 'Can I have multiple users on one account?',
        answer: 'Yes, our Professional and Business plans support multiple users. Go to Settings > Team Management to invite team members and set their permissions (Admin, Editor, or Viewer).'
      },
      {
        id: 'a3',
        question: 'How do I export my data?',
        answer: 'Navigate to Reports > Export Data. You can export invoices, clients, payments, and reports in PDF, CSV, or Excel format. All data exports include your complete transaction history.'
      }
    ]
  };

  // Guide categories
  const guideCategories = [
    { id: 'getting-started', icon: '🚀', title: 'Getting Started', description: 'Learn the basics' },
    { id: 'billing', icon: '💰', title: 'Billing & Payments', description: 'Manage transactions' },
    { id: 'features', icon: '✨', title: 'Features', description: 'Explore capabilities' },
    { id: 'account', icon: '👤', title: 'Account', description: 'Manage your profile' }
  ];

  const toggleFaq = (faqId) => {
    setOpenFaqs(prev => 
      prev.includes(faqId) 
        ? prev.filter(id => id !== faqId)
        : [...prev, faqId]
    );
  };

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSubmitStatus('success');
    setContactForm({
      name: '',
      email: '',
      subject: '',
      message: '',
      category: 'general'
    });
    
    setIsSubmitting(false);
    
    // Reset status after 5 seconds
    setTimeout(() => {
      setSubmitStatus(null);
    }, 5000);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const scrollToContact = () => {
    contactFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="help-container">
      {/* Header */}
      <header className="help-header">
        <div className="help-header-content">
          <button 
            className="back-button"
            onClick={handleBackToDashboard}
            aria-label="Back to dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="help-title">Help & Support</h1>
          <p className="help-subtitle">
            Find answers, guides, and get support for Simply Invoicing
          </p>
        </div>
      </header>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search for help articles, guides, or FAQs..."
            aria-label="Search help articles"
          />
          <button className="search-button">Search</button>
        </div>
      </div>

      {/* Quick Help Cards */}
      <div className="quick-help-section">
        <h2 className="section-title">Quick Help</h2>
        <div className="quick-help-grid">
          <div className="help-card">
            <div className="card-icon">📄</div>
            <h3 className="card-title">Create Invoice</h3>
            <p className="card-description">Step-by-step guide to creating and sending invoices</p>
            <button className="card-action" onClick={() => setActiveCategory('getting-started')}>
              View Guide
            </button>
          </div>
          
          <div className="help-card">
            <div className="card-icon">💰</div>
            <h3 className="card-title">Manage Payments</h3>
            <p className="card-description">Learn about payment processing and fees</p>
            <button className="card-action" onClick={() => setActiveCategory('billing')}>
              View Guide
            </button>
          </div>
          
          <div className="help-card">
            <div className="card-icon">👥</div>
            <h3 className="card-title">Client Management</h3>
            <p className="card-description">Add, import, and manage your clients</p>
            <button className="card-action" onClick={() => navigate('/clients')}>
              View Guide
            </button>
          </div>
          
          <div className="help-card">
            <div className="card-icon">⚙️</div>
            <h3 className="card-title">Account Settings</h3>
            <p className="card-description">Update your profile and preferences</p>
            <button className="card-action" onClick={() => navigate('/profile')}>
              View Settings
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="faq-section">
        <h2 className="section-title">Frequently Asked Questions</h2>
        
        <div className="faq-categories">
          {guideCategories.map(category => (
            <button
              key={category.id}
              className={`category-button ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-title">{category.title}</span>
              <span className="category-description">{category.description}</span>
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="faq-list">
          {faqData[activeCategory]?.map(faq => (
            <div 
              key={faq.id} 
              className={`faq-item ${openFaqs.includes(faq.id) ? 'open' : ''}`}
            >
              <button 
                className="faq-question"
                onClick={() => toggleFaq(faq.id)}
                aria-expanded={openFaqs.includes(faq.id)}
              >
                <span className="faq-text">{faq.question}</span>
                <span className="faq-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d={openFaqs.includes(faq.id) ? "M19 13H5v-2h14v2z" : "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"} />
                  </svg>
                </span>
              </button>
              {openFaqs.includes(faq.id) && (
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                  {faq.id === 'gs1' && (
                    <div className="faq-extra">
                      <button 
                        className="action-button primary"
                        onClick={() => navigate('/create-invoice')}
                      >
                        Try It Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support Section */}
      <div className="contact-section" ref={contactFormRef}>
        <div className="contact-container">
          <div className="contact-info">
            <h2 className="section-title">Still Need Help?</h2>
            <p className="contact-description">
              Our support team is here to help you with any questions or issues.
            </p>
            
            <div className="contact-methods">
              <div className="contact-method">
                <div className="method-icon">📧</div>
                <div className="method-details">
                  <h4>Email Support</h4>
                  <p>support@simplyinvoicing.com</p>
                  <span className="method-hint">Typically responds within 2 hours</span>
                </div>
              </div>
              
              <div className="contact-method">
                <div className="method-icon">💬</div>
                <div className="method-details">
                  <h4>Live Chat</h4>
                  <p>Available 9AM-6PM EST</p>
                  <span className="method-hint">Click the chat icon in the bottom right</span>
                </div>
              </div>
              
              <div className="contact-method">
                <div className="method-icon">📞</div>
                <div className="method-details">
                  <h4>Phone Support</h4>
                  <p>+1 (555) 123-4567</p>
                  <span className="method-hint">Mon-Fri, 8AM-8PM EST</span>
                </div>
              </div>
            </div>
            
            <div className="urgent-help">
              <div className="urgent-icon">🚨</div>
              <div className="urgent-content">
                <h4>Urgent Support</h4>
                <p>For critical issues affecting your business, use our priority support line.</p>
                <button className="urgent-button">
                  Emergency Contact
                </button>
              </div>
            </div>
          </div>
          
          <div className="contact-form-container">
            <h3 className="form-title">Send us a message</h3>
            
            {submitStatus === 'success' && (
              <div className="success-message">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span>Message sent successfully! We'll get back to you within 24 hours.</span>
              </div>
            )}
            
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Your Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    required
                    placeholder="John Smith"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleContactChange}
                    required
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={contactForm.subject}
                  onChange={handleContactChange}
                  required
                  placeholder="How can we help?"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={contactForm.category}
                  onChange={handleContactChange}
                  required
                >
                  <option value="general">General Inquiry</option>
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing Question</option>
                  <option value="feature">Feature Request</option>
                  <option value="bug">Bug Report</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={contactForm.message}
                  onChange={handleContactChange}
                  required
                  rows="6"
                  placeholder="Please describe your question or issue in detail..."
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading-spinner"></span>
                      Sending...
                    </>
                  ) : 'Send Message'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setContactForm({
                    name: '',
                    email: '',
                    subject: '',
                    message: '',
                    category: 'general'
                  })}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="help-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Documentation</h4>
            <a href="/docs/api" className="footer-link">API Documentation</a>
            <a href="/docs/developers" className="footer-link">Developer Guide</a>
            <a href="/docs/security" className="footer-link">Security</a>
          </div>
          
          <div className="footer-section">
            <h4>Community</h4>
            <a href="https://community.simplyinvoicing.com" className="footer-link">User Forum</a>
            <a href="https://blog.simplyinvoicing.com" className="footer-link">Blog & Updates</a>
            <a href="/webinars" className="footer-link">Webinars & Tutorials</a>
          </div>
          
          <div className="footer-section">
            <h4>Legal</h4>
            <a href="/terms" className="footer-link">Terms of Service</a>
            <a href="/privacy" className="footer-link">Privacy Policy</a>
            <a href="/cookies" className="footer-link">Cookie Policy</a>
          </div>
          
          <div className="footer-section">
            <h4>Version</h4>
            <p className="version-info">Simply Invoicing v2.4.1</p>
            <p className="update-info">Last updated: December 2024</p>
            <button className="check-updates">Check for Updates</button>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Simply Invoicing. All rights reserved.</p>
          <p>Made with ❤️ for small businesses everywhere.</p>
        </div>
      </footer>

      {/* Floating Action Button */}
      <button className="fab" onClick={scrollToContact} aria-label="Contact support">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zm-9-4h2v2h-2zm0-6h2v4h-2z" />
        </svg>
      </button>
    </div>
  );
};

export default Help;