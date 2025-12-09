import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Dashboard from './components/Dashboard';
import './index.css';
import Login from './components/Login';
import { AuthProvider } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import Help from './components/Help';
import Settings from './components/Settings';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!user ? <Login /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/help" 
        element={user ? <Help /> : <Navigate to="/login" replace />} 
      />
     <Route 
        path="/settings" 
        element={user ? <Settings /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/*" 
        element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
     
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <AdminProvider>
            <div className="App">
              <AppContent />
            </div>
          </AdminProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;