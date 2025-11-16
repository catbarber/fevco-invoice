// src/hooks/useAuthWithAdmin.js
import { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config.js'; // Make sure to include .js extension
import { initializeUserRoles, isAdminUser } from '../services/firestoreSetup';

export const useAuthWithAdmin = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        try {
          // Check if user is admin by email
          const isAdmin = isAdminUser(user.email);
          
          // Get or create user role
          const roleDoc = await getDoc(doc(db, 'userRoles', user.uid));
          if (roleDoc.exists()) {
            const roleData = roleDoc.data();
            // Update role if email is admin but role isn't
            if (isAdmin && roleData.role !== 'admin') {
              await initializeUserRoles(user.uid, {
                email: user.email,
                displayName: user.displayName,
                role: 'admin'
              });
              setUserRole({ ...roleData, role: 'admin', isAdmin: true });
            } else {
              setUserRole(roleData);
            }
          } else {
            // Create new user with admin role if applicable
            const newRole = await initializeUserRoles(user.uid, {
              email: user.email,
              displayName: user.displayName,
              role: isAdmin ? 'admin' : 'user'
            });
            setUserRole(newRole);
          }
        } catch (error) {
          console.error('Error loading user role:', error);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if admin immediately after sign in
      const isAdmin = isAdminUser(result.user.email);
      if (isAdmin) {
        console.log('Admin user detected:', result.user.email);
      }
      
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const hasPermission = (permission) => {
    return userRole?.permissions?.includes(permission) || false;
  };

  const hasRole = (role) => {
    return userRole?.role === role;
  };

  const isAdmin = () => {
    return userRole?.isAdmin || false;
  };

  return {
    user,
    userRole,
    loading,
    signInWithGoogle,
    logout,
    hasPermission,
    hasRole,
    isAdmin
  };
};