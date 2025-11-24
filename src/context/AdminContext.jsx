import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  onSnapshot,
  query,
  where 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const AdminContext = createContext();

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

export function AdminProvider({ children }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hardcoded super admin emails
  const SUPER_ADMINS = ['christopher.feveck@gmail.com', 'feveck.chris@gmail.com'];

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        setError(null);
        const userEmail = user.email?.toLowerCase().trim();
        const isSuperAdmin = SUPER_ADMINS.includes(userEmail);
        
        if (isSuperAdmin) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }

        // Check if user exists in adminUsers collection
        try {
          const adminQuery = query(
            collection(db, 'adminUsers'), 
            where('__name__', '==', userEmail)
          );
          const adminSnapshot = await getDocs(adminQuery);
          setIsAdmin(!adminSnapshot.empty);
        } catch (error) {
          console.error('Error checking admin collection:', error);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let unsubscribeAdminUsers = () => {};
    let unsubscribeAllUsers = () => {};

    const subscribeToData = () => {
      try {
        setError(null);
        
        // Only subscribe to admin users if user is admin
        if (isAdmin) {
          const adminQuery = query(collection(db, 'adminUsers'));
          unsubscribeAdminUsers = onSnapshot(adminQuery, 
            (snapshot) => {
              const admins = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              setAdminUsers(admins);
            },
            (error) => {
              console.error('Error subscribing to admin users:', error);
              setError('Failed to load admin users: ' + error.message);
            }
          );

          // Subscribe to all users (only for admins)
          const usersQuery = query(collection(db, 'users'));
          unsubscribeAllUsers = onSnapshot(usersQuery, 
            (snapshot) => {
              const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              setAllUsers(users);
            },
            (error) => {
              console.error('Error subscribing to users:', error);
              setError('Failed to load users: ' + error.message);
            }
          );
        } else {
          // If not admin, clear the data
          setAdminUsers([]);
          setAllUsers([]);
        }
      } catch (error) {
        console.error('Error setting up subscriptions:', error);
        setError(error.message);
      }
    };

    subscribeToData();

    return () => {
      unsubscribeAdminUsers();
      unsubscribeAllUsers();
    };
  }, [isAdmin, user]);

  const addAdmin = async (email) => {
    if (!isAdmin) throw new Error('Unauthorized');
    if (!user) throw new Error('Not authenticated');
    
    try {
      setError(null);
      const adminEmail = email.toLowerCase().trim();
      
      const adminUser = {
        email: adminEmail,
        addedBy: user.email,
        addedAt: new Date().toISOString(),
        isSuperAdmin: false
      };
      
      await setDoc(doc(db, 'adminUsers', adminEmail), adminUser);
      return true;
    } catch (error) {
      console.error('Error adding admin:', error);
      setError('Failed to add admin: ' + error.message);
      throw error;
    }
  };

  const removeAdmin = async (email) => {
    if (!isAdmin) throw new Error('Unauthorized');
    
    try {
      setError(null);
      // Prevent removing super admins
      if (SUPER_ADMINS.includes(email)) {
        throw new Error('Cannot remove super admin');
      }
      
      await deleteDoc(doc(db, 'adminUsers', email.toLowerCase().trim()));
      return true;
    } catch (error) {
      console.error('Error removing admin:', error);
      setError('Failed to remove admin: ' + error.message);
      throw error;
    }
  };

  const value = {
    isAdmin,
    adminUsers,
    allUsers,
    loading,
    error,
    addAdmin,
    removeAdmin,
    SUPER_ADMINS
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}