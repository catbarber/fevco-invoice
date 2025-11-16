// src/services/invoiceService.js
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { getUserRole, userHasPermission } from './firestoreSetup';

// Create invoice with role-based access
export const createInvoice = async (invoiceData, userId) => {
  const canCreate = await userHasPermission(userId, 'create_invoices');
  
  if (!canCreate) {
    throw new Error('Insufficient permissions to create invoices');
  }

  const invoice = {
    ...invoiceData,
    userId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'pending',
    sharedWith: [] // Array of user IDs who can access this invoice
  };

  return await addDoc(collection(db, 'invoices'), invoice);
};

// Get invoices based on user role
export const getUserInvoices = async (userId) => {
  const userRole = await getUserRole(userId);
  
  let invoicesQuery;
  
  if (userRole.role === 'admin') {
    // Admin can see all invoices
    invoicesQuery = query(
      collection(db, 'invoices'),
      orderBy('createdAt', 'desc')
    );
  } else if (userRole.role === 'manager') {
    // Manager can see invoices from their organization
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    invoicesQuery = query(
      collection(db, 'invoices'),
      where('organizationId', '==', userData.organizationId),
      orderBy('createdAt', 'desc')
    );
  } else {
    // Regular users can only see their own invoices and shared ones
    invoicesQuery = query(
      collection(db, 'invoices'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
  }

  const snapshot = await getDocs(invoicesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Update invoice with permission check
export const updateInvoice = async (invoiceId, updates, userId) => {
  const canWrite = await userHasPermission(userId, 'write_invoices');
  
  if (!canWrite) {
    throw new Error('Insufficient permissions to update invoices');
  }

  const invoiceRef = doc(db, 'invoices', invoiceId);
  const updateData = {
    ...updates,
    updatedAt: new Date()
  };

  return await updateDoc(invoiceRef, updateData);
};

// Delete invoice with permission check
export const deleteInvoice = async (invoiceId, userId) => {
  const canDelete = await userHasPermission(userId, 'delete_invoices');
  
  if (!canDelete) {
    throw new Error('Insufficient permissions to delete invoices');
  }

  const invoiceRef = doc(db, 'invoices', invoiceId);
  return await deleteDoc(invoiceRef);
};

// Share invoice with other users
export const shareInvoice = async (invoiceId, targetUserIds, userId) => {
  const canWrite = await userHasPermission(userId, 'write_invoices');
  
  if (!canWrite) {
    throw new Error('Insufficient permissions to share invoices');
  }

  const invoiceRef = doc(db, 'invoices', invoiceId);
  return await updateDoc(invoiceRef, {
    sharedWith: targetUserIds,
    updatedAt: new Date()
  });
};