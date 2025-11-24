// functions/stripe.js
const { onCall, onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Admin SDK
// initializeApp();
const db = getFirestore();

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Load environment variables
require('dotenv').config();

// Email transporter
const createTransporter = () => {
  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_PASSWORD;

  if (!email || !password) {
    throw new Error('Gmail credentials not configured');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: email, pass: password },
  });
};

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 3.99,
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: [
      'Up to 10 invoices per month',
      'Basic email templates',
      '1 user account'
    ],
    limits: {
      invoicesPerMonth: 10,
      customTemplates: false,
      advancedAnalytics: false,
      apiAccess: false
    }
  },
  premium: {
    name: 'Premium', 
    price: 9.99,
    stripePriceId: process.env.STRIPE_PRIMIUM_PRICE_ID, // Set this in your .env
    features: [
      'Unlimited invoices',
      'Custom email templates', 
      'Advanced analytics',
      'Up to 5 team members',
      'Custom branding'
    ],
    limits: {
      invoicesPerMonth: 9999,
      customTemplates: true,
      advancedAnalytics: true, 
      apiAccess: false
    }
  }
};

// 1. Create Stripe Checkout Session
exports.createCheckoutSession = onCall(async (request) => {
  console.log('💰 Creating Stripe checkout session');
  
  if (!request.auth) {
    throw new Error('Authentication required');
  }

  try {
    const { priceId, successUrl, cancelUrl } = request.data;
    
    if (!priceId) {
      throw new Error('Price ID is required');
    }

    // Get user data
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: userData.email,
      client_reference_id: request.auth.uid,
      subscription_data: {
        metadata: {
          firebaseUserId: request.auth.uid,
        },
      },
      success_url: successUrl || `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/pricing`,
      metadata: {
        firebaseUserId: request.auth.uid,
      },
    });

    console.log('✅ Checkout session created:', session.id);

    return {
      success: true,
      sessionId: session.id,
      url: session.url
    };

  } catch (error) {
    console.error('❌ Checkout session error:', error);
    throw new Error(`Checkout failed: ${error.message}`);
  }
});

// 2. Create Customer Portal Session
exports.createCustomerPortalSession = onCall(async (request) => {
  console.log('🔧 Creating customer portal session');
  
  if (!request.auth) {
    throw new Error('Authentication required');
  }

  try {
    // Get user's Stripe customer ID
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData.stripeCustomerId) {
      throw new Error('No subscription found');
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: `${process.env.APP_URL}/account`,
    });

    return {
      success: true,
      url: portalSession.url
    };

  } catch (error) {
    console.error('❌ Portal session error:', error);
    throw new Error(`Portal access failed: ${error.message}`);
  }
});

// 3. Get User Subscription Status
exports.getSubscriptionStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }

  try {
    const userId = request.auth.uid;
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    let subscription = null;
    let usage = null;

    // Calculate current month's invoice usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const invoicesSnapshot = await db.collection('invoices')
      .where('userId', '==', userId)
      .where('createdAt', '>=', startOfMonth)
      .get();

    const currentUsage = invoicesSnapshot.size;

    if (userData.subscription) {
      subscription = {
        status: userData.subscription.status,
        plan: userData.subscription.plan,
        currentPeriodEnd: userData.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: userData.subscription.cancelAtPeriodEnd,
        price: SUBSCRIPTION_PLANS[userData.subscription.plan]?.price || 0
      };

      // Get usage limits based on plan
      const planLimits = SUBSCRIPTION_PLANS[userData.subscription.plan]?.limits || SUBSCRIPTION_PLANS.basic.limits;
      
      usage = {
        invoicesThisMonth: currentUsage,
        invoiceLimit: planLimits.invoicesPerMonth,
        hasCustomTemplates: planLimits.customTemplates,
        hasAdvancedAnalytics: planLimits.advancedAnalytics,
        hasApiAccess: planLimits.apiAccess,
        usagePercentage: Math.round((currentUsage / planLimits.invoicesPerMonth) * 100)
      };
    } else {
      // Free plan
      const planLimits = SUBSCRIPTION_PLANS.basic.limits;
      subscription = {
        status: 'active',
        plan: 'basic',
        price: 0
      };
      
      usage = {
        invoicesThisMonth: currentUsage,
        invoiceLimit: planLimits.invoicesPerMonth,
        hasCustomTemplates: false,
        hasAdvancedAnalytics: false,
        hasApiAccess: false,
        usagePercentage: Math.round((currentUsage / planLimits.invoicesPerMonth) * 100)
      };
    }

    return {
      success: true,
      subscription,
      usage,
      plans: SUBSCRIPTION_PLANS
    };

  } catch (error) {
    console.error('❌ Subscription status error:', error);
    throw new Error(`Failed to get subscription status: ${error.message}`);
  }
});

