# WhatsApp Alert Integration Guide

## Overview

Green-Sentinel now sends real-time threat alerts via WhatsApp with configurable settings to prevent message exhaustion.

## Features

✅ **Real-time WhatsApp Alerts** - Instant notifications when threats are detected
✅ **Configurable Confidence Threshold** - Only send alerts above a certain confidence level
✅ **Alert Cooldown** - Prevent alert spam with configurable cooldown periods
✅ **Multi-language Support** - Alerts in Marathi, Hindi, and English
✅ **Easy Enable/Disable** - Toggle WhatsApp alerts on/off anytime

## Configuration

### Environment Variables (`.env.local`)

```env
# Enable/disable WhatsApp alerts
VITE_ENABLE_WHATSAPP_ALERTS=true

# Minimum confidence level (0-100) to send alert
# Higher = fewer messages, but might miss some threats
VITE_ALERT_CONFIDENCE_THRESHOLD=75

# Cooldown between alerts for same threat type (seconds)
# 0 = no cooldown, 300 = 5 minutes between alerts
VITE_ALERT_COOLDOWN_SECONDS=300

# Backend API URL
VITE_BACKEND_API_URL=http://localhost:3001

# Phone number to receive alerts
VITE_ALERT_PHONE_NUMBER=+919970187593
```

### Settings Page Configuration

Users can also configure alerts directly in the app:

1. Go to **Settings** (⚙️)
2. Enable/disable WhatsApp alerts
3. Set phone number
4. Adjust confidence threshold (slider)
5. Set cooldown period (slider)
6. Click "सेटिंग्स सेव करा" (Save Settings)

## How It Works

### Alert Flow

```
Threat Detected
    ↓
Check if alerts enabled
    ↓
Check confidence threshold
    ↓
Check cooldown period
    ↓
Send WhatsApp message via Twilio
    ↓
Display confirmation in UI
```

### Confidence Threshold

- **75%** (default): Balanced - catches most threats, reduces false alerts
- **85%+**: Conservative - only high-confidence threats
- **50-70%**: Aggressive - more alerts, might include false positives

### Cooldown Period

- **0 minutes**: Send every alert (uses more messages)
- **5 minutes** (default): Wait 5 minutes between same threat type
- **30+ minutes**: Reduce message volume significantly

## Message Limits

Twilio has message limits based on your account:

- **Trial Account**: ~100 messages/day
- **Paid Account**: Depends on your plan

### Tips to Reduce Message Usage

1. **Increase Confidence Threshold** to 85-90%
2. **Set Cooldown to 10-15 minutes**
3. **Disable alerts during low-risk hours**
4. **Monitor alert history** to identify false positives

## Testing

### Test WhatsApp Alert

1. Go to Settings
2. Enter your phone number
3. Enable WhatsApp alerts
4. Go to Dashboard
5. Wait for threat detection (auto-generates every 30 seconds in demo)
6. Check your WhatsApp for alert message

### Manual Test via Backend

```bash
curl -X POST http://localhost:3001/api/test-alert \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919970187593"}'
```

## Alert Message Format

### Marathi
```
🚨 आग चा धोका!

शेत: [Farm Name]
वेळ: [Timestamp]
विश्वास: [Confidence]%

तातडीने तपासा!
```

### Hindi
```
🚨 आग का खतरा!

खेत: [Farm Name]
समय: [Timestamp]
विश्वास: [Confidence]%

तुरंत जांच करें!
```

### English
```
🚨 FIRE ALERT!

Farm: [Farm Name]
Time: [Timestamp]
Confidence: [Confidence]%

Check immediately!
```

## Troubleshooting

### Not Receiving Messages

1. **Check if alerts are enabled**
   - Go to Settings → Enable WhatsApp alerts

2. **Verify phone number**
   - Must include country code (e.g., +91 for India)
   - Format: +[country code][number]

3. **Check confidence threshold**
   - If set too high, alerts might be filtered out
   - Try lowering to 50% for testing

4. **Check backend connection**
   - Ensure backend is running: `npm run dev` in backend folder
   - Check browser console for errors

5. **Verify Twilio credentials**
   - Check `backend/.env` has correct credentials
   - Test with `/api/test-alert` endpoint

### Too Many Messages

1. **Increase confidence threshold** to 85-90%
2. **Increase cooldown period** to 15-30 minutes
3. **Disable alerts** during specific hours
4. **Check for false positives** in threat detection

## Backend API

### Send Alert Endpoint

```
POST /api/send-alert
Content-Type: application/json

{
  "phoneNumber": "+919970187593",
  "message": "Alert message",
  "threatType": "fire|human|animal",
  "farmName": "Farm Name",
  "timestamp": "2024-02-26 10:30:45",
  "confidence": 85,
  "language": "mr|hi|en"
}
```

### Test Alert Endpoint

```
POST /api/test-alert
Content-Type: application/json

{
  "phoneNumber": "+919970187593"
}
```

## Storage

Settings are stored in browser localStorage:

- `alertPhoneNumber` - Phone number for alerts
- `alertLanguage` - Language preference
- `whatsappEnabled` - Enable/disable alerts
- `confidenceThreshold` - Confidence threshold (0-100)
- `cooldownMinutes` - Cooldown period in minutes

## Best Practices

1. **Start Conservative** - Set high confidence threshold initially
2. **Monitor Usage** - Check message count regularly
3. **Adjust Gradually** - Lower threshold slowly to find sweet spot
4. **Test First** - Use test endpoint before enabling auto-alerts
5. **Document Settings** - Note your configuration for reference

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs
3. Verify Twilio credentials
4. Test with `/api/test-alert` endpoint
5. Review this documentation
