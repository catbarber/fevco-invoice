// functions/index.js
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

// Set global options
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 5,
  memory: '512MiB',
  timeoutSeconds: 120,
});

// Production email configuration with dotenv support
const createTransporter = () => {
  // Get credentials from environment variables (from .env file)
  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_PASSWORD;

  console.log('🔧 Environment check:', {
    hasEmail: !!email,
    hasPassword: !!password,
    email: email ? `${email.substring(0, 3)}...` : 'missing',
    allEnvVars: Object.keys(process.env).filter(key => key.includes('GMAIL'))
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

// Rest of your production function remains the same...
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

    const { invoiceId, clientEmail, message, subject } = request.data;
    
    // Input validation
    if (!invoiceId || !clientEmail) {
      throw new Error('Invoice ID and client email are required.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      throw new Error('Invalid client email format.');
    }

    console.log('🔄 Processing invoice:', { invoiceId, clientEmail, userId: request.auth.uid });

    // Get invoice data
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      throw new Error('Invoice not found. It may have been deleted.');
    }

    const invoice = invoiceDoc.data();
    console.log('📄 Invoice found:', invoice.clientName, 'Total: $' + invoice.total?.toFixed(2));

    // Permission check
    const isOwner = invoice.userId === request.auth.uid;
    if (!isOwner) {
      const userRoleDoc = await db.collection('userRoles').doc(request.auth.uid).get();
      const userRole = userRoleDoc.exists ? userRoleDoc.data() : null;
      const isAdmin = userRole?.isAdmin || userRole?.role === 'admin';
      const hasPermission = userRole?.permissions?.includes('send_emails');
      
      if (!isAdmin && !hasPermission) {
        throw new Error('You do not have permission to send this invoice.');
      }
    }

    // Create email transporter - THIS WILL NOW THROW ERROR IF NOT CONFIGURED
    const transporter = createTransporter();

    // Generate professional email content
    const emailHtml = generateProfessionalEmail(invoice, message);
    const textVersion = generateTextVersion(invoice, message);

    const mailOptions = {
      from: `"Simple Invoicing - A Fevco product" <${process.env.GMAIL_EMAIL}>`,
      to: clientEmail,
      subject: subject || `Invoice #${invoice.invoiceNumber || invoiceId.slice(-8)} from ${invoice.companyName || 'Your Company'}`,
      html: emailHtml,
      text: textVersion,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    console.log('📤 Sending REAL email to:', clientEmail);
    
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
      emailSent: true,
      lastSent: admin.firestore.FieldValue.serverTimestamp(),
      sentTo: clientEmail,
      sentBy: request.auth.uid,
      emailStatus: 'sent',
      messageId: emailResult.messageId,
      emailSubject: mailOptions.subject
    };

    await db.collection('invoices').doc(invoiceId).update(updateData);

    // Log successful email
    await db.collection('emailLogs').add({
      invoiceId: invoiceId,
      userId: request.auth.uid,
      clientEmail: clientEmail,
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
      clientEmail: clientEmail,
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
function generateProfessionalEmail(invoice, customMessage) {
  const itemsHtml = invoice.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; vertical-align: top;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center; vertical-align: top;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; vertical-align: top;">$${item.price.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; vertical-align: top;">$${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `).join('');

  const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const tax = invoice.taxAmount || 0;
  const discount = invoice.discount || 0;
  const discountAmount = subtotal * (discount / 100);
  const total = invoice.total || (subtotal - discountAmount + tax);

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
    .message {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      padding: 25px;
      border-radius: 10px;
      margin: 30px 0;
      border-left: 5px solid #1976d2;
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
          <p style="margin: 8px 0; font-weight: 600; color: #2c3e50;">${invoice.companyName || 'Your Company'}</p>
          ${invoice.companyEmail ? `<p style="margin: 8px 0; color: #6c757d;">${invoice.companyEmail}</p>` : ''}
          ${invoice.companyAddress ? `<p style="margin: 8px 0; color: #6c757d;">${invoice.companyAddress}</p>` : ''}
          ${invoice.companyPhone ? `<p style="margin: 8px 0; color: #6c757d;">${invoice.companyPhone}</p>` : ''}
        </div>
        <div>
          <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px;">BILL TO:</h3>
          <p style="margin: 8px 0; font-weight: 600; color: #2c3e50;">${invoice.clientName}</p>
          <p style="margin: 8px 0; color: #6c757d;">${invoice.clientEmail}</p>
          ${invoice.clientAddress ? `<p style="margin: 8px 0; color: #6c757d;">${invoice.clientAddress}</p>` : ''}
          ${invoice.clientPhone ? `<p style="margin: 8px 0; color: #6c757d;">${invoice.clientPhone}</p>` : ''}
        </div>
      </div>

      <div class="due-date">
        ⏰ <strong>Payment Due:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>

      <div class="message">
        <p style="margin: 0 0 12px 0; font-size: 16px;"><strong>Dear ${invoice.clientName},</strong></p>
        ${customMessage ? `<p style="margin: 0; font-size: 15px; line-height: 1.6;">${customMessage.replace(/\n/g, '<br>')}</p>` : `
          <p style="margin: 0; font-size: 15px; line-height: 1.6;">
            Please find your invoice details below. We appreciate your prompt payment.
          </p>
        `}
      </div>
      
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
        <div class="total-row">
          <span>Subtotal:</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>
        ${discount > 0 ? `
        <div class="total-row">
          <span>Discount (${discount}%):</span>
          <span style="color: #dc3545; font-weight: 600;">-$${discountAmount.toFixed(2)}</span>
        </div>
        ` : ''}
        ${tax > 0 ? `
        <div class="total-row">
          <span>Tax:</span>
          <span>$${tax.toFixed(2)}</span>
        </div>
        ` : ''}
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
      
      ${invoice.terms ? `
        <div style="margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 5px solid #6c757d;">
          <strong style="color: #495057;">Terms & Conditions:</strong><br>
          <p style="margin: 10px 0 0 0; color: #495057; font-size: 14px;">${invoice.terms}</p>
        </div>
      ` : ''}
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="https://feveck-invoice.web.app/invoices/${invoice.id}" 
           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; 
                  padding: 16px 32px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  display: inline-block; 
                  font-weight: 600; 
                  font-size: 16px;
                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                  transition: all 0.3s ease;">
          📄 View Online Invoice
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;">
        This invoice was sent via <strong style="color: #495057;">Simple Invoicing - A Fevco product</strong>
      </p>
      <p style="margin: 0; font-size: 13px; color: #868e96;">
        If you have any questions about this invoice, please contact ${invoice.companyEmail || 'the sender'}.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateTextVersion(invoice, customMessage) {
  const itemsText = invoice.items.map(item => 
    `• ${item.description} - ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`
  ).join('\n');

  const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const tax = invoice.taxAmount || 0;
  const discount = invoice.discount || 0;
  const discountAmount = subtotal * (discount / 100);
  const total = invoice.total || (subtotal - discountAmount + tax);

  return `
INVOICE #${invoice.invoiceNumber || invoice.id?.slice(-8) || 'N/A'}
==========================================

FROM: ${invoice.companyName || 'Your Company'}
${invoice.companyEmail ? `Email: ${invoice.companyEmail}` : ''}

BILL TO: ${invoice.clientName}
Email: ${invoice.clientEmail}

DUE DATE: ${new Date(invoice.dueDate).toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

${customMessage || 'Please find your invoice details below. We appreciate your prompt payment.'}

ITEMS:
${itemsText}

SUMMARY:
Subtotal: $${subtotal.toFixed(2)}
${discount > 0 ? `Discount (${discount}%): -$${discountAmount.toFixed(2)}` : ''}
${tax > 0 ? `Tax: $${tax.toFixed(2)}` : ''}
TOTAL DUE: $${total.toFixed(2)}

${invoice.notes ? `Notes: ${invoice.notes}` : ''}

View online: https://feveck-invoice.web.app/invoices/${invoice.id}

Thank you for your business!
==========================================
  `.trim();
}

// Function to send new user notification
const sendNewUserNotification = async (userData) => {
  console.log('📧 Sending new user notification for:', userData.email);
  
  const transporter = createTransporter();
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New User Registered</title>
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
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content { 
          padding: 30px; 
        }
        .user-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #28a745;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
        }
        .info-item {
          padding: 10px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }
        .label {
          font-weight: 600;
          color: #495057;
          font-size: 14px;
        }
        .value {
          color: #212529;
          margin-top: 5px;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          color: #6c757d; 
          font-size: 14px; 
          padding: 20px;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          background: #28a745;
          color: white;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 10px;
        }
        @media (max-width: 600px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
          .content {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 New User Registered</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">A new user has signed up for Simple Invoicing - A Fevco product</p>
        </div>
        
        <div class="content">
          <div class="user-info">
            <h3 style="margin: 0 0 15px 0; color: #28a745;">
              User Details
              ${userData.isAdmin ? '<span class="badge">ADMIN</span>' : ''}
            </h3>
            
            <div class="info-grid">
              <div class="info-item">
                <div class="label">👤 Name</div>
                <div class="value">${userData.displayName || 'Not provided'}</div>
              </div>
              
              <div class="info-item">
                <div class="label">📧 Email</div>
                <div class="value">${userData.email}</div>
              </div>
              
              <div class="info-item">
                <div class="label">🆔 User ID</div>
                <div class="value" style="font-family: monospace; font-size: 12px;">${userData.userId}</div>
              </div>
              
              <div class="info-item">
                <div class="label">📅 Registered</div>
                <div class="value">${new Date(userData.createdAt?.toDate() || new Date()).toLocaleString()}</div>
              </div>
              
              <div class="info-item">
                <div class="label">👑 Role</div>
                <div class="value">${userData.role || 'user'}</div>
              </div>
              
              <div class="info-item">
                <div class="label">✅ Status</div>
                <div class="value">Active</div>
              </div>
            </div>
          </div>

          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h4 style="margin: 0 0 10px 0; color: #0056b3;">Quick Actions</h4>
            <p style="margin: 0; color: #0056b3;">
              • View user in Firebase Console<br>
              • Check user permissions<br>
              • Monitor user activity
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://console.firebase.google.com/project/feveck-invoice/firestore/data/~2Fusers~2F${userData.userId}" 
               style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      display: inline-block; 
                      font-weight: 600;
                      box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);">
              🔍 View User in Firebase Console
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            This notification was sent from <strong>Simple Invoicing - A Fevco product</strong>
          </p>
          <p style="margin: 0; font-size: 13px; color: #868e96;">
            User registered on: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textVersion = `
NEW USER REGISTERED - Simple Invoicing - A Fevco product
==================================

A new user has signed up for your Simple Invoicing - A Fevco product:

👤 Name: ${userData.displayName || 'Not provided'}
📧 Email: ${userData.email}
🆔 User ID: ${userData.userId}
📅 Registered: ${new Date(userData.createdAt?.toDate() || new Date()).toLocaleString()}
👑 Role: ${userData.role || 'user'}
${userData.isAdmin ? '⭐ Status: ADMIN USER' : ''}

Quick Actions:
• View user: https://console.firebase.google.com/project/feveck-invoice/firestore/data/~2Fusers~2F${userData.userId}
• Check user permissions in Firebase Console

This notification was sent automatically from your Simple Invoicing - A Fevco product.
==================================
  `.trim();

  const mailOptions = {
    from: `"Simple Invoicing - A Fevco product [Notifications]" <${process.env.GMAIL_EMAIL}>`,
    to: 'christopher.feveck@gmail.com', // Your notification email
    subject: `🎉 New User Registered: ${userData.displayName || userData.email}`,
    html: emailHtml,
    text: textVersion,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high'
    }
  };

  try {
    const emailResult = await transporter.sendMail(mailOptions);
    console.log('✅ New user notification sent:', emailResult.messageId);
    
    // Log the notification
    await db.collection('adminNotifications').add({
      type: 'new_user_registered',
      userId: userData.userId,
      userEmail: userData.email,
      userName: userData.displayName,
      notificationSent: true,
      messageId: emailResult.messageId,
      sentTo: 'christopher.feveck@gmail.com',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return emailResult;
  } catch (error) {
    console.error('❌ Failed to send new user notification:', error);
    
    // Log the failure
    await db.collection('adminNotifications').add({
      type: 'new_user_registered',
      userId: userData.userId,
      userEmail: userData.email,
      userName: userData.displayName,
      notificationSent: false,
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    throw error;
  }
};

// NEW FUNCTION NAMES - Firestore Trigger: Send email when new user is added to users collection
exports.notifyNewUserCreated = onDocumentCreated('users/{userId}', async (event) => {
  console.log('🔔 New user document created trigger - notifyNewUserCreated');
  
  try {
    const userData = event.data.data();
    const userId = event.params.userId;

    console.log('New user data:', {
      userId: userId,
      email: userData.email,
      displayName: userData.displayName,
      isAdmin: userData.isAdmin
    });

    // Send notification email
    await sendNewUserNotification({
      userId: userId,
      ...userData
    });

    console.log('✅ New user notification processed successfully');

  } catch (error) {
    console.error('❌ Error in new user trigger:', error);
  }
});

// NEW FUNCTION NAMES - Firestore Trigger: Also trigger when new user is added to userRoles collection
exports.notifyNewUserRoleCreated = onDocumentCreated('userRoles/{userId}', async (event) => {
  console.log('🔔 New user role document created trigger - notifyNewUserRoleCreated');
  
  try {
    const userRoleData = event.data.data();
    const userId = event.params.userId;

    console.log('New user role data:', {
      userId: userId,
      email: userRoleData.email,
      role: userRoleData.role,
      isAdmin: userRoleData.isAdmin
    });

    // Get additional user data from users collection
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Send notification email with combined data
    await sendNewUserNotification({
      userId: userId,
      ...userRoleData,
      ...userData
    });

    console.log('✅ New user role notification processed successfully');

  } catch (error) {
    console.error('❌ Error in new user role trigger:', error);
  }
});

// Function to get notification statistics
exports.getNotificationStats = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }

  try {
    // Check if user is admin
    const userRoleDoc = await db.collection('userRoles').doc(request.auth.uid).get();
    const userRole = userRoleDoc.exists ? userRoleDoc.data() : null;
    
    if (!userRole?.isAdmin && userRole?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    // Get notification statistics
    const notificationsSnapshot = await db.collection('adminNotifications')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
    }));

    // Get user count
    const usersSnapshot = await db.collection('users').get();
    const userRolesSnapshot = await db.collection('userRoles').get();

    return {
      success: true,
      stats: {
        totalUsers: usersSnapshot.size,
        totalUserRoles: userRolesSnapshot.size,
        totalNotifications: notifications.length,
        recentNotifications: notifications.slice(0, 10)
      },
      notifications: notifications
    };
  } catch (error) {
    console.error('Error getting notification stats:', error);
    throw new Error(error.message);
  }
});

// Function to send welcome email to new users
const sendWelcomeEmail = async (userData) => {
  console.log('📧 Sending welcome email to new user:', userData.email);
  
  const transporter = createTransporter();
  
  const emailHtml = `
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
          background: #f8f9fa;
        }
        .container { 
          max-width: 600px; 
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
        }
        .content { 
          padding: 40px; 
        }
        .welcome-section {
          text-align: center;
          margin-bottom: 30px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 30px 0;
        }
        .feature-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e9ecef;
          transition: transform 0.2s ease;
        }
        .feature-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .feature-icon {
          font-size: 24px;
          margin-bottom: 10px;
        }
        .feature-title {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 8px;
        }
        .feature-description {
          color: #6c757d;
          font-size: 14px;
          line-height: 1.4;
        }
        .cta-section {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          padding: 30px;
          border-radius: 10px;
          text-align: center;
          margin: 30px 0;
          border-left: 5px solid #1976d2;
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
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          display: inline-block;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .user-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #28a745;
        }
        @media (max-width: 600px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
          .content {
            padding: 25px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Invoice App!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">
            Your account has been successfully created
          </p>
        </div>
        
        <div class="content">
          <div class="welcome-section">
            <h2 style="color: #2c3e50; margin-bottom: 15px;">
              Hello, ${userData.displayName || 'there'}!
            </h2>
            <p style="color: #6c757d; font-size: 16px; line-height: 1.6;">
              Thank you for joining Invoice App. We're excited to help you manage your invoices efficiently and professionally.
            </p>
          </div>

          <div class="user-info">
            <h3 style="color: #28a745; margin: 0 0 15px 0;">Your Account Details</h3>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px 20px; align-items: center;">
              <strong>Email:</strong>
              <span>${userData.email}</span>
              
              <strong>Account Type:</strong>
              <span>
                ${userData.isAdmin ? 'Administrator' : (userData.role === 'manager' ? 'Manager' : 'Standard User')}
                ${userData.isAdmin ? ' 👑' : ''}
              </span>
              
              <strong>Joined:</strong>
              <span>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          <div class="cta-section">
            <h3 style="color: #0056b3; margin: 0 0 15px 0;">Ready to Get Started?</h3>
            <p style="color: #0056b3; margin: 0 0 20px 0;">
              Create your first invoice and experience the power of professional invoice management.
            </p>
            <a href="https://feveck-invoice.web.app/dashboard" class="btn-primary">
              🚀 Launch Your Dashboard
            </a>
          </div>

          <h3 style="color: #2c3e50; text-align: center; margin: 40px 0 20px 0;">
            Everything You Can Do With Invoice App
          </h3>
          
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">📄</div>
              <div class="feature-title">Create Professional Invoices</div>
              <div class="feature-description">
                Generate beautiful, customizable invoices with your company branding
              </div>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon">✉️</div>
              <div class="feature-title">Email Invoices</div>
              <div class="feature-description">
                Send invoices directly to clients with professional email templates
              </div>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon">💰</div>
              <div class="feature-title">Track Payments</div>
              <div class="feature-description">
                Monitor invoice status and track payments in real-time
              </div>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon">📊</div>
              <div class="feature-title">View Reports</div>
              <div class="feature-description">
                Get insights with comprehensive reporting and analytics
              </div>
            </div>
          </div>

          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #ffc107;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">💡 Quick Start Tips</h4>
            <ul style="color: #856404; margin: 0; padding-left: 20px;">
              <li>Complete your company profile in settings</li>
              <li>Add your first client to the system</li>
              <li>Create a template for recurring invoices</li>
              <li>Set up payment terms and reminders</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6c757d; margin-bottom: 20px;">
              Need help getting started? Check out our resources:
            </p>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
              <a href="https://feveck-invoice.web.app/help" 
                 style="color: #007bff; text-decoration: none; padding: 10px 15px; border: 1px solid #007bff; border-radius: 6px; font-size: 14px;">
                📚 Help Center
              </a>
              <a href="https://feveck-invoice.web.app/tutorials" 
                 style="color: #28a745; text-decoration: none; padding: 10px 15px; border: 1px solid #28a745; border-radius: 6px; font-size: 14px;">
                🎥 Video Tutorials
              </a>
              <a href="mailto:support@invoiceapp.com" 
                 style="color: #6c757d; text-decoration: none; padding: 10px 15px; border: 1px solid #6c757d; border-radius: 6px; font-size: 14px;">
                💬 Contact Support
              </a>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            Thank you for choosing <strong>Invoice App</strong>
          </p>
          <p style="margin: 0; font-size: 13px; color: #868e96;">
            This email was sent to ${userData.email} as part of your account registration.<br>
            If you didn't create an account, please <a href="mailto:support@invoiceapp.com" style="color: #868e96;">contact us</a> immediately.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textVersion = `
WELCOME TO INVOICE APP!
=======================

Hello ${userData.displayName || 'there'}!

Thank you for joining Invoice App. Your account has been successfully created and is ready to use.

ACCOUNT DETAILS:
----------------
Email: ${userData.email}
Account Type: ${userData.isAdmin ? 'Administrator' : (userData.role === 'manager' ? 'Manager' : 'Standard User')}
Joined: ${new Date().toLocaleDateString()}

GET STARTED:
------------
• Create professional invoices
• Email invoices directly to clients
• Track payments and status
• Generate reports and analytics

QUICK START:
------------
1. Complete your company profile in settings
2. Add your first client to the system
3. Create your first invoice
4. Set up payment terms and reminders

LAUNCH YOUR DASHBOARD:
https://feveck-invoice.web.app/dashboard

NEED HELP?
----------
• Help Center: https://feveck-invoice.web.app/help
• Video Tutorials: https://feveck-invoice.web.app/tutorials
• Contact Support: support@invoiceapp.com

Thank you for choosing Invoice App!

This email was sent to ${userData.email} as part of your account registration.
If you didn't create an account, please contact us immediately.
=======================
  `.trim();

  const mailOptions = {
    from: `"Invoice App Welcome" <${process.env.GMAIL_EMAIL}>`,
    to: userData.email,
    subject: `🎉 Welcome to Invoice App, ${userData.displayName || 'there'}!`,
    html: emailHtml,
    text: textVersion,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high'
    }
  };

  try {
    const emailResult = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to user:', emailResult.messageId);
    
    // Log the welcome email
    await db.collection('userWelcomeEmails').add({
      userId: userData.userId,
      userEmail: userData.email,
      userName: userData.displayName,
      emailSent: true,
      messageId: emailResult.messageId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'welcome_email'
    });
    
    return emailResult;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    
    // Log the failure
    await db.collection('userWelcomeEmails').add({
      userId: userData.userId,
      userEmail: userData.email,
      userName: userData.displayName,
      emailSent: false,
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'welcome_email'
    });
    
    throw error;
  }
};

// Firestore Trigger: Send welcome email when new user is added to users collection
exports.onNewUserWelcome = onDocumentCreated('users/{userId}', async (event) => {
  console.log('👋 New user welcome trigger');
  
  try {
    const userData = event.data.data();
    const userId = event.params.userId;

    console.log('Sending welcome email to:', {
      userId: userId,
      email: userData.email,
      displayName: userData.displayName
    });

    // Wait a moment to ensure user role might be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get user role data if available
    let userRoleData = {};
    try {
      const userRoleDoc = await db.collection('userRoles').doc(userId).get();
      if (userRoleDoc.exists) {
        userRoleData = userRoleDoc.data();
      }
    } catch (roleError) {
      console.log('No user role found yet, continuing with basic user data');
    }

    // Send welcome email
    await sendWelcomeEmail({
      userId: userId,
      ...userData,
      ...userRoleData
    });

    console.log('✅ Welcome email processed successfully');

  } catch (error) {
    console.error('❌ Error in welcome email trigger:', error);
  }
});

// Firestore Trigger: Also send welcome when user role is created (as backup)
exports.onNewUserRoleWelcome = onDocumentCreated('userRoles/{userId}', async (event) => {
  console.log('👋 New user role welcome trigger');
  
  try {
    const userRoleData = event.data.data();
    const userId = event.params.userId;

    // Check if welcome email was already sent
    const welcomeCheck = await db.collection('userWelcomeEmails')
      .where('userId', '==', userId)
      .where('emailSent', '==', true)
      .limit(1)
      .get();

    if (!welcomeCheck.empty) {
      console.log('Welcome email already sent for user:', userId);
      return;
    }

    console.log('Sending welcome email via user role trigger:', {
      userId: userId,
      email: userRoleData.email
    });

    // Get user data
    let userData = {};
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userData = userDoc.data();
      }
    } catch (userError) {
      console.log('No user data found, using role data only');
    }

    // Send welcome email
    await sendWelcomeEmail({
      userId: userId,
      ...userData,
      ...userRoleData
    });

    console.log('✅ Welcome email sent via user role trigger');

  } catch (error) {
    console.error('❌ Error in user role welcome trigger:', error);
  }
});

// Function to resend welcome email to a user
exports.resendWelcomeEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }

  try {
    const { userId } = request.data;
    
    if (!userId) {
      throw new Error('userId parameter is required');
    }

    // Check if user is admin or requesting their own email
    const userRoleDoc = await db.collection('userRoles').doc(request.auth.uid).get();
    const userRole = userRoleDoc.exists ? userRoleDoc.data() : null;
    
    const isAdmin = userRole?.isAdmin || userRole?.role === 'admin';
    const isOwnAccount = request.auth.uid === userId;

    if (!isAdmin && !isOwnAccount) {
      throw new Error('You can only resend welcome emails for your own account');
    }

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    
    // Get user role data
    let userRoleData = {};
    const userRoleDocForUser = await db.collection('userRoles').doc(userId).get();
    if (userRoleDocForUser.exists) {
      userRoleData = userRoleDocForUser.data();
    }

    // Send welcome email
    await sendWelcomeEmail({
      userId: userId,
      ...userData,
      ...userRoleData
    });
    
    return {
      success: true,
      message: 'Welcome email resent successfully!',
      userEmail: userData.email
    };
  } catch (error) {
    console.error('Resend welcome email failed:', error);
    throw new Error(error.message);
  }
});


// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 0,
    stripePriceId: null,
    features: [
      'Up to 10 invoices per month',
      'Basic email templates',
      'Standard support',
      '1 user account'
    ],
    limits: {
      invoicesPerMonth: 10,
      customTemplates: false,
      advancedAnalytics: false,
      apiAccess: false
    }
  },
  professional: {
    name: 'Professional',
    price: 29,
    stripePriceId: 'price_your_professional_price_id', // Replace with your actual Stripe Price ID
    features: [
      'Unlimited invoices',
      'Custom email templates',
      'Advanced analytics',
      'Priority support',
      'Up to 5 team members',
      'Custom branding'
    ],
    limits: {
      invoicesPerMonth: 9999,
      customTemplates: true,
      advancedAnalytics: true,
      apiAccess: false
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    stripePriceId: 'price_your_enterprise_price_id', // Replace with your actual Stripe Price ID
    features: [
      'Everything in Professional',
      'API access',
      'White-label solution',
      'Dedicated account manager',
      'Unlimited team members',
      'Custom integrations'
    ],
    limits: {
      invoicesPerMonth: 9999,
      customTemplates: true,
      advancedAnalytics: true,
      apiAccess: true
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
      success_url: successUrl || 'https://feveck-invoice.web.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'https://feveck-invoice.web.app/pricing',
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

// 2. Create Stripe Customer Portal Session
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
      return_url: 'https://feveck-invoice.web.app/account',
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

// 4. Stripe Webhook Handler
exports.stripeWebhooksSimpleInvoicingPayment = onRequest(async (req, res) => {
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

  // Send welcome email for new subscription
  await sendSubscriptionWelcomeEmail(userId, plan);
  
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

  // Send cancellation email
  await sendSubscriptionCancelledEmail(userDoc.id);
  
  console.log(`✅ Subscription canceled for user ${userDoc.id}`);
}

async function handlePaymentSucceeded(invoice) {
  console.log('💳 Payment succeeded:', invoice.id);
  
  // Send payment confirmation email
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', invoice.customer)
    .limit(1)
    .get();

  if (!usersSnapshot.empty) {
    const userDoc = usersSnapshot.docs[0];
    await sendPaymentConfirmationEmail(userDoc.id, invoice);
  }
}

async function handlePaymentFailed(invoice) {
  console.log('❌ Payment failed:', invoice.id);
  
  // Send payment failure email
  const usersSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', invoice.customer)
    .limit(1)
    .get();

  if (!usersSnapshot.empty) {
    const userDoc = usersSnapshot.docs[0];
    await sendPaymentFailedEmail(userDoc.id, invoice);
  }
}

// Email Functions for Subscription Events
async function sendSubscriptionWelcomeEmail(userId, plan) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    const transporter = createTransporter();
    const planData = SUBSCRIPTION_PLANS[plan];

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #28a745;">🎉 Welcome to ${planData.name} Plan!</h2>
        <p>Hi ${userData.displayName || 'there'},</p>
        <p>Thank you for subscribing to the <strong>${planData.name}</strong> plan! You now have access to:</p>
        
        <ul style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          ${planData.features.map(feature => `<li style="margin: 8px 0;">✅ ${feature}</li>`).join('')}
        </ul>
        
        <p>You can manage your subscription anytime from your account settings.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://feveck-invoice.web.app/account" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Go to Your Account
          </a>
        </div>
        
        <p>Happy invoicing!<br>The Invoice App Team</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Invoice App" <${process.env.GMAIL_EMAIL}>`,
      to: userData.email,
      subject: `Welcome to ${planData.name} Plan!`,
      html: emailHtml
    });

    console.log(`✅ Welcome email sent for ${plan} plan to ${userData.email}`);
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
  }
}

async function sendSubscriptionCancelledEmail(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    const transporter = createTransporter();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6c757d;">📝 Subscription Cancelled</h2>
        <p>Hi ${userData.displayName || 'there'},</p>
        <p>Your subscription has been canceled. You'll continue to have access to premium features until the end of your billing period.</p>
        <p>After that, you'll be moved to our free Basic plan with limited features.</p>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <strong>Basic Plan Includes:</strong>
          <ul>
            <li>Up to 10 invoices per month</li>
            <li>Basic email templates</li>
            <li>Standard support</li>
          </ul>
        </div>
        
        <p>You can resubscribe anytime from your account settings.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://feveck-invoice.web.app/pricing" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Plans
          </a>
        </div>
        
        <p>Thank you for being with us!<br>The Invoice App Team</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Invoice App" <${process.env.GMAIL_EMAIL}>`,
      to: userData.email,
      subject: 'Your Subscription Has Been Cancelled',
      html: emailHtml
    });

    console.log(`✅ Cancellation email sent to ${userData.email}`);
  } catch (error) {
    console.error('❌ Failed to send cancellation email:', error);
  }
}

// 5. Check Invoice Limits Before Creating Invoice
exports.checkInvoiceLimit = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }

  try {
    const userId = request.auth.uid;
    
    // Get user's subscription status
    const getSubscriptionStatus = firebase.functions().httpsCallable('getSubscriptionStatus');
    const statusResult = await getSubscriptionStatus();
    
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

// 6. Get Pricing Plans
exports.getPricingPlans = onCall(async (request) => {
  return {
    success: true,
    plans: SUBSCRIPTION_PLANS
  };
});
