// functions/subscription.js
const { onCall, onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const { handleCors } = require('./cors');

// Initialize Admin SDK
initializeApp();
const db = getFirestore();

// Get user subscription information
exports.getSubscription = onCall(async (request) => {
  console.log('📋 getSubscription called');
  
  try {
    if (!request.auth) {
      throw new Error('Authentication required');
    }

    const userId = request.auth.uid;
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userRoleDoc = await db.collection('userRoles').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const userRole = userRoleDoc.exists ? userRoleDoc.data() : null;

    // Default subscription info
    const subscription = {
      status: 'active',
      plan: userRole?.isAdmin ? 'premium' : 'basic',
      isAdmin: userRole?.isAdmin || false,
      permissions: userRole?.permissions || ['read_invoices', 'create_invoices'],
      email: userData.email,
      displayName: userData.displayName,
      invoicesCount: 0,
      maxInvoices: userRole?.isAdmin ? 1000 : 100, // Basic users get 100 invoices
      features: {
        emailSending: true,
        multipleOrganizations: userRole?.isAdmin || false,
        advancedReports: userRole?.isAdmin || false
      }
    };

    // Count user's invoices
    const invoicesSnapshot = await db.collection('invoices')
      .where('userId', '==', userId)
      .get();
    
    subscription.invoicesCount = invoicesSnapshot.size;

    console.log('Subscription data for user:', userId, subscription.plan);

    return {
      success: true,
      subscription: subscription,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('getSubscription error:', error);
    throw new Error(error.message);
  }
});

// HTTP version with CORS support (alternative)
exports.getSubscriptionHttp = onRequest(async (req, res) => {
  console.log('📋 getSubscriptionHttp called');
  
  try {
    // Handle CORS
    await handleCors(req, res);

    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get user data (same logic as above)
    const userDoc = await db.collection('users').doc(userId).get();
    const userRoleDoc = await db.collection('userRoles').doc(userId).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();
    const userRole = userRoleDoc.exists ? userRoleDoc.data() : null;

    const subscription = {
      status: 'active',
      plan: userRole?.isAdmin ? 'premium' : 'basic',
      isAdmin: userRole?.isAdmin || false,
      permissions: userRole?.permissions || ['read_invoices', 'create_invoices'],
      email: userData.email,
      displayName: userData.displayName,
      invoicesCount: 0,
      maxInvoices: userRole?.isAdmin ? 1000 : 100,
      features: {
        emailSending: true,
        multipleOrganizations: userRole?.isAdmin || false,
        advancedReports: userRole?.isAdmin || false
      }
    };

    // Count invoices
    const invoicesSnapshot = await db.collection('invoices')
      .where('userId', '==', userId)
      .get();
    
    subscription.invoicesCount = invoicesSnapshot.size;

    res.json({
      success: true,
      subscription: subscription,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('getSubscriptionHttp error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});