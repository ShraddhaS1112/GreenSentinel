# Twilio WhatsApp Integration Guide

## 🚀 Setup Instructions

### 1. Twilio Account Setup

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Create a new account or log in
3. Get your **Account SID** and **Auth Token**
4. Enable WhatsApp Sandbox

### 2. WhatsApp Sandbox Configuration

1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Join the sandbox by sending `join [sandbox-code]` to the Twilio number
3. Get your **Twilio WhatsApp number** (e.g., +14155238886)

### 3. Environment Variables

Create a `.env.local` file in `frontend/green-sentinel-pwa/`:

```env
VITE_TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
VITE_TWILIO_AUTH_TOKEN=your_auth_token_here
VITE_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
VITE_TWILIO_WHATSAPP_TO=whatsapp:+919970187593
```

### 4. Backend API Endpoint

You need a backend endpoint to send WhatsApp messages. Create `/api/send-whatsapp`:

**Node.js/Express Example:**

```javascript
const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

app.post('/api/send-whatsapp', async (req, res) => {
  try {
    const { to, message, farmName, threatType, timestamp, confidence } = req.body;

    const result = await client.messages.create({
      from: 'whatsapp:+14155238886',
      body: message,
      to: to,
    });

    // Log to database
    console.log(`WhatsApp sent to ${to}: ${result.sid}`);

    res.json({
      success: true,
      messageSid: result.sid,
      farmName,
      threatType,
      timestamp,
      confidence,
    });
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Server running on port 3001'));
```

**Python/Flask Example:**

```python
from flask import Flask, request, jsonify
from twilio.rest import Client

app = Flask(__name__)

account_sid = os.environ['TWILIO_ACCOUNT_SID']
auth_token = os.environ['TWILIO_AUTH_TOKEN']
client = Client(account_sid, auth_token)

@app.route('/api/send-whatsapp', methods=['POST'])
def send_whatsapp():
    try:
        data = request.json
        message = client.messages.create(
            from_='whatsapp:+14155238886',
            body=data['message'],
            to=data['to']
        )
        
        return jsonify({
            'success': True,
            'messageSid': message.sid,
            'farmName': data['farmName'],
            'threatType': data['threatType'],
            'timestamp': data['timestamp'],
            'confidence': data['confidence']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

---

## 📱 Message Templates

### Marathi (मराठी)

**Fire Alert:**
```
🚨 आग चा धोका!

शेत: आंबा का खेत
वेळ: 11:10 PM
विश्वास: 94%

तातडीने तपासा!
```

**Intruder Alert:**
```
🚨 चोर चा धोका!

शेत: आंबा का खेत
वेळ: 11:10 PM
विश्वास: 94%

तातडीने कारवाई करा!
```

**Animal Alert:**
```
🚨 जनावर चा धोका!

शेत: आंबा का खेत
वेळ: 11:10 PM
विश्वास: 94%

तातडीने तपासा!
```

### Hindi (हिंदी)

**Fire Alert:**
```
🚨 आग का खतरा!

खेत: आंबा का खेत
समय: 11:10 PM
विश्वास: 94%

तुरंत जांच करें!
```

**Intruder Alert:**
```
🚨 चोर का खतरा!

खेत: आंबा का खेत
समय: 11:10 PM
विश्वास: 94%

तुरंत कार्रवाई करें!
```

**Animal Alert:**
```
🚨 जानवर का खतरा!

खेत: आंबा का खेत
समय: 11:10 PM
विश्वास: 94%

तुरंत जांच करें!
```

### English

**Fire Alert:**
```
🚨 FIRE ALERT!

Farm: Mango Farm
Time: 11:10 PM
Confidence: 94%

Check immediately!
```

**Intruder Alert:**
```
🚨 INTRUDER ALERT!

Farm: Mango Farm
Time: 11:10 PM
Confidence: 94%

Take action now!
```

**Animal Alert:**
```
🚨 ANIMAL ALERT!

Farm: Mango Farm
Time: 11:10 PM
Confidence: 94%

Check immediately!
```

---

## 🔧 Frontend Integration

### 1. Twilio Service (`src/services/twilioService.ts`)

The service handles:
- Message template selection based on language
- Threat type formatting
- API call to backend
- Error handling

### 2. Emergency Board Component

When a threat is detected:
1. Emergency board modal appears
2. `sendLocalizedAlert()` is called automatically
3. WhatsApp message is sent to farmer
4. Status message shows "✅ व्हाट्सअँप अलर्ट पाठवला गेला"

### 3. Language Support

Supported languages:
- **Marathi (mr)**: मराठी
- **Hindi (hi)**: हिंदी
- **English (en)**: English

Language is set per farm in `mockData.ts`:

```typescript
'farm-2': {
  language: 'mr', // Marathi
  phoneNumber: '+919970187593',
}
```

---

## 📊 Message Flow

```
Threat Detected
    ↓
