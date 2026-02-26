# Green-Sentinel Development Roadmap

## Phase 1: MVP Foundation (COMPLETED ✅)

### Day 1-2: PWA Scaffold + Backend
- [x] Vite React TypeScript setup
- [x] Frontend running on localhost:5173
- [x] Express backend on localhost:3001
- [x] CORS configured for frontend-backend communication
- [x] Dashboard with farm cards + threat display
- [x] Offline support (service worker + cache)

### Day 2: WhatsApp Integration (COMPLETED ✅)
- [x] Twilio WhatsApp API integration
- [x] Backend `/api/send-alert` endpoint
- [x] Backend `/api/test-alert` endpoint
- [x] Frontend alert service with cooldown + confidence threshold
- [x] Settings page for alert configuration
- [x] Multi-language support (Marathi, Hindi, English)
- [x] Environment-based configuration (.env.local)

### Day 2: UI/UX Polish (COMPLETED ✅)
- [x] Emergency board with threat alerts
- [x] Threat history display
- [x] Farm health visualization
- [x] Responsive design for mobile

---

## Phase 2: NDVI + Satellite Integration (NEXT - Day 1)

### Setup & Dependencies
- [ ] Install Leaflet: `npm i react-leaflet leaflet @types/leaflet` (in frontend folder)
- [ ] Download Pune Landsat sample from landsatlook.usgs.gov (Search "Pimpri-Chinchwad 2025")
- [ ] Create AWS account + set up billing alerts

### AWS Budget Setup
- [ ] Create $0 budget in AWS Billing Console
- [ ] Set email alert at ₹0.01 spend
- [ ] Enable Free Tier notifications

### NDVI Prototype
- [ ] Fork SageMaker "satellite imagery tutorial" notebook
- [ ] Upload GeoTIFF to S3 bucket
- [ ] Create Lambda for NDVI calculation: `(NIR-Red)/(NIR+Red)`
- [ ] Store NDVI results in DynamoDB
- [ ] Build React dashboard with color-coded heatmap:
  - Green (0.6+) = Healthy crops
  - Yellow (0.3-0.6) = Stressed crops
  - Red (<0.3) = Critical

### WhatsApp + SNS Integration
- [ ] Test WhatsApp alerts via AWS SNS → Twilio API
- [ ] Trigger alerts on low NDVI values

---

## Phase 3: Camera Integration (Day 3+)

### Hardware Setup
- [ ] Set up Raspberry Pi + camera module
- [ ] Configure MQTT → AWS IoT Core
- [ ] Stream live camera feed

### AI Detection
- [ ] Amazon Rekognition Custom Labels for crop disease detection
- [ ] Train model on farm disease images
- [ ] Real-time inference on camera frames

### Hybrid Dashboard
- [ ] Merge satellite NDVI data with camera feed
- [ ] Display combined farm health score
- [ ] Show disease + threat alerts together

---

## Phase 4: Hackathon Polish (Weekend)

### Deployment
- [ ] Deploy React app via AWS Amplify
- [ ] Set up custom domain
- [ ] Enable HTTPS

### Localization
- [ ] Add Marathi farmer interface
- [ ] Add Hindi farmer interface
- [ ] Test with native speakers

### Demo Preparation
- [ ] Record 2-minute demo video:
  - Satellite imagery → NDVI calculation
  - AI threat detection
  - WhatsApp farmer alert
  - Real-time dashboard update
- [ ] Live demo setup: 2 phones (PWA + WhatsApp receiver)
- [ ] Pitch deck: "Zero-install PWA, Free Tier compliant, scales to 1000 farms"

### Submission
- [ ] Push to GitHub with professional README
- [ ] Include architecture diagram
- [ ] Submit AWS account ID for credits

---

## Current Status

✅ **Completed:**
- PWA frontend with offline support
- Express backend with Twilio integration
- WhatsApp alerts with configurable thresholds
- Multi-language support
- Settings page for user configuration

⏳ **Next Immediate Steps:**
1. Install Leaflet for map visualization
2. Download Pune Landsat satellite data
3. Set up AWS account + billing alerts
4. Create NDVI prototype with Lambda

---

## Success Metrics

| Phase | Success Criteria |
|-------|-----------------|
| Phase 1 | ✅ WhatsApp alerts working, PWA offline-capable |
| Phase 2 | NDVI heatmap displays, satellite data integrated |
| Phase 3 | Camera feed + disease detection working |
| Phase 4 | 2-min demo video, deployed on Amplify |

---

## Quick Commands

```bash
# Start frontend
cd frontend/green-sentinel-pwa && npm run dev

# Start backend
cd backend && npm run dev

# Install Leaflet
cd frontend/green-sentinel-pwa && npm i react-leaflet leaflet @types/leaflet

# Test WhatsApp
curl -X POST http://localhost:3001/api/test-alert \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919970187593"}'
```
