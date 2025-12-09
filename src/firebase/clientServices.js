// src/firebase/clientService.js
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';

const CLIENTS_COLLECTION = 'clients';

// Get all clients for current user
export const getClients = async (userId) => {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const q = query(
      clientsRef, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const clients = [];
    querySnapshot.forEach((doc) => {
      clients.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: clients };
  } catch (error) {
    console.error('Error fetching clients:', error);
    return { success: false, error: error.message };
  }
};

// Get single client
export const getClient = async (clientId) => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    const clientSnap = await getDoc(clientRef);
    
    if (clientSnap.exists()) {
      return { success: true, data: { id: clientSnap.id, ...clientSnap.data() } };
    } else {
      return { success: false, error: 'Client not found' };
    }
  } catch (error) {
    console.error('Error fetching client:', error);
    return { success: false, error: error.message };
  }
};

// Create new client
export const createClient = async (clientData, userId) => {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const newClient = {
      ...clientData,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    };
    
    const docRef = await addDoc(clientsRef, newClient);
    return { 
      success: true, 
      data: { id: docRef.id, ...newClient },
      message: 'Client created successfully'
    };
  } catch (error) {
    console.error('Error creating client:', error);
    return { success: false, error: error.message };
  }
};

// Update client
export const updateClient = async (clientId, clientData) => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    const updateData = {
      ...clientData,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(clientRef, updateData);
    return { 
      success: true, 
      message: 'Client updated successfully'
    };
  } catch (error) {
    console.error('Error updating client:', error);
    return { success: false, error: error.message };
  }
};

// Delete client
export const deleteClient = async (clientId) => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    await deleteDoc(clientRef);
    return { 
      success: true, 
      message: 'Client deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: error.message };
  }
};

// Search clients
export const searchClients = async (userId, searchTerm) => {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const q = query(
      clientsRef,
      where('userId', '==', userId),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    const clients = [];
    
    querySnapshot.forEach((doc) => {
      const client = { id: doc.id, ...doc.data() };
      // Client-side filtering for search
      if (
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        clients.push(client);
      }
    });
    
    return { success: true, data: clients };
  } catch (error) {
    console.error('Error searching clients:', error);
    return { success: false, error: error.message };
  }
};

// Get client stats
export const getClientStats = async (userId) => {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const q = query(clientsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    let totalClients = 0;
    let activeClients = 0;
    
    querySnapshot.forEach((doc) => {
      totalClients++;
      const client = doc.data();
      if (client.status === 'active') {
        activeClients++;
      }
    });
    
    return {
      success: true,
      data: {
        totalClients,
        activeClients,
        inactiveClients: totalClients - activeClients
      }
    };
  } catch (error) {
    console.error('Error getting client stats:', error);
    return { success: false, error: error.message };
  }
};