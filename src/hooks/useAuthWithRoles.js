// src/hooks/useAuthWithRoles.js
import { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config.js'; // Make sure to include .js extension
import { initializeUserRoles } from '../services/firestoreSetup';

export const useAuthWithRoles = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Get user role and permissions
        try {
          const roleDoc = await getDoc(doc(db, 'userRoles', user.uid));
          if (roleDoc.exists()) {
            setUserRole(roleDoc.data());
          } else {
            // Initialize default role for new user
            const newRole = await initializeUserRoles(user.uid, {
              email: user.email,
              displayName: user.displayName
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

  return {
    user,
    userRole,
    loading,
    signInWithGoogle,
    logout,
    hasPermission,
    hasRole
  };
};