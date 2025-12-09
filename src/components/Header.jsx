import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import '../styles/Header.css';

const Header = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const headerRef = useRef(null);
  const lastScrollY = useRef(0);

  // Handle scroll effect with mobile optimization
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 10);
      
      if (window.innerWidth < 768 && headerRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        if (currentScrollY > lastScrollY.current && currentScrollY > headerHeight) {
          headerRef.current.style.transform = 'translateY(-100%)';
        } else {
          headerRef.current.style.transform = 'translateY(0)';
        }
      }
      lastScrollY.current = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    const handleResize = () => {
      if (window.innerWidth >= 768 && headerRef.current) {
        headerRef.current.style.transform = 'translateY(0)';
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu') && !event.target.closest('.mobile-menu')) {
        setShowDropdown(false);
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [showMobileMenu]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setShowDropdown(false);
      setShowMobileMenu(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout: ' + error.message);
    }
  }, [logout, navigate]);

  const toggleDropdown = useCallback((e) => {
    e?.stopPropagation();
    setShowDropdown(prev => !prev);
    setShowMobileMenu(false);
  }, []);

  const toggleMobileMenu = useCallback((e) => {
    e?.stopPropagation();
    setShowMobileMenu(prev => !prev);
    setShowDropdown(false);
  }, []);

  const handleNavigation = useCallback((path) => {
    setShowMobileMenu(false);
    navigate(path);
  }, [navigate]);

  const getInitials = useCallback((name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email ? email[0].toUpperCase() : 'U';
  }, []);

  // Navigation items - now used in both desktop nav and dropdown
  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: 'dashboard', desc: 'Overview & analytics' },
    { id: 'invoices', path: '/invoices', label: 'Invoices', icon: 'receipt', desc: 'Manage invoices' },
    { id: 'clients', path: '/clients', label: 'Clients', icon: 'group', desc: 'Client directory' },
    { id: 'reports', path: '/reports', label: 'Reports', icon: 'analytics', desc: 'Business insights' },
  ];

  const dropdownItems = [
    { id: 'profile', path: '/profile', label: 'Profile', icon: 'person', desc: 'Account settings' },
    // { id: 'billing', path: '/billing', label: 'Billing', icon: 'credit_card', desc: 'Subscription & plans' },
    { id: 'help', path: '/help', label: 'Help & Support', icon: 'help', desc: 'Documentation & help' },
    { id: 'settings', path: '/settings', label: 'Settings', icon: 'settings', desc: 'App preferences' },
    { type: 'divider' },
    { id: 'logout', label: 'Sign Out', icon: 'logout', onClick: handleLogout, className: 'logout-btn' },
  ];

  if (!user) return null;

  return (
    <header 
      ref={headerRef}
      className={`header ${isScrolled ? 'scrolled' : ''} ${showMobileMenu ? 'menu-open' : ''}`}
      role="banner"
    >
      <div className="header-container">
        {/* Brand Section */}
        <div className="header-brand">
          <Link 
            to="/dashboard"
            className="brand-link"
            aria-label="Simply Invoicing Home"
            onClick={() => setShowMobileMenu(false)}
          >
            <div className="brand-logo">
              <span className="logo-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="url(#gradient)" />
                  <path d="M14 2V8H20" fill="#E3F2FD" />
                  <defs>
                    <linearGradient id="gradient" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3B82F6" />
                      <stop offset="1" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </div>
            <div className="brand-text">
              <h1 className="header-title">Simply Invoicing</h1>
              <span className="app-tagline">Streamline your billing</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="header-nav desktop-nav" aria-label="Primary navigation">
          <ul className="nav-list">
            {navItems.map((item) => (
              <NavItem 
                key={item.id}
                item={item}
                currentPath={location.pathname}
              />
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="header-user">
          {loading ? (
            <div className="user-loading" aria-label="Loading user information">
              <div className="loading-spinner" aria-hidden="true"></div>
            </div>
          ) : (
            <div className="user-menu">
              <button 
                className="user-trigger"
                onClick={toggleDropdown}
                onTouchStart={toggleDropdown}
                aria-expanded={showDropdown}
                aria-haspopup="true"
                aria-label="User menu"
                aria-controls="user-dropdown"
              >
                <div className="user-avatar" aria-hidden="true">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || user.email}
                      className="avatar-image"
                      loading="lazy"
                      width="36"
                      height="36"
                      onError={(e) => {
                        const target = e.target;
                        target.style.display = 'none';
                        const fallback = target.parentNode.querySelector('.avatar-fallback');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span className="avatar-fallback">
                    {getInitials(user.displayName, user.email)}
                  </span>
                </div>
                <div className="user-info">
                  <span className="user-name" title={user.displayName || 'User'}>
                    {user.displayName || 'User'}
                  </span>
                  <span className="user-email" title={user.email}>
                    {user.email}
                  </span>
                </div>
                <span className="dropdown-arrow" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </span>
              </button>

              {showDropdown && (
                <UserDropdown
                  user={user}
                  getInitials={getInitials}
                  navItems={navItems}
                  dropdownItems={dropdownItems}
                  currentPath={location.pathname}
                  onClose={() => setShowDropdown(false)}
                />
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={toggleMobileMenu}
          onTouchStart={toggleMobileMenu}
          aria-label="Menu"
          aria-expanded={showMobileMenu}
          aria-controls="mobile-menu"
        >
          <span className="menu-icon" aria-hidden="true">
            {showMobileMenu ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            )}
          </span>
        </button>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <MobileMenu
          user={user}
          getInitials={getInitials}
          navItems={navItems}
          dropdownItems={dropdownItems}
          onClose={() => setShowMobileMenu(false)}
          currentPath={location.pathname}
          onNavigate={handleNavigation}
        />
      )}
    </header>
  );
};

const NavItem = ({ item, currentPath }) => {
  const isActive = currentPath === item.path || 
                   (item.path === '/dashboard' && (currentPath === '/' || currentPath === '/dashboard')) ||
                   (item.path === '/invoices' && currentPath.startsWith('/invoice'));
  
  return (
    <li className="nav-item">
      <Link 
        to={item.path}
        className={`nav-link ${isActive ? 'active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="nav-icon" aria-hidden="true">
          <MaterialIcon name={item.icon} />
        </span>
        <span className="nav-label">{item.label}</span>
      </Link>
    </li>
  );
};

const MaterialIcon = ({ name }) => {
  const icons = {
    dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    receipt: 'M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5zM19 19.09H5V4.91h14v14.18z',
    group: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    analytics: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-5h2v5zm4 0h-2v-3h2v3zm0-5h-2v-2h2v2zm4 5h-2V7h2v10z',
    person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    help: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
    logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
    credit_card: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
    settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  };

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d={icons[name] || icons.help} />
    </svg>
  );
};

// Enhanced User Dropdown Component
const UserDropdown = ({ user, getInitials, navItems, dropdownItems, currentPath, onClose }) => {
  const navigate = useNavigate();

  const handleItemClick = useCallback((item) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      navigate(item.path);
    }
    onClose();
  }, [navigate, onClose]);

  const handleNavClick = useCallback((path) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const isActive = (path) => {
    return currentPath === path || 
           (path === '/dashboard' && (currentPath === '/' || currentPath === '/dashboard')) ||
           (path === '/invoices' && currentPath.startsWith('/invoice'));
  };

  return (
    <>
      <div 
        className="dropdown-backdrop"
        onClick={onClose}
        onTouchStart={onClose}
        aria-hidden="true"
      />
      <div 
        className="user-dropdown"
        role="menu"
        aria-label="User menu"
        id="user-dropdown"
      >
        {/* User Profile Section */}
        <div className="dropdown-header">
          <div className="dropdown-avatar" aria-hidden="true">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || user.email}
                className="avatar-image"
                width="44"
                height="44"
                onError={(e) => {
                  const target = e.target;
                  target.style.display = 'none';
                  const fallback = target.parentNode.querySelector('.avatar-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <span className="avatar-fallback">
              {getInitials(user.displayName, user.email)}
            </span>
          </div>
          <div className="dropdown-user-info">
            <div className="dropdown-name" title={user.displayName || 'User'}>
              {user.displayName || 'User'}
            </div>
            <div className="dropdown-email" title={user.email}>
              {user.email}
            </div>
            <div className="dropdown-plan">
              <span className="plan-badge">Pro Plan</span>
            </div>
          </div>
        </div>

        <div className="dropdown-divider"></div>

        {/* Navigation Section */}
        <div className="dropdown-section">
          <h3 className="dropdown-section-title">Navigation</h3>
          <div className="dropdown-nav-grid">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`dropdown-nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
                onTouchStart={() => handleNavClick(item.path)}
                role="menuitem"
              >
                <div className="dropdown-nav-icon">
                  <MaterialIcon name={item.icon} />
                </div>
                <div className="dropdown-nav-content">
                  <div className="dropdown-nav-label">{item.label}</div>
                  <div className="dropdown-nav-desc">{item.desc}</div>
                </div>
                {isActive(item.path) && (
                  <div className="nav-active-indicator" aria-hidden="true"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="dropdown-divider"></div>

        {/* Account Section */}
        <div className="dropdown-section">
          <h3 className="dropdown-section-title">Account</h3>
          <div className="dropdown-content">
            {dropdownItems.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={index} className="dropdown-divider" aria-hidden="true" />;
              }
              
              return (
                <button 
                  key={item.id}
                  className={`dropdown-item ${item.className || ''} ${item.desc ? 'with-desc' : ''}`}
                  onClick={() => handleItemClick(item)}
                  onTouchStart={() => handleItemClick(item)}
                  role="menuitem"
                >
                  <span className="dropdown-icon" aria-hidden="true">
                    <MaterialIcon name={item.icon} />
                  </span>
                  <span className="dropdown-text">
                    <span className="dropdown-item-label">{item.label}</span>
                    {item.desc && (
                      <span className="dropdown-item-desc">{item.desc}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="dropdown-footer">
          <div className="dropdown-footer-content">
            <button className="dropdown-footer-item">
              <span className="dropdown-icon" aria-hidden="true">
                <MaterialIcon name="help" />
              </span>
              <span className="dropdown-footer-text">Keyboard shortcuts</span>
              <span className="dropdown-shortcut">⌘K</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Mobile Menu Component
const MobileMenu = ({ user, getInitials, navItems, dropdownItems, onClose, currentPath, onNavigate }) => {
  const handleItemClick = useCallback((item) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      onNavigate(item.path);
    }
  }, [onNavigate]);

  const isActive = (path) => {
    return currentPath === path || 
           (path === '/dashboard' && (currentPath === '/' || currentPath === '/dashboard')) ||
           (path === '/invoices' && currentPath.startsWith('/invoice'));
  };

  return (
    <>
      <div 
        className="mobile-menu-backdrop"
        onClick={onClose}
        onTouchStart={onClose}
        aria-hidden="true"
      />
      <div 
        className="mobile-menu"
        role="dialog"
        aria-label="Mobile menu"
        id="mobile-menu"
      >
        <div className="mobile-menu-handle" onClick={onClose}>
          <div className="drag-indicator"></div>
        </div>

        <div className="mobile-menu-header">
          <div className="mobile-user-info">
            <div className="mobile-avatar" aria-hidden="true">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || user.email}
                  className="avatar-image"
                  width="48"
                  height="48"
                  onError={(e) => {
                    const target = e.target;
                    target.style.display = 'none';
                    const fallback = target.parentNode.querySelector('.avatar-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <span className="avatar-fallback">
                {getInitials(user.displayName, user.email)}
              </span>
            </div>
            <div className="mobile-user-details">
              <div className="mobile-user-name" title={user.displayName || 'User'}>
                {user.displayName || 'User'}
              </div>
              <div className="mobile-user-email" title={user.email}>
                {user.email}
              </div>
              <div className="mobile-user-plan">
                <span className="plan-badge">Pro Plan</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          <div className="mobile-section">
            <h3 className="mobile-section-title">Navigation</h3>
            <ul className="mobile-nav-list">
              {navItems.map((item) => (
                <li key={item.id} className="mobile-nav-item">
                  <button
                    className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => onNavigate(item.path)}
                    onTouchStart={() => onNavigate(item.path)}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <span className="mobile-nav-icon" aria-hidden="true">
                      <MaterialIcon name={item.icon} />
                    </span>
                    <div className="mobile-nav-content">
                      <span className="mobile-nav-label">{item.label}</span>
                      <span className="mobile-nav-desc">{item.desc}</span>
                    </div>
                    {isActive(item.path) && <span className="nav-indicator" aria-hidden="true"></span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="mobile-divider"></div>

        <div className="mobile-section">
          <h3 className="mobile-section-title">Account</h3>
          <div className="mobile-actions">
            {dropdownItems.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={index} className="mobile-divider" aria-hidden="true" />;
              }
              
              return (
                <button 
                  key={item.id}
                  className={`mobile-action-item ${item.className || ''}`}
                  onClick={() => handleItemClick(item)}
                  onTouchStart={() => handleItemClick(item)}
                >
                  <span className="mobile-action-icon" aria-hidden="true">
                    <MaterialIcon name={item.icon} />
                  </span>
                  <div className="mobile-action-content">
                    <span className="mobile-action-label">{item.label}</span>
                    {item.desc && (
                      <span className="mobile-action-desc">{item.desc}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="mobile-safety-area"></div>
      </div>
    </>
  );
};

export default Header;