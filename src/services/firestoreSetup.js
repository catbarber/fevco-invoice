// src/services/firestoreSetup.js
import { doc, setDoc, getDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config.js'; // Ensure .js extension

// Admin email list
export const ADMIN_EMAILS = [
  'feveck.chris@gmail.com',
  'christopher.feveck@gmail.com'
];

// Initialize user roles with email permissions
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

// Enhanced permission function with email permissions
export const getDefaultPermissions = (role) => {
  const basePermissions = {
    admin: [
      'read_invoices', 'write_invoices', 'create_invoices', 'delete_invoices',
      'manage_users', 'manage_organizations', 'view_reports', 'export_data',
      'system_admin', 'user_management', 'billing_management',
      'send_emails', 'view_email_logs', 'manage_templates'
    ],
    manager: [
      'read_invoices', 'write_invoices', 'create_invoices', 
      'view_reports', 'export_data', 'send_emails', 'view_email_logs'
    ],
    user: [
      'read_invoices', 'create_invoices', 'send_emails'
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

// Check if user can send emails - FIXED EXPORT
export const userCanSendEmails = async (userId) => {
  try {
    const userRole = await getUserRole(userId);
    return userRole?.permissions?.includes('send_emails') || false;
  } catch (error) {
    console.error('Error checking email permissions:', error);
    return false;
  }
};

// Log email activity
export const logEmailActivity = async (emailData) => {
  try {
    const logRef = doc(collection(db, 'emailLogs'));
    await setDoc(logRef, {
      ...emailData,
      logId: logRef.id,
      timestamp: new Date()
    });
    return logRef.id;
  } catch (error) {
    console.error('Error logging email activity:', error);
    throw error;
  }
};

// Get user role and permissions
export const getUserRole = async (userId) => {
  try {
    const roleDoc = await getDoc(doc(db, 'userRoles', userId));
    return roleDoc.exists() ? roleDoc.data() : null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Check if user has permission
export const userHasPermission = async (userId, permission) => {
  try {
    const userRole = await getUserRole(userId);
    return userRole && userRole.permissions.includes(permission);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
};

// Create organization structure
export const createOrganization = async (orgData, ownerId) => {
  const batch = writeBatch(db);
  
  // Create organization document
  const orgRef = doc(collection(db, 'organizations'));
  const organization = {
    ...orgData,
    id: orgRef.id,
    ownerId: ownerId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  batch.set(orgRef, organization);
  
  // Add owner as organization member
  const memberRef = doc(collection(db, `organizations/${orgRef.id}/members`), ownerId);
  batch.set(memberRef, {
    userId: ownerId,
    role: 'owner',
    joinedAt: new Date(),
    permissions: getDefaultPermissions('admin')
  });
  
  // Update user's organization reference
  const userRef = doc(db, 'users', ownerId);
  batch.update(userRef, {
    organizationId: orgRef.id,
    organizationRole: 'owner'
  });
  
  await batch.commit();
  return organization;
};

// Add user to organization
export const addUserToOrganization = async (orgId, userId, role = 'user') => {
  const batch = writeBatch(db);
  
  // Add to organization members
  const memberRef = doc(collection(db, `organizations/${orgId}/members`), userId);
  batch.set(memberRef, {
    userId: userId,
    role: role,
    joinedAt: new Date(),
    permissions: getDefaultPermissions(role)
  });
  
  // Update user's organization reference
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, {
    organizationId: orgId,
    organizationRole: role
  });
  
  // Update user role
  const userRoleRef = doc(db, 'userRoles', userId);
  batch.update(userRoleRef, {
    role: role,
    permissions: getDefaultPermissions(role),
    updatedAt: new Date()
  });
  
  await batch.commit();
};