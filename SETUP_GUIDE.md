# Green-Sentinel - Complete Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn
- Twilio account with WhatsApp sandbox
- Git

---

## 📦 Installation

### 1. Frontend Setup

```bash
cd frontend/green-sentinel-pwa

# Install dependencies (including MUI)
npm install

# Start dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
PORT=3001
EOF

# Start backend server
npm start
# Or for development with auto-reload
npm run dev
```

The backend will be available at `http://localhost:3001`

---

## 🔧 Configuration

### Twilio Setup

1. **Create Twilio Account**
   - Go to [Twilio Console](https://www.twilio.com/console)
   - Sign up or log in

2. **Get Credentials**
   - Account SID: Found in console dashboard
   - Auth Token: Found in console dashboard
   - Phone Number: Get a Twilio phone number

3. **Enable WhatsApp Sandbox**
   - Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
   - Join sandbox by sending `join [code]` to Twilio number
   - Get your Twilio WhatsApp number

4. **Update .env Files**

**Frontend (.env.local):**
```env
VITE_API_URL=http://localhost:3001
```

**Backend (.env):**
```env
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
PORT=3001
```

---

## 🎯 Features

### MUI Dialog Alert
- ✅ Professional Material-UI dialog
- ✅ Auto-dismiss after 10 seconds
- ✅ Manual close button
- ✅ Acknowledge button
- ✅ Real-time status updates
- ✅ Multilingual support

### Alert Methods
- ✅ WhatsApp via Twilio
- ✅ SMS via Twilio
- ✅ Real-time notifications
- ✅ Error handling

### Settings Page
- ✅ Phone number input
- ✅ Language selection (Marathi, Hindi, English)
- ✅ Alert thresholds
- ✅ Enable/disable WhatsApp and SMS
- ✅ Save settings to localStorage

---

## 📱 How It Works

### 1. Threat Detection
```
Auto-threat generates every 30 seconds
↓
MUI Dialog appears (centered, professional)
↓
Shows threat details (farm, type, confidence)
```

### 2. Alert Sending
```
Dialog opens
↓
Backend API called (/api/send-alert)
↓
Twilio sends WhatsApp + SMS
↓
Status shown in dialog
```

### 3. User Interaction
```
User clicks "Acknowledge"
↓
Dialog shows success state
↓
Auto-closes after 1.5 seconds
↓
Threat count resets
```

---

## 🎨 UI Components

### ThreatAlertDialog
- Material-UI Dialog
- Dark theme with gradient
- Threat-specific colors
- Confidence progress bar
- Status messages
- Auto-dismiss timer

### Settings Page
- Phone number input
- Language selector
- Threshold controls
- Alert method toggles
- Save button

---

## 📊 API Endpoints

### POST /api/send-alert
Send WhatsApp and SMS alerts

**Request:**
```json
{
  "phoneNumber": "+919970187593",
  "message": "🚨 आग चा धोका!...",
  "threatType": "fire",
  "farmName": "आंबा का खेत",
  "timestamp": "11:10 PM",
  "confidence": 94,
  "language": "mr"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert sent successfully",
  "data": {
    "whatsapp": {
      "sid": "SM...",
      "status": "queued",
      "timestamp": "2026-02-25T..."
    },
    "sms": {
      "sid": "SM...",
      "status": "queued",
      "timestamp": "2026-02-25T..."
    },
    "errors": []
  }
}
```

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "OK",
  "message": "Green-Sentinel Backend is running"
}
```

---

## 🧪 Testing

### 1. Test Frontend
```bash
cd frontend/green-sentinel-pwa
npm run dev
# Open http://localhost:5173
# Wait 30 seconds for threat
# See MUI dialog appear
```

### 2. Test Backend
```bash
# Check health
curl http://localhost:3001/health

# Send test alert
curl -X POST http://localhost:3001/api/send-alert \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919970187593",
    "message": "Test alert",
    "threatType": "fire",
    "farmName": "Test Farm",
    "timestamp": "11:10 PM",
    "confidence": 94,
    "language": "mr"
  }'
```

### 3. Check Twilio Logs
1. Go to [Twilio Console](https://www.twilio.com/console)
2. **Messaging** → **Logs**
3. See all sent messages

---

## 🐛 Troubleshooting

### MUI Not Installed
```bash
cd frontend/green-sentinel-pwa
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### Backend Not Running
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill process if needed
kill -9 <PID>

# Restart backend
npm start
```

### WhatsApp Not Sending
1. Check Twilio credentials in .env
2. Verify phone number is in sandbox
3. Check Twilio logs for errors
4. Verify backend is running

### Dialog Not Appearing
1. Check browser console for errors
2. Verify MUI is installed
3. Check if threat is being generated
4. Refresh page

---

## 📁 Project Structure

```
green-sentinel/
├── frontend/
│   └── green-sentinel-pwa/
│       ├── src/
│       │   ├── components/
│       │   │   └── ThreatAlertDialog.tsx    ✅ MUI Dialog
│       │   ├── services/
│       │   │   └── alertService.ts          ✅ Alert API
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx            ✅ Main dashboard
│       │   │   └── Settings.tsx             ✅ Settings with phone
│       │   └── utils/
│       │       └── mockData.ts              ✅ Mock data
│       └── package.json                     ✅ MUI added
├── backend/
│   ├── server.js                            ✅ Express server
│   └── package.json                         ✅ Dependencies
└── SETUP_GUIDE.md                           ✅ This file
```

---

## 🚀 Deployment

### Frontend (AWS Amplify)
```bash
cd frontend/green-sentinel-pwa
npm run build
# Deploy dist/ folder to Amplify
```

### Backend (AWS Lambda or EC2)
```bash
cd backend
npm install
# Deploy to Lambda or EC2
```

---

## 📞 Support

### Common Issues

**Q: MUI components not showing**
A: Run `npm install @mui/material @mui/icons-material @emotion/react @emotion/styled`

**Q: Backend not receiving requests**
A: Check CORS is enabled and backend is running on port 3001

**Q: WhatsApp not sending**
A: Verify Twilio credentials and phone number is in sandbox

**Q: Dialog not appearing**
A: Check browser console for errors, verify MUI is installed

---

## ✅ Checklist

- [ ] Node.js installed
- [ ] Frontend dependencies installed
- [ ] Backend dependencies installed
- [ ] Twilio account created
- [ ] Twilio credentials in .env
- [ ] WhatsApp sandbox joined
- [ ] Frontend running on 5173
- [ ] Backend running on 3001
- [ ] Dialog appears after 30 seconds
- [ ] WhatsApp alert received
- [ ] Settings page working
- [ ] Phone number saved
- [ ] Language selection working

---

## 🎓 Next Steps

1. **Customize Messages**: Edit `src/services/alertService.ts`
2. **Add Database**: Implement alert logging
3. **Add Authentication**: Secure the API
4. **Deploy**: Push to production
5. **Monitor**: Set up error tracking

---

**Status**: ✅ READY TO USE
**Last Updated**: February 25, 2026
**Version**: 1.0.0
