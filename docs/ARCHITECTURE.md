# GreenSentinel — System Architecture

> **Digital Immune System for Indian Agriculture**
> Satellite intelligence + Edge AI + Real-time alerts — protecting ₹18 lakh crore in annual crop value.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem & Solution](#2-problem--solution)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture (AWS)](#5-backend-architecture-aws)
6. [AI & Intelligence Pipeline](#6-ai--intelligence-pipeline)
7. [Edge Agent — Autonomous CCTV Monitoring](#7-edge-agent--autonomous-cctv-monitoring)
8. [Data Architecture](#8-data-architecture)
9. [Authentication & Security](#9-authentication--security)
10. [Notification Pipeline](#10-notification-pipeline)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Cost Architecture](#12-cost-architecture)
13. [API Reference](#13-api-reference)
14. [Technology Decisions](#14-technology-decisions)
15. [Scalability Design](#15-scalability-design)
16. [Competitive Differentiation](#16-competitive-differentiation)

---

## 1. Executive Summary

GreenSentinel is a **production-deployed, cloud-native agricultural intelligence platform** that serves Indian farmers through three interlocking capabilities:

| Capability | Technology | Farmer Benefit |
|---|---|---|
| **Satellite Crop Monitoring** | Sentinel-2 NDVI via Element84 STAC API | Weekly crop health score without field visit |
| **AI Disease Detection** | AWS Bedrock Claude Vision | Identify disease from a smartphone photo in 8 seconds |
| **Autonomous Threat Surveillance** | Edge Agent + Bedrock | Fire / intruder / animal alerts to WhatsApp within 2 minutes |

**Live deployment:**
- Frontend: CloudFront CDN — `https://d[...].cloudfront.net`
- API Gateway: `https://4uogxqomb0.execute-api.ap-south-1.amazonaws.com/dev`
- Region: `ap-south-1` (Mumbai — closest to Indian farmers)
- Stack: 100% serverless, ~₹500/month for a 3-farm operation

---

## 2. Problem & Solution

### The Problem

Indian agriculture faces a ₹90,000 crore annual crop loss from **preventable** causes — diseases detected too late, fires spreading unnoticed overnight, wild animals destroying standing crops, and crop health declining silently between visits. The farmer with 3 hectares cannot afford an agronomist on retainer. He has a basic smartphone. He speaks Kannada, not English. His internet is 3G when the rain cooperates.

Existing solutions are either:
- Too expensive (Precision Ag platforms for large corporates)
- Too narrow (single-purpose apps — just weather, or just a marketplace)
- Not designed for the Indian context (English-only, no WhatsApp, require high-end phones)

### The Solution Architecture Philosophy

GreenSentinel is architected around three constraints that shaped every design decision:

> **Constraint 1: The farmer's phone is the only screen.**
> → Mobile-first at 375px viewport, offline-first PWA, WhatsApp as the primary notification channel.

> **Constraint 2: Every rupee of infrastructure cost must be justified.**
> → Serverless pay-per-use, free satellite APIs, AI budget guards (200 calls/day server-side), ₹500/month total infra.

> **Constraint 3: Real data only — no fabricated numbers erode farmer trust.**
> → No hardcoded NDVI values, no estimated savings, no derived "AI scores". Show `--` when data is unavailable.

---

## 3. System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  FARMER'S DEVICES                                                               │
│                                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────────┐  │
│  │  Smartphone PWA  │    │  Tablet / Web    │    │  Edge Agent (Pi/PC/NVR)  │  │
│  │  (375px mobile)  │    │  (Dashboard)     │    │  node agent.js + ffmpeg  │  │
│  │  Offline-first   │    │  Expert Mode     │    │  4 camera types: rtsp,   │  │
│  │  7 languages     │    │  NDVI charts     │    │  snapshot, webcam, file  │  │
│  └────────┬─────────┘    └────────┬─────────┘    └───────────┬──────────────┘  │
└───────────┼──────────────────────┼────────────────────────── │───────────────┘
            │  HTTPS               │  HTTPS                     │  HTTPS
            ▼                      ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  AWS CLOUD  (ap-south-1, Mumbai)                                                 │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  CloudFront CDN  (E7IN6ZTW0EXV5)                                           │  │
│  │  Assets: Cache 1 year (immutable)  │  index.html: no-cache                │  │
│  └────────────────────────┬───────────────────────────────────────────────────┘  │
│                           │                                                      │
│  ┌────────────────────────▼───────────────────────────────────────────────────┐  │
│  │  S3  (green-sentinel-dev-frontend-938881281454)                             │  │
│  │  dist/assets/  → hashed JS/CSS bundles                                     │  │
│  │  dist/         → index.html, manifest.webmanifest, sw.js                   │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  API Gateway  (REST)  →  4uogxqomb0.execute-api.ap-south-1.amazonaws.com   │  │
│  │  /dev stage  │  CORS enabled  │  Lambda Proxy integration                  │  │
│  └──────┬───────────────────────────────────────────────────────┬─────────────┘  │
│         │                                                        │               │
│  ┌──────▼──────────────────┐              ┌─────────────────────▼──────────┐    │
│  │  api-handler Lambda      │              │  Cognito Auth Lambda Triggers  │    │
│  │  Node.js 20.x  512 MB   │              │  • define-auth-challenge        │    │
│  │  30s timeout            │              │  • create-auth-challenge (OTP) │    │
│  │                         │              │  • verify-auth-challenge        │    │
│  │  Routes:                │              │  • pre-signup (auto-confirm)    │    │
│  │  /farms        CRUD     │              └────────────────────────────────┘    │
│  │  /alerts       CRUD     │                                                    │
│  │  /satellite    GET      │   ┌──────────────────────────────────────────────┐ │
│  │  /crop-health  GET      │   │  Scheduled Lambdas                           │ │
│  │  /forecast     GET      │   │  • satellite-processor  (NDVI calc, 5m, 1GB) │ │
│  │  /disease-scan POST/GET │   │  • disease-forecast     (weather ML, 5m)     │ │
│  │  /threat-detect POST    │   │  • yield-predictor      (NDVI regression)    │ │
│  │  /irrigation   GET      │   └──────────────────────────────────────────────┘ │
│  │  /agent-hb     GET      │                                                    │
│  └──────┬──────────────────┘                                                    │
│         │                                                                        │
│  ┌──────┴──────────────────────────────────────────────────────────────────────┐ │
│  │  Data Layer                                                                  │ │
│  │                                                                              │ │
│  │  DynamoDB (PAY_PER_REQUEST)    S3 (satellite-imagery)                       │ │
│  │  • farms              ←  userId + farmId (PK+SK)                            │ │
│  │  • alerts             ←  farmId + alertTimestamp                            │ │
│  │  • satellite-data     ←  farmId + captureDate                               │ │
│  │  • crop-health        ←  fieldId + recordDate                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │  AI Layer                                                                     │ │
│  │                                                                               │ │
│  │  AWS Bedrock                                                                  │ │
│  │  ┌─────────────────────────────────────────────────────┐                     │ │
│  │  │  Disease Scanner                                     │                     │ │
│  │  │  Model: apac.anthropic.claude-3-5-sonnet-20241022-v2 │                     │ │
│  │  │  Input: plant leaf photo (S3 presigned upload)       │                     │ │
│  │  │  Output: disease, confidence, treatment, Hindi name  │                     │ │
│  │  └─────────────────────────────────────────────────────┘                     │ │
│  │  ┌─────────────────────────────────────────────────────┐                     │ │
│  │  │  Threat Detection (Live Camera)                      │                     │ │
│  │  │  Stage 1: claude-3-haiku (fast first pass)           │                     │ │
│  │  │  Stage 2: claude-3-5-sonnet-v2 APAC (if medium+)    │                     │ │
│  │  │  Output: fire%, human%, animal species, actions      │                     │ │
│  │  └─────────────────────────────────────────────────────┘                     │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │  Alert Pipeline                                                                │ │
│  │  SNS Topic → alert-sender Lambda → Twilio → WhatsApp (+91XXXXXXXXXX)          │ │
│  │  Twilio secret in Secrets Manager (accountSid, authToken, whatsappFrom)       │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
            │                          │
            ▼                          ▼
┌──────────────────────┐   ┌──────────────────────────┐
│  Element84 Earth     │   │  Open-Meteo Weather API  │
│  Search STAC API     │   │  (FREE, no API key)       │
│  sentinel-2-l2a      │   │  hourly + daily forecast  │
│  FREE, no key        │   │  temperature, humidity,   │
│                      │   │  precipitation, windspeed │
└──────────────────────┘   └──────────────────────────┘
```

---

## 4. Frontend Architecture

### Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| UI Framework | React | 18.2 | Component tree, Suspense, Concurrent |
| Language | TypeScript | 5.3 | Type safety across 41 source files |
| Build Tool | Vite | 5.0 | ESM-native, HMR, code splitting |
| Styling | Tailwind CSS | 3.4 | Utility-first, responsive utilities |
| State | Zustand | 4.4 | Minimal, persisted, offline-aware |
| Data Fetch | TanStack Query | 5.17 | Stale-while-revalidate, background sync |
| Routing | React Router | 6.21 | Client-side SPA routing |
| Maps | Leaflet + react-leaflet | 1.9 / 4.2 | NDVI overlay, farm boundary |
| Charts | Chart.js + react-chartjs-2 | 4.4 | NDVI time-series, health trends |
| Auth | AWS Amplify | 6.0 | Cognito phone+OTP integration |
| Animations | Framer Motion | 10.18 | Micro-interactions, transitions |
| PWA | Workbox / vite-plugin-pwa | 7.0 / 0.17 | Offline cache, install prompt |
| Icons | Lucide React | 0.309 | 300+ tree-shakeable SVG icons |
| Notifications | React Hot Toast | 2.4 | Ephemeral feedback toasts |
| Forms | React Hook Form | 7.49 | Uncontrolled forms, validation |

### Directory Structure

```
frontend/src/
├── components/
│   ├── LiveCamera.tsx          # RTSP/HTTP/webcam stream viewer
│   │                           # Motion detection → Bedrock threat analysis
│   │                           # Two-stage AI (Haiku fast pass → Sonnet confirm)
│   ├── SatelliteMap.tsx        # Leaflet map with NDVI/NDWI/LAI layers
│   │                           # Mobile: collapsible layer switcher
│   │                           # Desktop: persistent layer buttons
│   ├── layout/
│   │   ├── Layout.tsx          # Shell: sidebar (desktop) + header + bottom nav
│   │   ├── Header.tsx          # Farm selector, online indicator, user menu
│   │   ├── Sidebar.tsx         # Desktop navigation with route icons
│   │   ├── BottomNav.tsx       # Expert mode: 5-tab mobile nav
│   │   └── SimpleBottomNav.tsx # Simple mode: 3-tab mobile nav
│   ├── common/
│   │   ├── InfoTooltip.tsx     # Explained labels (NDVI, LAI, etc.)
│   │   │                       # Portal-based, viewport-clamped for mobile
│   │   ├── LoadingScreen.tsx   # Branded splash on app init
│   │   └── OfflineBanner.tsx   # Sticky banner when window.navigator.onLine=false
│   └── notifications/
│       └── NotificationPanel.tsx # Alert inbox, mark-read, severity badges
│
├── pages/
│   ├── Dashboard.tsx           # Farm intelligence hub (main landing)
│   ├── CropHealth.tsx          # NDVI timeline + health score cards
│   ├── DiseaseScanner.tsx      # Upload/camera → Bedrock analysis → results
│   ├── ThreatHistory.tsx       # Alert log: fire/camera/disease/weather
│   ├── Weather.tsx             # Forecast + disease risk overlay
│   ├── IrrigationPlanner.tsx   # Water schedule recommendations
│   ├── FarmManagement.tsx      # Add/edit farms, crop types, boundaries
│   ├── CameraManagement.tsx    # Configure edge agent feeds, test streams
│   ├── Settings.tsx            # UI mode, language, accessibility, thresholds
│   ├── Login.tsx               # Phone number entry + OTP verification
│   ├── SimpleDashboard.tsx     # Stripped-down view for low-literacy farmers
│   └── NotFound.tsx            # 404 with home navigation
│
├── stores/                     # Zustand state (localStorage persisted)
│   ├── farmStore.ts            # Farms, cameras, health scores, online status
│   ├── authStore.ts            # User session, Cognito config, OTP flow
│   └── preferencesStore.ts     # UI mode, language, accessibility
│
├── services/
│   └── apiService.ts           # All REST calls, 5-min localStorage cache
│
└── index.css                   # Tailwind base + custom design tokens
```

### State Management Design

Three Zustand stores, all persisted to `localStorage`:

```typescript
// farmStore — primary data store
{
  farms: Farm[];                  // All user farms
  currentFarmId: string | null;   // Selected farm (persisted)
  isOnline: boolean;              // window.online/offline listener
  lastSyncedAt: string | null;    // ISO timestamp of last successful API sync
  // Actions: fetch, save, delete farms; add/update/remove cameras
}

// authStore — identity
{
  user: User | null;
  signInStep: 'PHONE' | 'OTP' | 'DONE';
  pendingPhoneNumber: string | null;
  cognitoConfigured: boolean;
  // Fallback: mockLogin() if Cognito not configured (demo mode)
}

// preferencesStore — accessibility + locale
{
  uiMode: 'simple' | 'expert';   // Farmer vs. agronomist view
  language: 'en'|'hi'|'kn'|'ta'|'te'|'mr'|'bn';
  largeText: boolean;
  highContrast: boolean;
  voiceGuidance: boolean;
}
```

### PWA Configuration

```typescript
// vite.config.ts — Workbox strategy
workbox: {
  skipWaiting: true,           // New SW activates immediately (no reload prompt)
  clientsClaim: true,          // Claims all open pages immediately
  runtimeCaching: [
    {
      urlPattern: /api\.amazonaws\.com\/.*/,
      handler: 'NetworkFirst',  // Fresh data when online, cache fallback on 2G
      expiration: { maxAgeSeconds: 86400 } // 24-hour API cache
    },
    {
      urlPattern: /amazonaws\.com\/assets\/.*/,
      handler: 'CacheFirst',    // Satellite imagery served from cache
      expiration: { maxAgeSeconds: 604800 } // 7-day asset cache
    }
  ]
}
```

**Build chunks (manual splitting for optimal caching):**
```
vendor.js     → react, react-dom, react-router-dom   (changes rarely)
charts.js     → chart.js, react-chartjs-2             (changes rarely)
amplify.js    → aws-amplify                            (changes rarely)
index.js      → app core, routing, stores              (changes on deploy)
[page].js     → each page lazy-loaded on first visit   (per-page cache)
```

### Mobile-First Conventions

- **Minimum viewport:** 375px (iPhone SE, budget Android)
- **Tooltips:** `createPortal` into `document.body` with `getBoundingClientRect()` clamping — never overflow viewport
- **Satellite map controls:** Horizontal strip on mobile (tap to expand), vertical column on desktop
- **Bottom navigation:** 3-tab (Simple mode) or 5-tab (Expert mode)
- **Touch targets:** Minimum 44×44px per WCAG 2.1

---

## 5. Backend Architecture (AWS)

### Lambda Functions

All Lambda functions use **Node.js 20.x** runtime with the AWS SDK v3 (modular, tree-shakeable).

#### api-handler (`green-sentinel-dev-api-handler`)

The monolithic request router. A deliberate architectural choice: one Lambda = one cold start pool, simpler IAM, easier deployment. All routes are handled in a single inline `index.handler` function with O(1) path-based dispatch.

| Property | Value |
|---|---|
| Runtime | Node.js 20.x |
| Memory | 512 MB |
| Timeout | 30 seconds |
| Concurrency | Default (burst: 3000) |
| Code size | ~8.7 KB (inline, no zip dependencies) |

**Route dispatch logic:**
```
path.startsWith('/farms')          → CRUD on DynamoDB farms table
path.startsWith('/alerts')         → CRUD on DynamoDB alerts table
path.startsWith('/satellite')      → Query satellite-data table
path.startsWith('/crop-health')    → Query crop-health table
path.startsWith('/forecast')       → Invoke disease-forecast computation
path.startsWith('/disease-scan')   → S3 presigned URL + Bedrock Claude Vision
path.startsWith('/threat-detect')  → Bedrock two-stage threat analysis
path.startsWith('/irrigation')     → Irrigation recommendation engine
path.startsWith('/agent-heartbeat')→ Edge agent status read/write
path.startsWith('/health')         → Liveness probe
```

#### satellite-processor (`green-sentinel-dev-satellite-processor`)

| Property | Value |
|---|---|
| Memory | 1024 MB |
| Timeout | 5 minutes |
| Trigger | Scheduled (EventBridge) or on-demand |

**Sentinel-2 NDVI pipeline:**
```
1. Fetch farm boundary (lat/lng bbox from DynamoDB)
2. Query Element84 Earth Search STAC API
   GET https://earth-search.aws.element84.com/v1/search
   Filter: sentinel-2-l2a, cloud_cover < 30%, last 30 days
3. Download Band 4 (Red, 665nm) + Band 8 (NIR, 842nm) COG tiles
4. Calculate per-pixel:
   NDVI = (NIR - Red) / (NIR + Red)      → vegetation health
   NDWI = (Green - NIR) / (Green + NIR)  → water content
   LAI  = f(NDVI)                         → leaf area estimate
5. Store result in DynamoDB satellite-data table
   TTL: 30 days
6. If NDVI drops >15% vs. previous reading → trigger SNS alert
```

**Health classification:**
```
NDVI ≥ 0.70  → excellent (score: 95)
NDVI ≥ 0.60  → good      (score: 80)
NDVI ≥ 0.40  → moderate  (score: 60)
NDVI ≥ 0.20  → stressed  (score: 40)
NDVI < 0.20  → poor      (score: 20)
```

#### disease-forecast (`green-sentinel-dev-disease-forecast`)

**Weather data:** Open-Meteo API (free, no key, hourly forecasts)

**Disease risk models (rule-based ML):**

| Disease | Crops | Trigger Conditions |
|---|---|---|
| Late Blight | Potato, Tomato | Humidity >80%, Temp 10-25°C, Rain |
| Powdery Mildew | Wheat, Grapes, Peas | Humidity 60-90%, Temp 20-30°C |
| Leaf Rust | Wheat, Pulses, Coffee | Humidity >70%, Temp 15-30°C |
| Bacterial Wilt | Tomato, Potato, Brinjal | Temp >25°C, Humidity >70% |
| Downy Mildew | Grapes, Onion, Spinach | Humidity >85%, Temp 15-20°C |
| Neck Rot | Onion, Garlic | Rain at harvest, Humidity >80% |

**Pest models:**

| Pest | Crops | Trigger Conditions |
|---|---|---|
| Fall Armyworm | Maize, Rice, Sugarcane | Temp 25-35°C, Humidity 60-80% |
| Aphids | Multiple | Temp 20-28°C, Dry conditions |
| Stem Borer | Rice, Maize | Temp 25-35°C, Humidity >70% |
| Mealybugs | Grapes, Cotton | Temp >25°C, High humidity |

#### alert-sender (`green-sentinel-dev-alert-sender`)

| Property | Value |
|---|---|
| Memory | 256 MB |
| Timeout | 1 minute |
| Trigger | SNS subscription (green-sentinel-dev-alerts) |

**Alert flow:**
```
SNS publish → alert-sender triggered
  → Scan DynamoDB farms by farmId (not userId — avoids auth mismatch)
  → Read farm.notificationPhone ("whatsapp:+91XXXXXXXXXX")
  → Build WhatsApp message (String.fromCharCode(10) for real newlines)
  → POST to Twilio API (HTTPS, Basic Auth)
  → Log Twilio SID on success
  → Fallback to SMS if WhatsApp fails
```

**Message format (WhatsApp):**
```
🚨 *GreenSentinel Alert*
🟠 HIGH — SK Farm

*Fire detected - CAM-01 - North Field*
Fire detected (92% confidence)
Action: Contact local fire services immediately
```

### DynamoDB Schema

#### farms table

```
Partition Key: userId (String)
Sort Key: farmId (String)

Attributes:
  name            (String)    "SK Farm"
  location        (Map)       { latitude, longitude, address, district, state }
  totalArea       (Number)    hectares
  areaUnit        (String)    "hectares" | "acres"
  crops           (List)      ["Grapes", "Wheat"]
  irrigationType  (String)    "drip" | "sprinkler" | "flood"
  soilType        (String)    "black" | "red" | "alluvial"
  notificationPhone (String)  "whatsapp:+919035349707"
  cameras         (List)      [{ id, name, type, url }]
  createdAt       (String)    ISO timestamp
  updatedAt       (String)    ISO timestamp

GSI: by-location (partitionKey: region)
```

#### alerts table

```
Partition Key: farmId (String)
Sort Key: alertTimestamp (String, ISO)

Attributes:
  alertId         (String)    "alert_1722203456065"
  alertType       (String)    "disease" | "camera" | "weather" | "satellite" | "irrigation" | "pest"
  severity        (String)    "low" | "medium" | "high" | "critical"
  title           (String)    "Fire detected - CAM-01 - North Field"
  description     (String)    JSON-stringified analysis result
  isRead          (Boolean)   false
  ttl             (Number)    Unix epoch + 90 days (auto-delete)

GSI: by-type (partitionKey: alertType)
```

#### satellite-data table

```
Partition Key: farmId (String)
Sort Key: captureDate (String, ISO)

Attributes:
  ndvi            (Number)    0.0 – 1.0
  ndwi            (Number)    -1.0 – 1.0
  lai             (Number)    Leaf Area Index
  cloudCover      (Number)    0 – 100 %
  healthStatus    (String)    "excellent" | "good" | "moderate" | "stressed" | "poor"
  healthScore     (Number)    0 – 100
  source          (String)    "sentinel-2"
  processedAt     (String)    ISO timestamp
  bbox            (List)      [minLng, minLat, maxLng, maxLat]
```

---

## 6. AI & Intelligence Pipeline

### Disease Scanner

**User flow:**
```
1. Farmer opens Disease Scanner page
2. Takes photo or uploads from gallery
3. Optionally types crop name ("Grapes")
4. Frontend calls GET /disease-scan/upload-url
   → Lambda generates S3 presigned PUT URL (60s expiry)
   → Returns { uploadUrl, scanId, key }
5. Frontend PUTs image directly to S3 (bypasses Lambda, no size limit)
6. Frontend calls POST /disease-scan/analyze
   { farmId, scanId, key, cropType }
7. Lambda fetches image from S3 → converts to base64
8. Lambda calls Bedrock Claude Vision:
   Model: apac.anthropic.claude-3-5-sonnet-20241022-v2:0
   System: "You are a plant disease detection specialist. NEVER conclude
            healthy if ANY abnormality is visible..."
   User: [base64 image] + detailed pathologist prompt
9. Parse response with indexOf/lastIndexOf (regex-free, no escape issues)
10. Store result in DynamoDB alerts table (TTL: 90 days)
11. Return analysis to frontend
12. If high/critical severity → publish to SNS → WhatsApp alert
```

**Prompt engineering key principles:**
- System prompt enforces detection bias: "False negatives cost Indian farmers their livelihoods"
- CRITICAL RULES section prevents "healthy" verdict when symptoms are visible
- `cropContext` provides plant type hint but instructs model to report what it *actually* sees
- Output schema specified verbatim in prompt to ensure parseable JSON
- Hindi disease name requested in `hindiName` field (farmer-friendly)

**Output schema:**
```json
{
  "detected": true,
  "disease": "Early Blight",
  "confidence": 87,
  "severity": "high",
  "symptoms": ["Brown circular lesions with yellow halo", "Lower leaves yellowing"],
  "causes": ["Alternaria solani fungus", "High humidity + warm days"],
  "treatment": ["Apply Mancozeb 75% WP", "Remove affected leaves"],
  "prevention": ["Crop rotation", "Avoid overhead irrigation"],
  "affectedCrops": ["Tomato"],
  "hindiName": "अगेती झुलसा",
  "summary": "The plant shows early blight infection. Apply copper fungicide immediately."
}
```

### Threat Detection (Two-Stage Architecture)

The camera threat detection uses a **two-stage AI cascade** to minimize cost while maintaining accuracy:

```
Stage 1 — Fast Screening (always runs):
  Model: anthropic.claude-3-haiku-20240307-v1:0
  Cost: ~$0.0003/call
  Goal: Quick binary threat/no-threat decision
  If overallThreat = "none" OR "low" → STOP (don't pay for Sonnet)

Stage 2 — Deep Analysis (only if medium+ threat):
  Model: apac.anthropic.claude-3-5-sonnet-20241022-v2:0
  Cost: ~$0.003/call
  Goal: Accurate threat classification, species ID, actionable recommendations

Cost savings: ~90% reduction vs. running Sonnet on every frame
```

**Threat categories:**

| Category | Detects | Indian Context |
|---|---|---|
| Fire | Flames, smoke, orange/red glow, smoldering | Stubble burning, field fires |
| Human | Count, activity, suspicious vs. farmer | Night intruders, boundary violations |
| Animal | Species (nilgai, boar, monkey, elephant, cattle) | Crop raiding wildlife |

**Output schema:**
```json
{
  "fire": { "detected": true, "confidence": 95, "description": "Active fire" },
  "human": { "detected": true, "confidence": 85, "count": 1, "activity": "Moving near boundary", "suspicious": true },
  "animal": { "detected": false, "confidence": 0, "species": [], "description": null },
  "overallThreat": "critical",
  "recommendations": ["Contact fire services", "Alert security personnel"]
}
```

### AI Cost Management

**Server-side budget guard (in api-handler Lambda):**
```javascript
// DynamoDB record: { userId: '_system', farmId: 'ai-budget-YYYY-MM-DD' }
// callCount incremented on each Bedrock call
// If callCount >= MAX_DAILY_AI_CALLS (200) → return 429

if (dailyCallCount >= maxDailyCalls) {
  return { statusCode: 429, body: JSON.stringify({
    error: 'Daily AI limit reached. Resets at midnight IST.'
  })};
}
```

**Edge agent budget guard (client-side):**
```javascript
// maxDailyCallsLocal: 100 (configured in config.json)
// Reset at midnight local time
// Prevents runaway costs if server check fails
```

---

## 7. Edge Agent — Autonomous CCTV Monitoring

The Edge Agent runs on the farmer's existing hardware — a Raspberry Pi, Windows PC, an old laptop, or even Android (via Termux). It transforms any CCTV system into an AI-powered threat detection network.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Edge Agent Process (agent.js)                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Camera Sources (configured in config.json)               │   │
│  │  • HTTP Snapshot    → fetch(url) → buffer                │   │
│  │  • HTTP MJPEG       → stream buffer                      │   │
│  │  • RTSP Stream      → ffmpeg -i rtsp:// -vframes 1       │   │
│  │  • USB Webcam       → ffmpeg -f v4l2 -i /dev/video0      │   │
│  │  • MP4 File (demo)  → ffmpeg -i video.mp4 -ss {t}        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Motion Detection (pixel diff algorithm)                  │   │
│  │  • Compare current frame vs. previous frame              │   │
│  │  • Calculate % changed pixels                            │   │
│  │  • Trigger AI if diff > motionThreshold% (default: 5%)   │   │
│  │  • Always trigger if > {cooldown} minutes elapsed        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Frame Preprocessing (cost optimization)                  │   │
│  │  • Resize to 640×480 (configurable)                      │   │
│  │  • JPEG quality 3 (configurable) — ~15KB per frame       │   │
│  │  • Base64 encode for API transport                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Cooldown Logic (prevents API spam)                       │   │
│  │  • Day (6AM-6PM):   5 min between calls per camera       │   │
│  │  • Night (6PM-6AM): 2 min between calls per camera       │   │
│  │  • Per-camera tracking (cameras run independently)       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Heartbeat (every 60 seconds)                             │   │
│  │  POST /agent-heartbeat                                    │   │
│  │  { farmId, cameras: [{id, name, status}], lastSeen }     │   │
│  │  → Displays in Dashboard: "Agent Online / Offline"       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Camera Type Compatibility

| Type | `config.json` value | Hardware | ffmpeg |
|---|---|---|---|
| HTTP Snapshot | `"snapshot"` | Budget IP cameras, NVRs | No |
| HTTP MJPEG | `"mjpeg"` | Web cameras, Axis, Hikvision | No |
| RTSP Stream | `"rtsp"` | Professional IP cameras, NVRs | Yes |
| USB Webcam | `"webcam"` | Raspberry Pi Camera, V4L2 | Yes |
| Video File | `"file"` | Demo/testing (MP4) | Yes |

### Cost Model

**4 cameras, continuous monitoring, 24/7:**

| Component | Rate | Monthly Estimate |
|---|---|---|
| Bedrock Claude Vision (Haiku) | $0.0003/call | $1.80 (6000 calls) |
| Bedrock Claude Vision (Sonnet) | $0.003/call | $0.30 (100 escalations) |
| SNS SMS / WhatsApp | ~₹0.50/alert | ₹5 (10 real alerts) |
| Lambda execution | Free tier | Free |
| CloudWatch Logs | Minimal | ~₹20 |
| **Total** | | **~₹230/month** |

### Supported Hardware

```
Raspberry Pi 4 (2GB+) with Pi Camera or USB webcam
Any Linux PC with ffmpeg (Ubuntu, Debian, Fedora)
Windows PC (Node.js + ffmpeg for Windows)
Android phone running Termux
NAS devices with Node.js support (Synology, QNAP)
```

### Installation

```bash
# Linux (Raspberry Pi, Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs ffmpeg
cd edge-agent
cp config.example.json config.json   # Edit: farmId, phoneNumber, camera URLs
node agent.js

# Windows
# Install Node.js 20 from nodejs.org
# Install ffmpeg from ffmpeg.org, add to PATH
node agent.js

# As Linux service (auto-restart)
sudo systemctl enable greensentinel-edge
sudo systemctl start greensentinel-edge
```

---

## 8. Data Architecture

### Data Flow Overview

```
Farmer Input (photos, farm setup)
        ↓
API Gateway → api-handler Lambda
        ↓
DynamoDB (farms, alerts, satellite-data, crop-health)
        ↓
Satellite Processor (scheduled)
  → Element84 STAC API → NDVI calculation → DynamoDB
        ↓
Disease Forecast (scheduled/on-demand)
  → Open-Meteo API → risk scores → DynamoDB
        ↓
Frontend fetch → 5-min localStorage cache
  → Zustand store → React components
```

### Data Retention

| Table | TTL | Reason |
|---|---|---|
| farms | None (permanent) | Core business data |
| alerts | 90 days | Agronomic value window |
| satellite-data | 30 days | Fresh NDVI sufficient |
| crop-health | None | Historical value |
| disease-scan images (S3) | 30 days (lifecycle) | Cost control |

### Offline Data Strategy

The frontend is **offline-first**. On initial load:
1. Zustand rehydrates all 3 stores from `localStorage`
2. API calls are made in background (`stale-while-revalidate`)
3. On API failure, last fetched data is displayed
4. 5-minute API response cache prevents redundant calls on 2G

Service Worker (Workbox) caches:
- All JS/CSS/HTML bundles (1 year)
- API responses (24 hours via `NetworkFirst`)
- Satellite imagery tiles (7 days via `CacheFirst`)

---

## 9. Authentication & Security

### Authentication Flow (Phone OTP)

```
1. Farmer enters phone number (+91XXXXXXXXXX)
   → Client-side: E.164 format normalization

2. Frontend calls Cognito: initiateAuth(phone)
   → Cognito triggers create-auth-challenge Lambda
   → Lambda generates 6-digit OTP, stores in Cognito session
   → Lambda sends OTP via AWS SNS SMS (~₹0.50)
   → SMS delivered to farmer within 30 seconds

3. Farmer enters OTP
   → Frontend calls Cognito: respondToAuthChallenge(otp)
   → Cognito triggers verify-auth-challenge Lambda
   → Lambda compares OTP → issues JWT tokens

4. JWT stored in AWS Amplify (memory + Cognito Hosted UI session)
   → Amplify auto-refreshes tokens silently
   → All API calls include Authorization header

5. Demo fallback (if Cognito not configured):
   → authStore.mockLogin() → sets synthetic user object
   → Used for investor demos, testing
```

### IAM Architecture

**Lambda execution role (`green-sentinel-dev-lambda-role`):**
```
DynamoDB: GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan
S3: GetObject, PutObject, DeleteObject (disease-scan bucket only)
Bedrock: InvokeModel (Claude models only)
SNS: Publish (to alert topic only)
SecretsManager: GetSecretValue (Twilio secret only)
Logs: CreateLogGroup, CreateLogDelivery, PutLogEvents
```

Minimal permissions — each action scoped to specific resources.

### Secrets Management

**Twilio credentials (`green-sentinel-dev/twilio`):**
```json
{
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxx",
  "authToken": "xxxxxxxxxxxxxxxxxxxxxxxx",
  "whatsappFrom": "whatsapp:+14155238886",
  "smsFrom": "+12184232045"
}
```

Secrets never in environment variables or source code. Retrieved at Lambda cold start via `GetSecretValueCommand` and cached for warm invocations.

### API Security

- **HTTPS only:** API Gateway enforces TLS 1.2+
- **CORS:** Configured for frontend domain only
- **No API key at frontend:** Cognito JWT is the authentication mechanism
- **Rate limiting:** 200 AI calls/day server-side, 100 client-side

---

## 10. Notification Pipeline

### End-to-End Alert Flow

```
Threat Detected (camera, disease, NDVI drop)
        ↓
api-handler Lambda
  → Evaluates severity: only high/critical triggers notification
  → SNS.publish({ TopicArn, Message: { farmId, alertType, severity, title, description }})
        ↓
SNS Topic: green-sentinel-dev-alerts
        ↓
alert-sender Lambda (triggered by SNS subscription)
  → DynamoDB scan by farmId → get farm.notificationPhone
  → Parse description: if threat JSON → format human-readable lines
  → Build WhatsApp message (newlines via String.fromCharCode(10))
        ↓
Twilio WhatsApp API (sandbox / production)
  → POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json
  → From: whatsapp:+14155238886 (Twilio sandbox)
  → To: whatsapp:+91XXXXXXXXXX (farmer's number)
        ↓
WhatsApp message delivered to farmer's phone
Typical latency: < 2 minutes from detection to delivery
```

### Message Templates

**Threat Detection:**
```
🚨 *GreenSentinel Alert*
🔴 CRITICAL — SK Farm

*Fire, Intruder detected - CAM-02 - South Field*
Fire detected (95% confidence)
Intruder detected (85% confidence)
Action: Immediately contact local fire services
```

**Disease Detection (high/critical only):**
```
🚨 *GreenSentinel Alert*
🟠 HIGH — SK Farm

*Disease Alert: Early Blight*
Early Blight detected with 87% confidence on Tomato crop.
Treatment: Apply Mancozeb 75% WP, Remove affected leaves
```

### Alert Channels

| Channel | Trigger | Cost |
|---|---|---|
| WhatsApp (primary) | high/critical severity | ₹0.50/message |
| SMS fallback | WhatsApp delivery failure | ₹0.50/SMS |
| Dashboard inbox | All alerts | Free |
| Daily digest email | Scheduled | SNS Email free tier |

---

## 11. Deployment Architecture

### CI/CD Pipeline

**Automated (GitHub Actions):**
```yaml
# .github/workflows/deploy-frontend.yml
on:
  push:
    branches: [main]
    paths: [frontend/**]

steps:
  - Checkout
  - Setup Node 20
  - npm ci (reproducible installs)
  - npm run build (Vite production build)
  - Configure AWS credentials (GitHub secrets)
  - Upload assets → Cache-Control: max-age=31536000, immutable
  - Upload entry points → Cache-Control: no-cache, no-store
  - CloudFront invalidation (/* pattern)
```

**Infrastructure (AWS CDK):**
```bash
cd infra
npm run build          # tsc → dist/
npx cdk diff           # Preview changes
npx cdk deploy --all   # Deploy all stacks
```

### Two-Step Frontend Deploy

This is a non-negotiable protocol (documented in CLAUDE.md):

```bash
# Step 1: Upload assets with permanent cache
aws s3 sync dist/assets/ s3://{bucket}/assets/ \
  --cache-control "public, max-age=31536000, immutable"

# Step 2: Upload entry points with no-cache
aws s3 sync dist/ s3://{bucket}/ \
  --exclude "assets/*" --delete \
  --cache-control "no-cache, no-store, must-revalidate"

# Step 3: Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E7IN6ZTW0EXV5 \
  --paths "/*"
```

**Rationale:** If `index.html` is cached by CDN or browser, users never receive the new service worker. The two-step ensures: hashed assets are served from cache indefinitely (fast + cheap), while the entry points are always fresh.

### Infrastructure Details

| Resource | Value |
|---|---|
| AWS Account | 938881281454 |
| Region | ap-south-1 (Mumbai) |
| CDK Stack | GreenSentinelDev |
| CloudFront Distribution | E7IN6ZTW0EXV5 |
| Frontend S3 Bucket | green-sentinel-dev-frontend-938881281454 |
| API Gateway ID | 4uogxqomb0 |
| API Stage | dev |

---

## 12. Cost Architecture

### Monthly Infrastructure Cost (3 farms, 4 cameras)

| Component | Usage | Cost |
|---|---|---|
| Lambda (api-handler) | ~5000 invocations | Free (1M free) |
| Lambda (satellite-processor) | ~90 invocations (3 farms × 30d) | ~₹5 |
| DynamoDB | PAY_PER_REQUEST, ~50K ops | ~₹20 |
| S3 (frontend + disease scans) | ~2 GB | ~₹40 |
| CloudFront | ~10 GB egress | ~₹70 |
| Bedrock (disease scanner) | ~300 scans | ~₹300 |
| Bedrock (threat detection) | ~6000 Haiku + 100 Sonnet | ~₹230 |
| SNS + Twilio (alerts) | ~50 real alerts | ~₹25 |
| Cognito | <50K MAU free | Free |
| Secrets Manager | 1 secret | ~₹8 |
| CloudWatch Logs | ~500 MB | ~₹30 |
| **Total** | | **~₹730/month** |

### Cost Guard Mechanisms

1. **AI daily budget (server-side):** DynamoDB counter resets at midnight. 429 returned after 200 calls.
2. **AI daily budget (edge agent):** Local counter in memory. Alerts farmer in logs.
3. **Disease scan**: Rate limited by 429 handling in frontend (toast + 30s wait hint).
4. **S3 lifecycle rules:** Disease scan images expire after 30 days.
5. **DynamoDB TTL:** Alerts auto-delete after 90 days. Satellite data after 30 days.

---

## 13. API Reference

### Base URL
```
https://4uogxqomb0.execute-api.ap-south-1.amazonaws.com/dev
```

### Farms

```
GET    /farms?userId={userId}
       → Farm[]

GET    /farms/{farmId}?userId={userId}
       → Farm

POST   /farms
       Body: Farm (without farmId)
       → { success: true }

PUT    /farms/{farmId}
       Body: Partial<Farm>
       → { success: true }

DELETE /farms/{farmId}?userId={userId}
       → { success: true }
```

### Alerts

```
GET    /alerts?farmId={farmId}&limit={n}
       → { alerts: Alert[], unreadCount: number }

POST   /alerts/trigger
       Body: { farmId, userId, alertType, severity, title, description }
       → { success: true, alertId }
```

### Satellite Data

```
GET    /satellite?farmId={farmId}&days={30}
       → { farmId, data: SatelliteData[], latest: SatelliteData }
```

### Disease Scanner

```
GET    /disease-scan/upload-url?farmId={farmId}
       → { uploadUrl, scanId, key, expiresIn: 60 }

POST   /disease-scan/analyze
       Body: { farmId, scanId, key, cropType? }
       → { success: true, scanId, analysis: DiseaseAnalysis }

GET    /disease-scan?farmId={farmId}
       → { farmId, scans: DiseaseScanResult[] }
```

### Threat Detection

```
POST   /threat-detect
       Body: { farmId, imageData: string (base64), context? }
       → { farmId, analysis: ThreatAnalysis, analyzedAt: ISO }
```

### Edge Agent

```
GET    /agent-heartbeat?farmId={farmId}
       → { online: bool, lastSeen: ISO|null, cameras: Camera[] }

POST   /agent-heartbeat
       Body: { farmId, cameras, lastSeen }
       → { success: true }
```

### Health

```
GET    /health
       → { status: "healthy", stage: "dev" }
```

---

## 14. Technology Decisions

### Why Zustand over Redux?

Redux requires actions, reducers, middleware — 3× the boilerplate for the same result. Zustand is 1 KB, has built-in persistence, and the stores read like plain JavaScript objects. For a 3-person team shipping fast, this matters.

### Why DynamoDB over RDS?

- No VPC, no connection pooling, no idle cost
- PAY_PER_REQUEST means ₹0 at zero usage (farmers sleep, fields don't alert)
- Lambda cold starts have no TCP handshake delay (HTTP SDK)
- Single-table design for alerts + satellite data fits the access patterns perfectly

### Why inline Lambda code over zip deployments?

All Lambda code is `Code.fromInline()` in the CDK stack — the entire backend fits in one TypeScript file. Tradeoffs:
- **Pro:** No build pipeline, no layer management, no zip packaging, version history in git
- **Pro:** Single file = single CDK deployment for all changes
- **Con:** Limited to ~4 KB inline (mitigated by keeping functions lean)
- **Con:** No npm dependencies (mitigated by using AWS SDK v3 already in Node.js 20.x runtime)

### Why Element84 STAC (not Sentinel Hub)?

Sentinel Hub costs $25/month minimum. Element84 Earth Search is completely free with no registration. The `sentinel-2-l2a` collection provides L2A (surface reflectance) data — exactly what NDVI calculation requires. The only limitation is no sub-daily updates (irrelevant for vegetation monitoring, which changes on weekly timescales).

### Why Open-Meteo (not OpenWeatherMap)?

Open-Meteo has no API key, no rate limits for non-commercial use, and provides hourly + 14-day forecasts including variables not available in free tiers elsewhere: `vapour_pressure_deficit`, `precipitation_probability`, `soil_moisture_0_to_1cm`. These extra variables directly power the disease risk models.

### Why Twilio WhatsApp Sandbox over direct WhatsApp Business API?

WhatsApp Business API requires Facebook Business Manager verification and a minimum committed spend. Twilio's sandbox has both opt-in + zero commitment, can scale to production with the same codebase, and adds SMS fallback automatically. The migration path from sandbox to production is a single credential change.

### Why a monolithic api-handler Lambda?

Microservices (one Lambda per route) would mean: separate cold start pools, IAM roles per function, CloudWatch log groups per function, more CDK resources, and more operational surface area. The monolith:
- One cold start pool (always warm after the first request)
- One IAM role to manage
- One deployment unit
- 30-second timeout covers even the heaviest Bedrock calls

The correct abstraction boundary is the **API Gateway resource**, not the Lambda function.

---

## 15. Scalability Design

### Concurrency Model

```
API Gateway: 10,000 concurrent requests (default regional limit)
Lambda api-handler: 3,000 burst, 500/minute scaling rate
DynamoDB: Automatic horizontal scaling (PAY_PER_REQUEST)
CloudFront: Global edge (Mumbai, Singapore, Tokyo CDN pops for Indian users)
```

### From 100 Farms to 10,000 Farms

| Component | Current | At 10K farms |
|---|---|---|
| DynamoDB | PAY_PER_REQUEST | PAY_PER_REQUEST (linear) |
| Lambda | 512 MB, 30s | May need reserved concurrency |
| Satellite Processor | Sequential | DynamoDB Streams trigger per-farm |
| Disease Forecast | On-demand | Nightly batch per farm cluster |
| Alert Sender | SNS fan-out | Add SQS between SNS and Lambda |
| Bedrock AI | 200 calls/day | Per-account limit; use multiple profiles |

### Multi-Region Expansion

Phase 1 (current): ap-south-1 (Mumbai) only
Phase 2: ap-southeast-1 (Singapore) for Southeast Asia farmers
Phase 3: us-east-1 deployment for Latin America with data residency split

CDK stack is parameterized on `stage` and `env`; adding a region is a one-command `cdk deploy`.

---

## 16. Competitive Differentiation

### vs. Traditional Crop Insurance Apps
- **They:** Claim forms, delayed settlements, no prevention
- **GreenSentinel:** Real-time prevention, WhatsApp alerts within 2 minutes of detection

### vs. Enterprise Precision Agriculture (Trimble, John Deere)
- **They:** $500+/season, require expensive field sensors, desktop-first
- **GreenSentinel:** ₹600/season, no hardware required (except existing CCTV), mobile-first

### vs. Generic AI Chatbots for Farming
- **They:** Farmer describes problem in text, gets generic advice
- **GreenSentinel:** AI sees the actual crop, actual camera feed, actual NDVI — and acts automatically (WhatsApp alert, threat record) without the farmer doing anything

### The Three Moats

1. **Data flywheel:** Every scan, every alert, every NDVI reading improves our disease models. Network effects compound as more farms join.

2. **Edge agent lock-in (benign):** Once the farmer's CCTV system is connected and running the agent, switching requires physical hardware reconfiguration — not just uninstalling an app.

3. **Indian agricultural context:** The disease models are calibrated for Indian crops (nilgai, boar, Late Blight on potato and tomato in Maharashtra, Downy Mildew on grapes in Nashik). This localization cannot be replicated by a global platform without years of field data.

---

## Appendix A — Environment Variables

```bash
# Infrastructure
STAGE=dev
AWS_REGION=ap-south-1
AWS_ACCOUNT_ID=938881281454

# DynamoDB Tables
FARMS_TABLE=green-sentinel-dev-farms
ALERTS_TABLE=green-sentinel-dev-alerts
SATELLITE_DATA_TABLE=green-sentinel-dev-satellite-data
CROP_HEALTH_TABLE=green-sentinel-dev-crop-health

# S3
SATELLITE_BUCKET=green-sentinel-dev-satellite-imagery-938881281454

# Messaging
ALERT_TOPIC_ARN=arn:aws:sns:ap-south-1:938881281454:green-sentinel-dev-alerts
DIGEST_TOPIC_ARN=arn:aws:sns:ap-south-1:938881281454:green-sentinel-dev-daily-digest
TWILIO_SECRET_ARN=arn:aws:secretsmanager:ap-south-1:938881281454:secret:green-sentinel-dev/twilio

# AI
MAX_DAILY_AI_CALLS=200

# Frontend (Vite)
VITE_API_URL=https://4uogxqomb0.execute-api.ap-south-1.amazonaws.com/dev
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_USER_POOL_ID=[from CDK output]
VITE_COGNITO_CLIENT_ID=[from CDK output]
```

## Appendix B — NDVI Health Classification

```
NDVI ≥ 0.70  → Excellent  (healthScore: 95)   Lush, well-watered canopy
NDVI ≥ 0.60  → Good       (healthScore: 80)   Healthy with minor stress
NDVI ≥ 0.40  → Moderate   (healthScore: 60)   Visible stress, monitor closely
NDVI ≥ 0.20  → Stressed   (healthScore: 40)   Intervention required
NDVI < 0.20  → Poor       (healthScore: 20)   Severe damage or bare soil

Formula: NDVI = (Band8_NIR - Band4_Red) / (Band8_NIR + Band4_Red)
Source:  Sentinel-2 Level-2A (surface reflectance)
Revisit: ~5 days (10-day repeat orbit, 2 satellites)
API:     Element84 Earth Search STAC (free, no registration)
```

## Appendix C — Disease Risk Score Formula

```
Risk Score (0-100) = weighted combination of:
  humidity_factor    × 35%   (relative humidity vs. optimal range)
  temperature_factor × 30%   (temperature vs. disease-specific range)
  precipitation_factor × 25% (recent/forecast rain)
  wind_factor        × 10%   (wind speed — spreads spores)

Risk Level:
  ≥ 70 → Critical  (treat immediately)
  ≥ 50 → High      (spray within 48h)
  ≥ 30 → Moderate  (monitor daily)
  < 30 → Low       (routine monitoring)
```

---

*Last updated: March 2026 | Stack: React 18 + AWS CDK + Bedrock Claude 3.5 Sonnet v2*
