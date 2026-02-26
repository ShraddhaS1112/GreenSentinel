// Green-Sentinel Backend Server
// Handles Twilio WhatsApp and SMS alerts

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'xxxx';
const authToken = process.env.TWILIO_AUTH_TOKEN || '[AuthToken]';
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

const client = twilio(accountSid, authToken);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Green-Sentinel Backend is running' });
});

/**
 * Test WhatsApp Alert
 * POST /api/test-alert
 */
app.post('/api/test-alert', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    const testMessage = `🚨 Green-Sentinel Test Alert\n\nThis is a test message from Green-Sentinel.\n\nTimestamp: ${new Date().toISOString()}\n\nIf you received this, WhatsApp integration is working correctly!`;

    const whatsappMessage = await client.messages.create({
      from: twilioWhatsAppNumber,
      body: testMessage,
      to: `whatsapp:${phoneNumber}`,
    });

    res.json({
      success: true,
      message: 'Test alert sent successfully',
      data: {
        sid: whatsappMessage.sid,
        status: whatsappMessage.status,
        to: phoneNumber,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`Test WhatsApp sent to ${phoneNumber}: ${whatsappMessage.sid}`);
  } catch (error) {
    console.error('Test alert error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send test alert',
      error: error.message,
    });
  }
});

/**
 * Send Alert via WhatsApp and SMS
 * POST /api/send-alert
 */
app.post('/api/send-alert', async (req, res) => {
  try {
    const {
      phoneNumber,
      message,
      threatType,
      farmName,
      timestamp,
      confidence,
      language,
    } = req.body;

    // Validate input
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required',
      });
    }

    const results = {
      whatsapp: null,
      sms: null,
      errors: [],
    };

    // Send WhatsApp message
    try {
      const whatsappMessage = await client.messages.create({
        from: twilioWhatsAppNumber,
        body: message,
        to: `whatsapp:${phoneNumber}`,
      });
      results.whatsapp = {
        sid: whatsappMessage.sid,
        status: whatsappMessage.status,
        timestamp: new Date().toISOString(),
      };
      console.log(`WhatsApp sent to ${phoneNumber}: ${whatsappMessage.sid}`);
    } catch (error) {
      results.errors.push({
        type: 'whatsapp',
        message: error.message,
      });
      console.error('WhatsApp error:', error.message);
    }

    // Send SMS message
    try {
      const smsMessage = await client.messages.create({
        from: twilioPhoneNumber,
        body: message,
        to: phoneNumber,
      });
      results.sms = {
        sid: smsMessage.sid,
        status: smsMessage.status,
        timestamp: new Date().toISOString(),
      };
      console.log(`SMS sent to ${phoneNumber}: ${smsMessage.sid}`);
    } catch (error) {
      results.errors.push({
        type: 'sms',
        message: error.message,
      });
      console.error('SMS error:', error.message);
    }

    // Log alert to database (optional)
    logAlert({
      phoneNumber,
      threatType,
      farmName,
      timestamp,
      confidence,
      language,
      results,
    });

    // Return response
    if (results.whatsapp || results.sms) {
      res.json({
        success: true,
        message: 'Alert sent successfully',
        data: results,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send alert via any channel',
        errors: results.errors,
      });
    }
  } catch (error) {
    console.error('Error in /api/send-alert:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get Alert History
 * GET /api/alerts
 */
app.get('/api/alerts', (req, res) => {
  // TODO: Implement database query
  res.json({
    success: true,
    alerts: [],
  });
});

/**
 * Log alert to database
 */
function logAlert(alertData) {
  // TODO: Implement database logging
  console.log('Alert logged:', {
    timestamp: new Date().toISOString(),
    ...alertData,
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Green-Sentinel Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
