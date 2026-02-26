# Green-Sentinel Implementation Tasks - MVP Prototype (Target: March 7, 2026)

## Overview

This task list focuses on delivering a **working prototype** by March 7th with core functionality. Non-critical features are marked as optional. The prototype demonstrates:
- PWA dashboard with farm management
- Mock threat detection (no AI initially)
- Basic crop health display
- Alert system (SMS/WhatsApp mock)
- Multi-farm support

**Timeline**: 11 days (Feb 24 - Mar 7)
**Team Capacity**: Assumed 1-2 developers, full-time

---

## Phase 1: Foundation & Infrastructure (Days 1-3, Feb 24-26)

### 1.1 Project Setup & AWS Infrastructure
- [ ] Initialize Node.js/TypeScript project structure
- [ ] Set up AWS CLI and credentials
- [ ] Create DynamoDB tables (Farms, Users, Threats, HealthScores, AuditLog)
- [ ] Configure S3 bucket for frame storage with lifecycle policies
- [ ] Set up Secrets Manager for API credentials
- [ ] Create IAM roles and policies for Lambda functions
- [ ] Set up CloudWatch for logging and monitoring

**Acceptance Criteria:**
- AWS resources are provisioned and accessible
- DynamoDB tables have correct schema and indexes
- S3 bucket has 24-hour TTL lifecycle policy
- IAM roles follow least-privilege principle

### 1.2 React PWA Project Initialization
- [ ] Create React app with Vite
- [ ] Configure TypeScript and ESLint
- [x] Set up Tailwind CSS for styling in frontend green-sentinel-pwa folder
- [x] Implement service worker for offline support
- [x] Create web app manifest for PWA installation
- [x] Set up routing (React Router)

- [x] Run the UI and check all pages for now I dont have configured service workers so for now skip and continue 

- [ ] Configure environment variables for AWS endpoints

**Acceptance Criteria:**
- PWA is installable on mobile/desktop
- Service worker caches critical assets
- App loads in <8 seconds on 2G/3G (simulated)
- Responsive design works on 320px-1920px

### 1.3 Backend Lambda Layer Setup
- [ ] Create Lambda function base structure
- [ ] Set up SQS queues (FrameEvents, ThreatEvents, HealthEvents)
- [ ] Configure EventBridge for scheduled tasks
- [ ] Set up SNS topics for alerts
- [ ] Create Lambda layers for shared dependencies
- [ ] Implement centralized logging and error handling

**Acceptance Criteria:**
- Lambda functions can be deployed and invoked
- SQS queues are created and accessible
- EventBridge rules are configured
- Logging is centralized in CloudWatch

---

## Phase 2: Core Features - MVP (Days 4-8, Feb 27 - Mar 3)

### 2.1 User Authentication & Farm Management
- [ ] Implement JWT token generation and validation
- [ ] Create user registration endpoint
- [ ] Create farm registration endpoint
- [ ] Implement farm CRUD operations
- [ ] Create camera registration endpoint
- [ ] Store credentials in Secrets Manager
- [ ] Implement RBAC for multi-farm access

**Acceptance Criteria:**
- Users can register and log in
- JWT tokens are issued with 1-hour expiry
- Farms can be created, read, updated, deleted
- Cameras can be registered per farm
- Credentials are encrypted in Secrets Manager
- Users can only access their own farms

### 2.2 PWA Dashboard & UI Components
- [x] Create dashboard layout (header, sidebar, main content)

- [x] "Build Green-Sentinel PWA with VILLAGE NOTICE BOARD + THERMOMETER UI: Make it jazzy but simple use some colors, proper font attractive UI

1. **CORKBOARD TEXTURE** dashboard (brown paper background)
2. **PINNED PAPER NOTICES** for each farm (glassmorphism cards)
3. **LIQUID THERMOMETER BARS** (animated fill 0-100%)
4. **RED PULSING EMERGENCY BOARD** for threats  
5. **HINDI HEADLINES** 28px Noto Sans Devanagari
6. **PUणे/MAHARASHTRA** farm names + coordinates
7. **SWIPE GESTURES** + SHAKE phone support
8. **Auto threats every 30s** → Red board appears

