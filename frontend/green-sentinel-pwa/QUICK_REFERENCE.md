# Emergency Board + Twilio WhatsApp - Quick Reference

## 🎯 What's New

### ✅ True Modal Popup (React Portal)
- Centered on screen (not corner card)
- Dark backdrop overlay
- Red gradient background
- Pulse + bounce animations
- Impossible to miss

### ✅ Twilio WhatsApp Alerts
- Automatic alert sending
- Farm name included
- Threat type included
- Timestamp included
- Confidence score included

### ✅ Multilingual Support
- Marathi (मराठी)
- Hindi (हिंदी)
- English

---

## 🚀 Quick Start

### 1. Set Environment Variables
```bash
# .env.local
VITE_TWILIO_ACCOUNT_SID=xxx
VITE_TWILIO_AUTH_TOKEN=your_auth_token
VITE_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
VITE_TWILIO_WHATSAPP_TO=whatsapp:+xxxx
```

### 2. Create Backend Endpoint
```javascript
// /api/send-whatsapp (Node.js)
const twilio = require('twilio');
const client = twilio(accountSid, authToken);

app.post('/api/send-whatsapp', async (req, res) => {
  const message = await client.messages.create({
    from: 'whatsapp:+14155238886',
    body: req.body.message,
    to: req.body.to,
  });
  res.json({ messageSid: message.sid });
});
```

### 3. Start Dev Server
```bash
npm run dev
# Open http://localhost:5173
# Wait 30 seconds for threat
```

---

## 📱 WhatsApp Message Format

### Marathi
```
🚨 आग चा धोका!

शेत: आंबा का खेत
वेळ: 11:10 PM
विश्वास: 94%

तातडीने तपासा!
```

### Hindi
```
🚨 आग का खतरा!

खेत: आंबा का खेत
समय: 11:10 PM
विश्वास: 94%

तुरंत जांच करें!
```

### English
```
🚨 FIRE ALERT!

Farm: Mango Farm
Time: 11:10 PM
Confidence: 94%

Check immediately!
```

---

## 🎬 Demo Flow

| Time | What Happens |
|------|--------------|
| 0s | Dashboard loads, all farms GREEN |
| 30s | 🚨 Emergency board MODAL appears (centered, red, pulsing) |
| 30s | WhatsApp alert sent to farmer |
| 30s | Shows: "1 धोका" + Farm name + Timestamp |
| 60s | New threat generates, shows "2 धोके" |
| User | Clicks "✅ मी बघतोय" → Board disappears |
| 90s | New threat appears, cycle repeats |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/components/EmergencyBoard.tsx` | Modal popup (React Portal) |
| `src/services/twilioService.ts` | Twilio WhatsApp integration |
| `src/pages/Dashboard.tsx` | Main dashboard |
| `src/utils/mockData.ts` | Mock data + language settings |

---

## 🔧 Configuration

### Language Per Farm
```typescript
// src/utils/mockData.ts
'farm-2': {
  language: 'mr', // 'mr' | 'hi' | 'en'
  phoneNumber: '+919970187593',
}
```

### Threat Interval
```typescript
// src/pages/Dashboard.tsx
}, 30000); // milliseconds (30 seconds)
```

---

## ✨ Features

### Emergency Board
- ✅ True modal (React Portal)
- ✅ Centered on screen
- ✅ Dark backdrop
- ✅ Red gradient
- ✅ Pulse animation
- ✅ Bounce animation
- ✅ 72px buttons

### WhatsApp
- ✅ Automatic sending
- ✅ Farm name
- ✅ Threat type
- ✅ Timestamp
- ✅ Confidence score
- ✅ Multilingual
- ✅ Error handling

### Languages
- ✅ Marathi (मराठी)
- ✅ Hindi (हिंदी)
- ✅ English

---

## 🐛 Troubleshooting

### Emergency Board Not Appearing
- Check browser console (F12)
- Verify dev server running
- Wait full 30 seconds
- Refresh page (Ctrl+Shift+R)

### WhatsApp Not Sending
- Check backend endpoint running
- Verify Twilio credentials
- Check phone number format
- Check console for errors

### Message Not Received
- Verify phone joined Twilio sandbox
- Check phone number is correct
- Check Twilio logs

### Language Not Working
- Verify farm has language setting
- Check supported: 'mr', 'hi', 'en'
- Restart dev server

---

## 📊 Message Templates

### Threat Types
- `fire`: आग / आग / Fire
- `human`: चोर / चोर / Intruder
- `animal`: जनावर / जानवर / Animal

### Languages
- `mr`: Marathi (मराठी)
- `hi`: Hindi (हिंदी)
- `en`: English

---

## 🎓 Code Examples

### Send Alert Manually
```typescript
import { sendLocalizedAlert } from '../services/twilioService';

await sendLocalizedAlert(
  {
    farmName: 'आंबा का खेत',
    threatType: 'fire',
    timestamp: '11:10 PM',
    confidence: 94,
  },
  'mr' // Marathi
);
```

### Get Threat Label
```typescript
import { formatThreatType } from '../services/twilioService';

const label = formatThreatType('fire', 'mr');
// Returns: 'आग'
```

---

## ✅ Checklist

- [ ] Environment variables set
- [ ] Backend endpoint created
- [ ] Dev server running
- [ ] Emergency board appears as modal
- [ ] WhatsApp alert sent
- [ ] Message in correct language
- [ ] Farm name in message
- [ ] Threat type in message
- [ ] Timestamp in message
- [ ] Confidence score in message
- [ ] Acknowledge button works
- [ ] Panic button works
- [ ] Works on mobile
- [ ] No console errors

---

## 📞 Resources

- **Twilio Setup**: See `TWILIO_WHATSAPP_SETUP.md`
- **Full Guide**: See `EMERGENCY_BOARD_FINAL.md`
- **Demo Guide**: See `DEMO_GUIDE.md`

---

**Status**: ✅ READY TO USE
**Modal Type**: React Portal (True Modal)
**WhatsApp**: Twilio Integration
**Languages**: Marathi, Hindi, English
