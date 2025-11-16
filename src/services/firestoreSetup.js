// src/services/firestoreSetup.js
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js'; // Make sure to include .js extension

// Admin email list from environment variables
export const ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS?.split(',') || [];
// Initialize user roles with automatic admin detection
export const initializeUserRoles = async (userId, userData = {}) => {
  try {
    // Check if user email is in admin list
    const isAdmin = ADMIN_EMAILS.includes(userData.email);
    const role = isAdmin ? 'admin' : (userData.role || 'user');
    
    const userRole = {
      userId: userId,
      email: userData.email,
      role: role,
      isAdmin: isAdmin,
      permissions: getDefaultPermissions(role),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'userRoles', userId), userRole);
    
    // Also create user profile
    await setDoc(doc(db, 'users', userId), {
      userId: userId,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      isAdmin: isAdmin,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return userRole;
  } catch (error) {
    console.error('Error initializing user roles:', error);
    throw error;
  }
};

// Enhanced permission function
const getDefaultPermissions = (role) => {
  const basePermissions = {
    admin: [
      'read_invoices', 'write_invoices', 'create_invoices', 'delete_invoices',
      'manage_users', 'manage_organizations', 'view_reports', 'export_data',
      'system_admin', 'user_management', 'billing_management'
    ],
    manager: [
      'read_invoices', 'write_invoices', 'create_invoices', 
      'view_reports', 'export_data'
    ],
    user: [
      'read_invoices', 'create_invoices'
    ],
    guest: [
      'read_invoices'
    ]
  };
  
  return basePermissions[role] || basePermissions.user;
};

// Check if user is admin by email
export const isAdminUser = (email) => {
  return ADMIN_EMAILS.includes(email);
};