Tech: React+TS+Vite+Tailwind+Framer Motion+vite-pwa
3 screens max, farmers understand in 5 seconds, judges screenshot for portfolio.

Generate COMPLETE CODE with mock data + Hindi voice announcements!"

Tech: React+TS+Vite+Tailwind+Framer Motion+vite-pwa
🌾 GREEN-SENTINEL - गावड्यांचा नोटिस बورد 🌾
============================================================
Namaskar [FarmerName - Krishna]
       🏞️ गुलाब का बाग (Rose Apple) 🟢
    ╔═══════════════════════════════════╗
    ║  📊 सेहत: ████████░░░░░ 82%        ║  ← Green liquid fill
    ║  📅 24-Feb-26 06:00 NDVI Update   ║
    ║  🚨 कोणताही धोका नाही            ║
    ║  📍 पुणे, महाराष्ट्र              ║
    ║                                   ║
    ║  [📞 कॉल]       [👁️ पहा]         ║  ← 72px buttons
    ╚═══════════════════════════════════╝

       🔥 आंबा का खेत - DHANGAL! 🔴     
    ╔═══════════════════════════════════╗
    ║  📊 सेहत: ████░░░░░░░░░░░ 42%      ║  ← Red flashing
    ║  ⏰ 11:10 PM - चोर दिसला! [📸]     ║
    ║  📊 विश्वास: ██████████ 94%        ║
    ║  📍 खेड, पुणे                     ║
    ║                                   ║
    ║  [✅ मी बघतोय] [🚨 आणीबाणी]       ║
    ╚═══════════════════════════════════╝

============================================================
         🟢 3 खेत सुरक्षित | 🔴 1 धोक्यात
