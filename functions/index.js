// functions/index.js
const { onCall, onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Load environment variables from .env file
require('dotenv').config();

// Initialize Admin SDK
initializeApp();
const db = getFirestore();

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
      from: `"Invoice App" <${process.env.GMAIL_EMAIL}>`,
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

// Add a test function to verify configuration
exports.testEmailConfig = onCall(async (request) => {
  console.log('🧪 Testing email configuration...');
  
  try {
    const transporter = createTransporter();
    await transporter.verify();
    
    return {
      success: true,
      message: '✅ Email configuration is working! Real emails will be sent.',
      hasGmailConfig: true,
      email: process.env.GMAIL_EMAIL ? `${process.env.GMAIL_EMAIL.substring(0, 3)}...` : 'missing'
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Email configuration failed: ${error.message}`,
      hasGmailConfig: false,
      error: error.message
    };
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
        This invoice was sent via <strong style="color: #495057;">Invoice App</strong>
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

// Health check
exports.healthCheck = onRequest((req, res) => {
  const hasGmailConfig = !!(process.env.GMAIL_EMAIL && process.env.GMAIL_PASSWORD);
  
  res.json({ 
    status: 'healthy',
    production: true,
    hasGmailConfig: hasGmailConfig,
    timestamp: new Date().toISOString(),
    message: hasGmailConfig ? '✅ Production email system ready - REAL EMAILS' : '❌ Gmail configuration required'
  });
});