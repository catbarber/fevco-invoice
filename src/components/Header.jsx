import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import '../styles/Header.css';

const Header = () => {
  const { user, logout, loading } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout: ' + error.message);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email ? email[0].toUpperCase() : 'U';
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <h1 className="header-title">
            <span className="header-icon">📄</span>
            Simply Invoicing
          </h1>
        </div>

        <div className="header-user">
          {loading ? (
            <div className="user-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : user ? (
            <div className="user-menu">
              <button 
                className="user-trigger"
                onClick={toggleDropdown}
                aria-expanded={showDropdown}
                aria-haspopup="true"
              >
                <div className="user-avatar">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || user.email}
                      className="avatar-image"
                    />
                  ) : (
                    <span className="avatar-fallback">
                      {getInitials(user.displayName, user.email)}
                    </span>
                  )}
                </div>
                <div className="user-info">
                  <span className="user-name">
                    {user.displayName || 'User'}
                  </span>
                  <span className="user-email">
                    {user.email}
                  </span>
                </div>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showDropdown && (
                <>
                  <div 
                    className="dropdown-backdrop"
                    onClick={() => setShowDropdown(false)}
                  ></div>
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-avatar">
                        {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt={user.displayName || user.email}
                            className="avatar-image"
                          />
                        ) : (
                          <span className="avatar-fallback">
                            {getInitials(user.displayName, user.email)}
                          </span>
                        )}
                      </div>
                      <div className="dropdown-user-info">
                        <div className="dropdown-name">
                          {user.displayName || 'User'}
                        </div>
                        <div className="dropdown-email">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item logout-btn"
                      onClick={handleLogout}
                    >
                      <span className="logout-icon">🚪</span>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;