============================================================
**BACKGROUND:** 
❌ White corporate → ✅ Corkboard texture (#D2B48C)
Paper pins + subtle shadows

**CARD DESIGN:**
Corner: Torn paper effect (jagged border)
Shadow: 0 25px 50px rgba(0,0,0,0.15)
Border: 2px solid #10B981 (green glow)

**THERMOMETER:**
Liquid animation: width 0% → 82% (2s ease-in-out)
Green: #10B981 → Yellow: #F59E0B → Red: #EF4444
Shine effect: gradient white overlay
Bubble particles on green farms

**HINDI FONT:**
Noto Sans Devanagari Bold 28px (headlines)
Regular 20px (body)
Red headlines = EMERGENCY pulse

**BUTTONS:**
72px height, 200px width min
Gradient green → white hover
Shadow lift on tap (translateY -2px)

**EMERGENCY STATE:**
Entire screen: Red pulse (opacity 0.1 → 1)
Hindi voice: "चोर आला! चोर आला!"
Swipe left → dismiss animation


- [ ] Implement farm selector/switcher
- [ ] Create threat alerts display component
- [ ] Create crop health score display component
- [ ] Implement threat history table
- [ ] Create settings page (language, thresholds, camera management)
- [ ] Add real-time update capability (WebSocket/AppSync mock)

**Acceptance Criteria:**
- Dashboard displays farm data
- Farm switcher works (<2s load time)
- Threat alerts are displayed with timestamp and confidence
- Crop health shows score and heatmap
- Settings page allows configuration changes
- UI is responsive and accessible

### 2.3 Mock Threat Detection Service
- [ ] Create Lambda function for threat detection
- [ ] Implement mock threat detection (random confidence scores)
- [ ] Create threat record in DynamoDB
- [ ] Publish threat events to SNS
- [ ] Implement latency tracking
- [ ] Create audit logging

**Acceptance Criteria:**
- Mock threats are generated with realistic confidence scores
- Threat records are stored in DynamoDB
- Latency is measured and logged
- Audit trail is created for each detection
- System handles concurrent threats without loss

### 2.4 Mock Crop Health Service
- [ ] Create Lambda function for health analysis
- [ ] Implement mock NDVI calculation (random values)
- [ ] Calculate Farm_Health_Score (0-100)
- [ ] Generate heatmap (Red/Yellow/Green)
- [ ] Store health scores in DynamoDB
- [ ] Implement health score change detection (>10 point change)

**Acceptance Criteria:**
- Health scores are calculated and stored
- Heatmaps are generated with correct color mapping
- Health score changes trigger alerts
- Historical data is retrievable
- Cached data fallback works

### 2.5 Alert Service - SMS/WhatsApp Mock
- [ ] Create Lambda function for alert composition
- [ ] Implement message template system
- [ ] Create mock translation service (English only for MVP)
- [ ] Implement mock Twilio WhatsApp delivery
- [ ] Create alert delivery logging
- [ ] Implement retry logic (mock)

**Acceptance Criteria:**
- Alerts are composed with threat details
- Messages are logged to DynamoDB
- Delivery status is tracked (sent, delivered, failed)
- Retry logic is implemented
- Latency is measured end-to-end

### 2.6 Frame Capture Service - Mock
- [ ] Create Lambda function for frame acquisition
- [ ] Implement mock RTSP frame capture (generate test images)
- [ ] Store frames in S3
- [ ] Publish frame events to SQS
- [ ] Implement connection retry logic (mock)
- [ ] Create frame metadata logging

**Acceptance Criteria:**
- Frames are captured at configured intervals
- Frames are stored in S3 with correct path structure
- Frame events are published to SQS
- Metadata is logged correctly
- Error handling works for corrupted frames

---

## Phase 3: Integration & Testing (Days 9-10, Mar 4-5)

### 3.1 End-to-End Integration Testing
- [ ] Test complete threat detection flow (frame → detection → alert)
- [ ] Test complete health monitoring flow (NDVI → score → alert)
- [ ] Test multi-farm concurrent processing
- [ ] Test PWA dashboard real-time updates
- [ ] Test offline functionality
- [ ] Measure end-to-end latency

**Acceptance Criteria:**
- All flows work end-to-end
- Latency is measured and logged
- Multi-farm processing works without interference
- Offline mode displays cached data
- Dashboard updates reflect backend changes

### 3.2 Unit Tests for Core Components
- [ ] Write tests for threat detection logic
- [ ] Write tests for health score calculation
- [ ] Write tests for alert composition
- [ ] Write tests for JWT token handling
- [ ] Write tests for DynamoDB operations
- [ ] Write tests for S3 operations

**Acceptance Criteria:**
- Unit tests cover core logic
- Tests pass with >80% code coverage
- Error cases are tested
- Edge cases are handled

### 3.3 Property-Based Tests (Critical Path)
- [ ] Property 24: End-to-End Latency Constraint (<10s)
- [ ] Property 10: Threat Detection Confidence Thresholds
- [ ] Property 5: Frame Capture Timing (±10%)
- [ ] Property 14: Health Score Calculation
- [ ] Property 35: Farm Data Isolation

**Acceptance Criteria:**
- All critical properties pass with 100+ iterations
- Counterexamples are documented
- Latency SLA is validated
- Data isolation is verified

---

## Phase 4: Polish & Deployment (Days 11, Mar 6-7)

### 4.1 Performance Optimization
- [ ] Optimize PWA bundle size (<500KB gzipped)
- [ ] Implement code splitting for routes
- [ ] Optimize images and assets
- [ ] Enable gzip compression
- [ ] Test load time on 2G/3G (simulated)
- [ ] Optimize Lambda cold start time

**Acceptance Criteria:**
- Initial load <8 seconds on 2G/3G
- Bundle size <500KB gzipped
- Lighthouse score >80
- Lambda cold start <3 seconds

### 4.2 Security Hardening
- [ ] Implement HTTPS/TLS
- [ ] Enable CORS properly
- [ ] Validate all inputs
- [ ] Implement rate limiting
- [ ] Enable CloudTrail for audit
- [ ] Review IAM policies

**Acceptance Criteria:**
- All endpoints use HTTPS
- CORS is configured correctly
- Input validation is in place
- Rate limiting prevents abuse
- Audit trail is enabled

### 4.3 Deployment & Documentation
- [ ] Deploy PWA to AWS Amplify
- [ ] Deploy Lambda functions
- [ ] Create deployment guide
- [ ] Create user guide for prototype
- [ ] Document API endpoints
- [ ] Create troubleshooting guide

**Acceptance Criteria:**
- PWA is live and accessible
- Lambda functions are deployed
- Documentation is complete
- Prototype is ready for demo

### 4.4 Demo Preparation
- [ ] Create demo script
- [ ] Prepare test data (farms, cameras, threats)
- [ ] Set up monitoring dashboard
- [ ] Create presentation slides
- [ ] Test all demo scenarios
- [ ] Prepare fallback scenarios

**Acceptance Criteria:**
- Demo script covers all features
- Test data is realistic
- Monitoring shows system health
- All demo scenarios work
- Fallback plans are ready

---

## Optional Features (Post-MVP, if time permits)

### 5.1 Real RTSP Integration*
- [ ] Integrate FFmpeg for RTSP streaming
- [ ] Implement connection pooling
- [ ] Add frame compression
- [ ] Handle connection failures

### 5.2 Bedrock Claude Integration*
- [ ] Integrate Amazon Bedrock
- [ ] Implement threat detection with Claude 3.5 Sonnet
- [ ] Add confidence score extraction
- [ ] Implement error handling and retries

### 5.3 Sentinel Hub Integration*
- [ ] Integrate Sentinel Hub API
- [ ] Fetch real NDVI data
- [ ] Implement cloud cover detection
- [ ] Add heatmap generation

### 5.4 Bhashini Translation*
- [ ] Integrate Bhashini API
- [ ] Implement multilingual translation
- [ ] Add voice synthesis
- [ ] Handle translation failures

### 5.5 Real Twilio WhatsApp*
- [ ] Integrate Twilio WhatsApp API
- [ ] Send real alerts
- [ ] Attach threat snapshots
- [ ] Track delivery status

---

## Success Criteria for Prototype (March 7)

✅ **Must Have:**
1. PWA dashboard accessible and installable
2. Farm and camera management working
3. Mock threat detection generating alerts
4. Mock crop health scores displaying
5. Alert system logging (mock delivery)
6. Multi-farm support functional
7. Offline mode working
8. Basic unit tests passing
9. Critical path property tests passing
10. Deployment guide complete

⚠️ **Nice to Have:**
- Real RTSP integration
- Bedrock Claude integration
- Sentinel Hub integration
- Bhashini translation
- Real Twilio WhatsApp

❌ **Out of Scope for MVP:**
- Production-grade monitoring
- Advanced analytics
- Mobile app (PWA only)
- Voice alerts
- Advanced RBAC

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| AWS setup delays | MEDIUM | HIGH | Start immediately, use CloudFormation templates |
| React PWA complexity | LOW | MEDIUM | Use Vite + existing templates, focus on MVP |
| Lambda cold starts | MEDIUM | MEDIUM | Use provisioned concurrency for critical functions |
| DynamoDB throttling | LOW | MEDIUM | Use on-demand billing, implement backoff |
| Integration delays | MEDIUM | HIGH | Mock external services first, integrate later |
| Testing delays | MEDIUM | MEDIUM | Focus on critical path properties only |
| Deployment issues | LOW | HIGH | Test deployment early and often |

---

## Daily Standup Template

**Date:** [Date]
**Completed:**
- [ ] Task X.Y completed
- [ ] Task X.Z completed

**In Progress:**
- [ ] Task X.A (% complete)
- [ ] Task X.B (% complete)

**Blockers:**
- [ ] Blocker 1: [Description] - [Mitigation]
- [ ] Blocker 2: [Description] - [Mitigation]

**Next 24 Hours:**
- [ ] Task X.C
- [ ] Task X.D

---

## Notes

- This is an aggressive timeline; focus on MVP features only
- Mock services first, integrate real APIs later
- Prioritize end-to-end flow over individual feature polish
- Test early and often
- Deploy frequently to catch issues early
- Document as you go
- Keep stakeholders updated daily