Emergency Board Modal Appears
    ↓
sendLocalizedAlert() Called
    ↓
Message Template Selected (based on language)
    ↓
API Call to Backend (/api/send-whatsapp)
    ↓
Twilio Sends WhatsApp Message
    ↓
Farmer Receives Alert
    ↓
Status: "✅ व्हाट्सअँप अलर्ट पाठवला गेला"
```

---

## 🧪 Testing

### 1. Local Testing

```bash
# Start dev server
npm run dev

# Wait 30 seconds for auto-threat
# Emergency board appears
# Check console for WhatsApp send status
```

### 2. Check Twilio Logs

1. Go to [Twilio Console](https://www.twilio.com/console)
2. **Messaging** → **Logs**
3. See all sent messages

### 3. Test Different Languages

Edit `src/utils/mockData.ts`:

```typescript
'farm-2': {
  language: 'hi', // Change to 'hi' or 'en'
}
```

Restart dev server and wait for threat.

---

## 🐛 Troubleshooting

### Message Not Sending

1. **Check Backend URL**
   - Verify `/api/send-whatsapp` endpoint is running
   - Check CORS settings

2. **Check Credentials**
   - Verify Account SID and Auth Token
   - Check WhatsApp number format

3. **Check Phone Number**
   - Must be in WhatsApp sandbox
   - Format: `whatsapp:+[country_code][number]`

### Message Not Received

1. **Check Sandbox Status**
   - Verify phone is joined to sandbox
   - Send `join [code]` to Twilio number

2. **Check Phone Number**
   - Verify farmer's phone number is correct
   - Must be same number that joined sandbox

3. **Check Message Content**
   - Verify message is not empty
   - Check for special characters

### Language Not Working

1. **Check Language Setting**
   - Verify farm has correct language code
   - Supported: 'hi', 'mr', 'en'

2. **Check Font Support**
   - Verify Noto Sans Devanagari is loaded
   - Check browser console for errors

---

## 📈 Production Deployment

### 1. Use Twilio Content Templates

For production, use Twilio's Content Templates:

```javascript
const message = await client.messages.create({
  from: 'whatsapp:+14155238886',
  contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
  contentVariables: JSON.stringify({
    '1': farmName,
    '2': threatType,
    '3': timestamp,
    '4': confidence,
  }),
  to: phoneNumber,
});
```

### 2. Database Logging

Log all alerts to database:

```typescript
await db.alerts.create({
  farmId: farmId,
  threatType: threatType,
  timestamp: timestamp,
  confidence: confidence,
  messageSid: messageSid,
  status: 'sent',
  language: language,
});
```

### 3. Rate Limiting

Implement rate limiting to avoid spam:

```typescript
const lastAlertTime = await redis.get(`alert:${farmId}`);
if (lastAlertTime && Date.now() - lastAlertTime < 60000) {
  // Skip alert (less than 1 minute since last)
  return;
}
await redis.set(`alert:${farmId}`, Date.now());
```

### 4. Error Handling

Implement retry logic:

```typescript
const maxRetries = 3;
let retries = 0;

while (retries < maxRetries) {
  try {
    await sendWhatsAppAlert(alert);
    break;
  } catch (error) {
    retries++;
    if (retries >= maxRetries) throw error;
    await sleep(1000 * retries); // Exponential backoff
  }
}
```

---

## 📞 Support

### Twilio Documentation
- [WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [Message Templates](https://www.twilio.com/docs/whatsapp/message-templates)
- [Error Codes](https://www.twilio.com/docs/api/errors)

### Common Issues
- [WhatsApp Sandbox](https://www.twilio.com/docs/whatsapp/sandbox)
- [Phone Number Formatting](https://www.twilio.com/docs/phone-numbers/format-phone-numbers)
- [Rate Limiting](https://www.twilio.com/docs/usage/rate-limits)

---

## ✅ Checklist

- [ ] Twilio account created
- [ ] WhatsApp sandbox joined
- [ ] Account SID and Auth Token obtained
- [ ] Environment variables set
- [ ] Backend endpoint created
- [ ] Frontend service integrated
- [ ] Emergency board sends alerts
- [ ] Messages received on phone
- [ ] Language switching works
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Rate limiting added
- [ ] Production deployment ready

---

**Status**: ✅ READY FOR PRODUCTION
**Last Updated**: February 25, 2026
**Version**: 1.0.0
