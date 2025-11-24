const { onCall, onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');

// Load environment variables from .env file
require('dotenv').config();

// Initialize Admin SDK
initializeApp();
const db = getFirestore();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Set global options with CORS for all functions
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 5,
  memory: '512MiB',
  timeoutSeconds: 120,
  cors: [
    'https://feveck-invoice.web.app',
    'https://feveck-invoice.firebaseapp.com', 
    'http://localhost:3000',
    'http://localhost:5173'
  ]
});

// Email configuration with dotenv support
const createTransporter = () => {
  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_PASSWORD;

  console.log('🔧 Environment check:', {
    hasEmail: !!email,
    hasPassword: !!password,
    email: email ? `${email.substring(0, 3)}...` : 'missing'
  });

  if (!email || !password) {
    throw new Error(
      'Gmail credentials not configured. ' +
      'Create a .env file in functions directory with GMAIL_EMAIL and GMAIL_PASSWORD'
    );
  }

  console.log('✅ Creating email transporter for production');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: password,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
};

// Main sendInvoiceEmail function
exports.sendInvoiceEmail = onCall({
  memory: '512MiB',
  timeoutSeconds: 120,
  minInstances: 0,
  maxInstances: 10,
}, async (request) => {
  console.log('📧 PRODUCTION sendInvoiceEmail called - REAL EMAILS');
  
  try {
    // Authentication check
    if (!request.auth) {
      throw new Error('Authentication required. Please sign in again.');
    }

    const { invoiceId } = request.data;
    
    // Input validation
    if (!invoiceId) {
      throw new Error('Invoice ID is required.');
    }

    console.log('🔄 Processing invoice:', { invoiceId, userId: request.auth.uid });

    // Get invoice data
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      throw new Error('Invoice not found. It may have been deleted.');
    }

    const invoice = invoiceDoc.data();
    console.log('📄 Invoice found:', invoice.clientName, 'Total: $' + invoice.total?.toFixed(2));

    // Permission check - user must own the invoice
    if (invoice.userId !== request.auth.uid) {
      throw new Error('You do not have permission to send this invoice.');
    }

    // Validate client email
    if (!invoice.clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoice.clientEmail)) {
      throw new Error('Invalid client email address in invoice.');
    }

    // Create email transporter
    const transporter = createTransporter();

    // Generate professional email content
    const emailHtml = generateProfessionalEmail(invoice);
    const textVersion = generateTextVersion(invoice);

    const mailOptions = {
      from: `"Invoice App" <${process.env.GMAIL_EMAIL}>`,
      to: invoice.clientEmail,
      subject: `Invoice #${invoice.invoiceNumber || invoiceId.slice(-8)}`,
      html: emailHtml,
      text: textVersion,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    console.log('📤 Sending REAL email to:', invoice.clientEmail);
    
    // Send email
    let emailResult;
    try {
      emailResult = await transporter.sendMail(mailOptions);
      console.log('✅ REAL Email sent successfully:', emailResult.messageId);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      
      if (emailError.code === 'EAUTH') {
        throw new Error('Email authentication failed. Please check Gmail configuration.');
      } else if (emailError.code === 'EENVELOPE') {
        throw new Error('Invalid email address or sending limit exceeded.');
      } else {
        throw new Error(`Email delivery failed: ${emailError.message}`);
      }
    }

    // Update invoice with success status
    const updateData = {
      status: 'sent',
      emailSent: true,
      lastSent: admin.firestore.FieldValue.serverTimestamp(),
      sentTo: invoice.clientEmail,
      sentBy: request.auth.uid,
      emailStatus: 'sent',
      messageId: emailResult.messageId
    };

    await db.collection('invoices').doc(invoiceId).update(updateData);

    // Log successful email
    await db.collection('emailLogs').add({
      invoiceId: invoiceId,
      userId: request.auth.uid,
      clientEmail: invoice.clientEmail,
      subject: mailOptions.subject,
      messageId: emailResult.messageId,
      status: 'sent',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      invoiceTotal: invoice.total,
      clientName: invoice.clientName
    });

    console.log('🎉 PRODUCTION sendInvoiceEmail completed successfully - REAL EMAIL SENT');

    return { 
      success: true, 
      message: 'Invoice sent successfully!',
      messageId: emailResult.messageId,
      clientEmail: invoice.clientEmail,
      clientName: invoice.clientName,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total
    };

  } catch (error) {
    console.error('💥 PRODUCTION sendInvoiceEmail error:', error);

    // Log the failure
    try {
      await db.collection('emailLogs').add({
        invoiceId: request.data.invoiceId,
        userId: request.auth?.uid,
        clientEmail: request.data.clientEmail,
        error: error.message,
        status: 'failed',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    throw new Error(error.message);
  }
});

// Professional email template
function generateProfessionalEmail(invoice) {
  const itemsHtml = invoice.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; vertical-align: top;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center; vertical-align: top;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; vertical-align: top;">$${item.price.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; vertical-align: top;">$${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `).join('');

  const total = invoice.total || invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${invoice.invoiceNumber || 'N/A'}</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background: #f8f9fa;
    }
    .container { 
      max-width: 700px; 
      margin: 0 auto; 
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center; 
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content { 
      padding: 40px; 
    }
    .invoice-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
      padding: 30px;
      background: #f8f9fa;
      border-radius: 10px;
      border: 1px solid #e9ecef;
    }
    .invoice-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 30px 0; 
      background: white;
      font-size: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      border-radius: 8px;
      overflow: hidden;
    }
    .invoice-table th { 
      background: #2c3e50; 
      color: white;
      padding: 16px 12px; 
      text-align: left; 
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .invoice-table td {
      padding: 16px 12px;
      border-bottom: 1px solid #f1f3f4;
    }
    .totals {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 25px;
      border-radius: 10px;
      margin: 30px 0;
      border: 1px solid #e9ecef;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 16px;
    }
    .grand-total {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      border-top: 2px solid #dee2e6;
      padding-top: 16px;
      margin-top: 16px;
    }
    .footer { 
      text-align: center; 
      margin-top: 40px; 
      color: #6c757d; 
      font-size: 14px; 
      padding: 30px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    .due-date {
      background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
      border-left: 5px solid #ffc107;
      font-weight: 600;
    }
    @media (max-width: 600px) {
      .invoice-info {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      .content {
        padding: 25px;
      }
      .invoice-table {
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>INVOICE</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px; font-weight: 300;">
        #${invoice.invoiceNumber || invoice.id?.slice(-8) || 'N/A'}
      </p>
    </div>
    
    <div class="content">
      <div class="invoice-info">
        <div>
          <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px;">FROM:</h3>
          <p style="margin: 8px 0; font-weight: 600; color: #2c3e50;">Your Company</p>
          <p style="margin: 8px 0; color: #6c757d;">your-email@company.com</p>
        </div>
        <div>
          <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px;">BILL TO:</h3>
          <p style="margin: 8px 0; font-weight: 600; color: #2c3e50;">${invoice.clientName}</p>
          <p style="margin: 8px 0; color: #6c757d;">${invoice.clientEmail}</p>
          ${invoice.clientAddress ? `<p style="margin: 8px 0; color: #6c757d;">${invoice.clientAddress}</p>` : ''}
        </div>
      </div>

      ${invoice.dueDate ? `
        <div class="due-date">
          ⏰ <strong>Payment Due:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      ` : ''}

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row grand-total">
          <span>TOTAL DUE:</span>
          <span>$${total.toFixed(2)}</span>
        </div>
      </div>
      
      ${invoice.notes ? `
        <div style="margin: 25px 0; padding: 20px; background: #e8f5e8; border-radius: 8px; border-left: 5px solid #28a745;">
          <strong style="color: #155724;">Additional Notes:</strong><br>
          <p style="margin: 10px 0 0 0; color: #155724;">${invoice.notes}</p>
        </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;">
        This invoice was sent via <strong>Invoice App</strong>
      </p>
      <p style="margin: 0; font-size: 13px; color: #868e96;">
        If you have any questions about this invoice, please contact the sender.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateTextVersion(invoice) {
  const itemsText = invoice.items.map(item => 
    `• ${item.description} - ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`
  ).join('\n');

  const total = invoice.total || invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return `
INVOICE #${invoice.invoiceNumber || invoice.id?.slice(-8) || 'N/A'}
==========================================

FROM: Your Company
Email: your-email@company.com

BILL TO: ${invoice.clientName}
Email: ${invoice.clientEmail}

${invoice.dueDate ? `DUE DATE: ${new Date(invoice.dueDate).toLocaleDateString()}` : ''}

ITEMS:
${itemsText}

TOTAL DUE: $${total.toFixed(2)}

${invoice.notes ? `Notes: ${invoice.notes}` : ''}

Thank you for your business!
==========================================
  `.trim();
}

// // Stripe Checkout Session
// exports.createCheckoutSession = onCall(async (request) => {
//   console.log('💰 createCheckoutSession called');
  
//   try {
//     if (!request.auth) {
//       throw new Error('Authentication required');
//     }

//     const { priceId } = request.data;
//     const userId = request.auth.uid;

//     if (!priceId) {
//       throw new Error('Price ID is required');
//     }

//     // Get user data
//     const userDoc = await db.collection('users').doc(userId).get();
//     if (!userDoc.exists) {
//       throw new Error('User not found');
//     }

//     const userData = userDoc.data();
//     let stripeCustomerId = userData.stripeCustomerId;

//     // Create Stripe customer if doesn't exist
//     if (!stripeCustomerId) {
//       const customer = await stripe.customers.create({
//         email: userData.email,
//         name: userData.displayName,
//         metadata: {
//           firebaseUID: userId,
//         },
//       });

//       stripeCustomerId = customer.id;

//       // Save Stripe customer ID to user document
//       await db.collection('users').doc(userId).update({
//         stripeCustomerId: customer.id,
//       });
//     }

//     console.log('Creating checkout session for customer:', stripeCustomerId);

//     // Create Stripe checkout session
//     const session = await stripe.checkout.sessions.create({
//       customer: stripeCustomerId,
//       payment_method_types: ['card'],
//       line_items: [
//         {
//           price: priceId,
//           quantity: 1,
//         },
//       ],
//       mode: 'subscription',
//       success_url: 'https://feveck-invoice.web.app/success?session_id={CHECKOUT_SESSION_ID}',
//       cancel_url: 'https://feveck-invoice.web.app/pricing',
//       metadata: {
//         firebaseUID: userId,
//       },
//     });

//     console.log('✅ Checkout session created:', session.id);

//     return {
//       success: true,
//       sessionId: session.id,
//       url: session.url,
//     };

//   } catch (error) {
//     console.error('❌ createCheckoutSession error:', error);
//     throw new Error(`Failed to create checkout session: ${error.message}`);
//   }
// });

// // Stripe Customer Portal
// exports.createCustomerPortalSession = onCall(async (request) => {
//   console.log('🔗 createCustomerPortalSession called');
  
//   try {
//     if (!request.auth) {
//       throw new Error('Authentication required');
//     }

//     const userId = request.auth.uid;
    
//     // Get user data to find their Stripe customer ID
//     const userDoc = await db.collection('users').doc(userId).get();
//     if (!userDoc.exists) {
//       throw new Error('User not found');
//     }

//     const userData = userDoc.data();
//     const stripeCustomerId = userData.stripeCustomerId;

//     if (!stripeCustomerId) {
//       throw new Error('No Stripe customer found. Please contact support.');
//     }

//     console.log('Creating portal session for customer:', stripeCustomerId);

//     // Create Stripe portal session
//     const portalSession = await stripe.billingPortal.sessions.create({
//       customer: stripeCustomerId,
//       return_url: 'https://feveck-invoice.web.app/settings',
//     });

//     console.log('✅ Portal session created:', portalSession.id);

//     return {
//       success: true,
//       url: portalSession.url,
//     };

//   } catch (error) {
//     console.error('❌ createCustomerPortalSession error:', error);
//     throw new Error(`Failed to create customer portal: ${error.message}`);
//   }
// });

// // Get Subscription Status
// exports.getSubscriptionStatus = onCall(async (request) => {
//   try {
//     if (!request.auth) {
//       throw new Error('Authentication required');
//     }

//     const userId = request.auth.uid;
//     const userDoc = await db.collection('users').doc(userId).get();
    
//     if (!userDoc.exists) {
//       throw new Error('User not found');
//     }

//     const userData = userDoc.data();
    
//     return {
//       success: true,
//       subscription: {
//         status: userData.subscriptionStatus || 'inactive',
//         plan: userData.plan || 'free',
//         currentPeriodEnd: userData.currentPeriodEnd,
//         stripeCustomerId: userData.stripeCustomerId
//       }
//     };
//   } catch (error) {
//     console.error('❌ getSubscriptionStatus error:', error);
//     throw new Error(`Failed to get subscription status: ${error.message}`);
//   }
// });

// // Check Invoice Limit
// exports.checkInvoiceLimit = onCall(async (request) => {
//   try {
//     if (!request.auth) {
//       throw new Error('Authentication required');
//     }

//     const userId = request.auth.uid;
    
//     // Get user's subscription status
//     const userDoc = await db.collection('users').doc(userId).get();
//     const userData = userDoc.data();
    
//     const subscriptionStatus = userData.subscriptionStatus || 'inactive';
//     const plan = userData.plan || 'free';
    
//     // Define limits based on plan
//     const limits = {
//       free: 10,
//       basic: 50,
//       premium: 1000,
//       enterprise: 10000
//     };
    
//     const currentLimit = limits[plan] || limits.free;
    
//     // Count user's invoices for current month
//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
//     const invoicesSnapshot = await db.collection('invoices')
//       .where('userId', '==', userId)
//       .where('createdAt', '>=', startOfMonth)
//       .where('createdAt', '<=', endOfMonth)
//       .get();
    
//     const invoiceCount = invoicesSnapshot.size;
//     const canCreateMore = invoiceCount < currentLimit;
    
//     return {
//       success: true,
//       canCreateMore,
//       currentCount: invoiceCount,
//       limit: currentLimit,
//       plan: plan,
//       subscriptionStatus: subscriptionStatus
//     };
    
//   } catch (error) {
//     console.error('❌ checkInvoiceLimit error:', error);
//     throw new Error(`Failed to check invoice limit: ${error.message}`);
//   }
// });

// // Get Pricing Plans
// exports.getPricingPlans = onCall(async (request) => {
//   try {
//     const plans = {
//       free: {
//         name: 'Free',
//         price: 0,
//         features: [
//           'Up to 10 invoices per month',
//           'Basic email templates',
//           'Standard support'
//         ],
//         stripePriceId: null
//       },
//       basic: {
//         name: 'Basic',
//         price: 9.99,
//         features: [
//           'Up to 50 invoices per month',
//           'Professional email templates',
//           'Priority support',
//           'Custom branding'
//         ],
//         stripePriceId: 'price_basic_monthly' // Replace with actual Stripe Price ID
//       },
//       premium: {
//         name: 'Premium',
//         price: 19.99,
//         features: [
//           'Unlimited invoices',
//           'Advanced email templates',
//           '24/7 priority support',
//           'Custom branding',
//           'Advanced analytics'
//         ],
//         stripePriceId: 'price_premium_monthly' // Replace with actual Stripe Price ID
//       }
//     };
    
//     return {
//       success: true,
//       plans: plans
//     };
//   } catch (error) {
//     console.error('❌ getPricingPlans error:', error);
//     throw new Error(`Failed to get pricing plans: ${error.message}`);
//   }
// });

// // Stripe Webhook Handler
// exports.stripeWebhooks = onRequest({
//   secrets: ['STRIPE_WEBHOOK_SECRET']
// }, async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   let event;

//   try {
//     // Verify webhook signature
//     event = stripe.webhooks.constructEvent(
//       req.rawBody,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     console.error('Webhook signature verification failed:', err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   console.log('🪝 Stripe webhook received:', event.type);

//   try {
//     switch (event.type) {
//       case 'checkout.session.completed':
//         await handleCheckoutSessionCompleted(event.data.object);
//         break;
      
//       case 'customer.subscription.updated':
//         await handleSubscriptionUpdated(event.data.object);
//         break;
      
//       case 'customer.subscription.deleted':
//         await handleSubscriptionDeleted(event.data.object);
//         break;
      
//       default:
//         console.log(`Unhandled event type: ${event.type}`);
//     }

//     res.json({ received: true });
//   } catch (error) {
//     console.error('Webhook handler error:', error);
//     res.status(500).json({ error: 'Webhook handler failed' });
//   }
// });

// // Webhook handlers
// async function handleCheckoutSessionCompleted(session) {
//   const userId = session.metadata.firebaseUID;
//   const subscription = await stripe.subscriptions.retrieve(session.subscription);

//   console.log('✅ Checkout completed for user:', userId);

//   await db.collection('users').doc(userId).update({
//     stripeSubscriptionId: subscription.id,
//     subscriptionStatus: subscription.status,
//     plan: subscription.items.data[0].price.id,
//     currentPeriodEnd: new Date(subscription.current_period_end * 1000),
//   });
// }

// async function handleSubscriptionUpdated(subscription) {
//   const customers = await stripe.customers.list({
//     email: subscription.customer,
//   });
  
//   if (customers.data.length > 0) {
//     const customer = customers.data[0];
//     const userId = customer.metadata.firebaseUID;

//     console.log('📝 Subscription updated for user:', userId);

//     await db.collection('users').doc(userId).update({
//       subscriptionStatus: subscription.status,
//       plan: subscription.items.data[0].price.id,
//       currentPeriodEnd: new Date(subscription.current_period_end * 1000),
//     });
//   }
// }

// async function handleSubscriptionDeleted(subscription) {
//   const customers = await stripe.customers.list({
//     email: subscription.customer,
//   });
  
//   if (customers.data.length > 0) {
//     const customer = customers.data[0];
//     const userId = customer.metadata.firebaseUID;

//     console.log('❌ Subscription deleted for user:', userId);

//     await db.collection('users').doc(userId).update({
//       stripeSubscriptionId: null,
//       subscriptionStatus: 'canceled',
//       plan: null,
//       currentPeriodEnd: null,
//     });
//   }
// }

// Send welcome email to new users
exports.sendWelcomeEmail = onDocumentCreated('users/{userId}', async (event) => {
  console.log('👋 sendWelcomeEmail triggered for new user');
  
  try {
    const userData = event.data.data();
    const userEmail = userData.email;
    const userName = userData.displayName || userData.email.split('@')[0];

    console.log('📧 Sending welcome email to:', userEmail);

    // Validate email
    if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      console.error('❌ Invalid user email:', userEmail);
      return;
    }

    // Create email transporter
    const transporter = createTransporter();

    const welcomeHtml = generateWelcomeEmail(userName);
    const welcomeText = generateWelcomeText(userName);

    const mailOptions = {
      from: `"Invoice App" <${process.env.GMAIL_EMAIL}>`,
      to: userEmail,
      subject: 'Welcome to Invoice App! 🎉',
      html: welcomeHtml,
      text: welcomeText,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    console.log('📤 Sending welcome email...');
    
    let emailResult;
    try {
      emailResult = await transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully:', emailResult.messageId);
    } catch (emailError) {
      console.error('❌ Welcome email sending failed:', emailError);
      return;
    }

    // Log the welcome email
    await db.collection('emailLogs').add({
      type: 'welcome_email',
      userId: event.params.userId,
      userEmail: userEmail,
      userName: userName,
      messageId: emailResult.messageId,
      status: 'sent',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('🎉 Welcome email process completed');

  } catch (error) {
    console.error('💥 sendWelcomeEmail error:', error);
    
    // Log the failure
    try {
      await db.collection('emailLogs').add({
        type: 'welcome_email',
        userId: event.params.userId,
        userEmail: userData?.email,
        error: error.message,
        status: 'failed',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (logError) {
      console.error('Failed to log welcome email error:', logError);
    }
  }
});

// Notify admins when a new user signs up
exports.notifyAdminsNewUser = onDocumentCreated('users/{userId}', async (event) => {
  console.log('👤 notifyAdminsNewUser triggered for new user');
  
  try {
    const userData = event.data.data();
    const userEmail = userData.email;
    const userName = userData.displayName || 'No name provided';
    const userPhoto = userData.photoURL;
    const signupTime = new Date().toLocaleString();

    console.log('🆕 New user registered:', { userEmail, userName });

    // Get all admin users
    const adminUsersSnapshot = await db.collection('adminUsers').get();
    const adminEmails = adminUsersSnapshot.docs.map(doc => doc.id);
    
    // Add super admins
    const SUPER_ADMINS = ['christopher.feveck@gmail.com', 'feveck.chris@gmail.com'];
    const allAdminEmails = [...new Set([...adminEmails, ...SUPER_ADMINS])];

    console.log('📧 Notifying admins:', allAdminEmails);

    if (allAdminEmails.length === 0) {
      console.log('ℹ️ No admin emails found to notify');
      return;
    }

    // Create email transporter
    const transporter = createTransporter();

    const adminNotificationHtml = generateAdminNotificationEmail(userName, userEmail, userPhoto, signupTime);
    const adminNotificationText = generateAdminNotificationText(userName, userEmail, signupTime);

    const mailOptions = {
      from: `"Invoice App" <${process.env.GMAIL_EMAIL}>`,
      to: allAdminEmails,
      subject: `🎉 New User Signed Up: ${userName}`,
      html: adminNotificationHtml,
      text: adminNotificationText,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    console.log('📤 Sending admin notification email...');
    
    let emailResult;
    try {
      emailResult = await transporter.sendMail(mailOptions);
      console.log('✅ Admin notification email sent successfully:', emailResult.messageId);
    } catch (emailError) {
      console.error('❌ Admin notification email sending failed:', emailError);
      return;
    }

    // Log the admin notification
    await db.collection('emailLogs').add({
      type: 'admin_notification',
      userId: event.params.userId,
      userEmail: userEmail,
      userName: userName,
      adminEmails: allAdminEmails,
      messageId: emailResult.messageId,
      status: 'sent',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('🎉 Admin notification process completed');

  } catch (error) {
    console.error('💥 notifyAdminsNewUser error:', error);
    
    // Log the failure
    try {
      await db.collection('emailLogs').add({
        type: 'admin_notification',
        userId: event.params.userId,
        userEmail: userData?.email,
        error: error.message,
        status: 'failed',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (logError) {
      console.error('Failed to log admin notification error:', logError);
    }
  }
});

// Welcome email template
function generateWelcomeEmail(userName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Invoice App!</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 50px 30px; 
      text-align: center; 
    }
    .header h1 {
      margin: 0;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .content { 
      padding: 50px 40px; 
    }
    .welcome-message {
      font-size: 18px;
      color: #555;
      margin-bottom: 30px;
      line-height: 1.7;
    }
    .features-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin: 40px 0;
    }
    .feature {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }
    .feature-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    .feature-text h3 {
      margin: 0 0 8px 0;
      color: #2c3e50;
      font-size: 17px;
    }
    .feature-text p {
      margin: 0;
      color: #6c757d;
      font-size: 15px;
      line-height: 1.5;
    }
    .cta-section {
      text-align: center;
      margin: 40px 0;
      padding: 30px;
      background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
      border-radius: 12px;
      border: 1px solid #c3e6cb;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 700;
      font-size: 16px;
      margin-top: 15px;
      transition: transform 0.2s ease;
    }
    .cta-button:hover {
      transform: translateY(-2px);
    }
    .footer { 
      text-align: center; 
      margin-top: 40px; 
      color: #6c757d; 
      font-size: 14px; 
      padding: 30px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    @media (max-width: 600px) {
      .content {
        padding: 30px 25px;
      }
      .header {
        padding: 40px 25px;
      }
      .header h1 {
        font-size: 28px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Invoice App! 🎉</h1>
    </div>
    
    <div class="content">
      <div class="welcome-message">
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Welcome to Invoice App! We're thrilled to have you on board. Get ready to streamline your invoicing process and get paid faster.</p>
      </div>

      <div class="features-grid">
        <div class="feature">
          <div class="feature-icon">📄</div>
          <div class="feature-text">
            <h3>Create Professional Invoices</h3>
            <p>Generate beautiful, professional invoices in seconds with our easy-to-use templates.</p>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">✉️</div>
          <div class="feature-text">
            <h3>Send Emails Instantly</h3>
            <p>Send invoices directly to your clients via email with just one click.</p>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">📱</div>
          <div class="feature-text">
            <h3>Mobile-Friendly</h3>
            <p>Access your invoices and client data from anywhere, on any device.</p>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🔒</div>
          <div class="feature-text">
            <h3>Secure & Private</h3>
            <p>Your data is protected with enterprise-grade security and privacy measures.</p>
          </div>
        </div>
      </div>

      <div class="cta-section">
        <h3 style="margin: 0 0 15px 0; color: #155724;">Ready to Get Started?</h3>
        <p style="margin: 0 0 20px 0; color: #155724;">Create your first invoice and experience the difference!</p>
        <a href="https://feveck-invoice.web.app" class="cta-button">Create Your First Invoice</a>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;">
        Need help? Reply to this email or visit our help center.
      </p>
      <p style="margin: 0; font-size: 13px; color: #868e96;">
        You're receiving this email because you recently created an account with Invoice App.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateWelcomeText(userName) {
  return `
Welcome to Invoice App! 🎉

Hi ${userName},

Welcome to Invoice App! We're thrilled to have you on board. Get ready to streamline your invoicing process and get paid faster.

✨ Key Features:
• Create professional invoices in seconds
• Send invoices directly to clients via email
• Access your data from anywhere, on any device
• Enterprise-grade security and privacy

🚀 Ready to Get Started?
Create your first invoice now: https://feveck-invoice.web.app

Need help? Reply to this email or visit our help center.

Thank you for choosing Invoice App!
  `.trim();
}

// Admin notification email template
function generateAdminNotificationEmail(userName, userEmail, userPhoto, signupTime) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New User Signup Notification</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background: #f8f9fa;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center; 
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content { 
      padding: 40px; 
    }
    .user-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 30px;
      margin: 25px 0;
      border-left: 5px solid #28a745;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 20px;
    }
    .user-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 20px;
      flex-shrink: 0;
    }
    .user-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    .user-details {
      flex: 1;
    }
    .user-name {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 5px 0;
    }
    .user-email {
      font-size: 16px;
      color: #6c757d;
      margin: 0;
    }
    .signup-info {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .info-item:last-child {
      border-bottom: none;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 30px 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }
    .stat-number {
      font-size: 24px;
      font-weight: 800;
      margin: 0;
    }
    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      margin: 5px 0 0 0;
    }
    .footer { 
      text-align: center; 
      margin-top: 40px; 
      color: #6c757d; 
      font-size: 14px; 
      padding: 30px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    @media (max-width: 600px) {
      .content {
        padding: 30px 25px;
      }
      .user-info {
        flex-direction: column;
        text-align: center;
      }
      .stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 New User Signup!</h1>
    </div>
    
    <div class="content">
      <p style="font-size: 16px; color: #555; margin-bottom: 25px;">
        Great news! A new user has just signed up for Invoice App.
      </p>

      <div class="user-card">
        <div class="user-info">
          <div class="user-avatar">
            ${userPhoto ? 
              `<img src="${userPhoto}" alt="${userName}" />` : 
              `<span>${userName.charAt(0).toUpperCase()}</span>`
            }
          </div>
          <div class="user-details">
            <h2 class="user-name">${userName}</h2>
            <p class="user-email">${userEmail}</p>
          </div>
        </div>
        
        <div class="signup-info">
          <div class="info-item">
            <strong>Signup Time:</strong>
            <span>${signupTime}</span>
          </div>
          <div class="info-item">
            <strong>User ID:</strong>
            <span style="font-family: monospace; font-size: 12px;">${userEmail}</span>
          </div>
        </div>
      </div>

      <div class="stats">
        <div class="stat-card">
          <p class="stat-number">+1</p>
          <p class="stat-label">New User</p>
        </div>
        <div class="stat-card">
          <p class="stat-number">🎯</p>
          <p class="stat-label">Active Growth</p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="https://feveck-invoice.web.app/admin" 
           style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          View in Admin Panel
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0; font-size: 13px; color: #868e96;">
        This is an automated notification from Invoice App.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateAdminNotificationText(userName, userEmail, signupTime) {
  return `
🎉 NEW USER SIGNUP NOTIFICATION

A new user has just signed up for Invoice App!

User Details:
• Name: ${userName}
• Email: ${userEmail}
• Signup Time: ${signupTime}

View this user in the admin panel: https://feveck-invoice.web.app/admin

This is an automated notification from Invoice App.
  `.trim();
}