// 4. Check Invoice Limits Before Creating Invoice
exports.checkInvoiceLimit = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }

  try {
    const userId = request.auth.uid;
    
    // Get user's subscription status
    const statusResult = await exports.getSubscriptionStatus(request);
    const { subscription, usage } = statusResult.data;

    if (usage.invoicesThisMonth >= usage.invoiceLimit) {
      return {
        canCreate: false,
        reason: `You've reached your monthly limit of ${usage.invoiceLimit} invoices. Please upgrade to create more invoices.`,
        currentUsage: usage.invoicesThisMonth,
        limit: usage.invoiceLimit,
        upgradeRequired: true
      };
    }

    return {
      canCreate: true,
      currentUsage: usage.invoicesThisMonth,
      limit: usage.invoiceLimit,
      remaining: usage.invoiceLimit - usage.invoicesThisMonth
    };

  } catch (error) {
    console.error('❌ Invoice limit check error:', error);
    throw new Error(`Failed to check invoice limits: ${error.message}`);
  }
});

// 5. Get Pricing Plans
exports.getPricingPlans = onCall(async (request) => {
  return {
    success: true,
    plans: SUBSCRIPTION_PLANS
  };
});

// Webhook Handler
exports.stripeWebhooks = onRequest(async (req, res) => {
  console.log('🔔 Stripe webhook received');
  
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ Webhook verified:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Webhook Handlers
async function handleCheckoutSessionCompleted(session) {
  console.log('✅ Checkout session completed:', session.id);
  
  const userId = session.client_reference_id;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;

  // Determine plan based on price ID
  let plan = 'basic';
  for (const [planKey, planData] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (planData.stripePriceId === priceId) {
      plan = planKey;
      break;
    }
  }

  // Update user document with subscription info
  await db.collection('users').doc(userId).update({
    stripeCustomerId: customerId,
    subscription: {
      id: subscriptionId,
      status: subscription.status,
      plan: plan,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: priceId
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`✅ User ${userId} subscribed to ${plan} plan`);
}

async function handleSubscriptionUpdated(subscription) {
  console.log('📝 Subscription updated:', subscription.id);
  
  // Find user by Stripe customer ID
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', subscription.customer)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error('❌ User not found for customer:', subscription.customer);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const priceId = subscription.items.data[0].price.id;

  // Determine plan based on price ID
  let plan = 'basic';
  for (const [planKey, planData] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (planData.stripePriceId === priceId) {
      plan = planKey;
      break;
    }
  }

  await userDoc.ref.update({
    subscription: {
      id: subscription.id,
      status: subscription.status,
      plan: plan,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: priceId
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`✅ Updated subscription for user ${userDoc.id} to ${plan}`);
}

async function handleSubscriptionDeleted(subscription) {
  console.log('🗑️ Subscription deleted:', subscription.id);
  
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', subscription.customer)
    .limit(1)
    .get();

  if (usersSnapshot.empty) return;

  const userDoc = usersSnapshot.docs[0];

  await userDoc.ref.update({
    'subscription.status': 'canceled',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`✅ Subscription canceled for user ${userDoc.id}`);
}

async function handlePaymentSucceeded(invoice) {
  console.log('💳 Payment succeeded:', invoice.id);
  // Handle successful payment
}

async function handlePaymentFailed(invoice) {
  console.log('❌ Payment failed:', invoice.id);
  // Handle failed payment
}