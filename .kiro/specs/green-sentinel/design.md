# Green-Sentinel Design Document

## Overview

Green-Sentinel is a serverless, event-driven architecture combining satellite intelligence with ground-level AI vision. The system processes camera frames through Claude 3.5 Sonnet for threat detection while simultaneously fetching daily NDVI data from Sentinel Hub. Threats trigger multilingual WhatsApp alerts within 10 seconds end-to-end. The architecture is 100% serverless (Lambda, DynamoDB, S3, AppSync) optimized for AWS Free Tier constraints and rural 2G/3G networks.

**Key Design Principles:**
- Event-driven processing for real-time threat detection
- Serverless architecture for automatic scaling and cost efficiency
- Offline-first PWA for low-bandwidth resilience
- Modular microservices for independent scaling
- Asynchronous processing with SQS queues for reliability

## Architecture

### High-Level System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Green-Sentinel System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │  IP Cameras  │         │ Sentinel Hub │                      │
│  │  (RTSP)      │         │  (Satellite) │                      │
│  └──────┬───────┘         └──────┬───────┘                      │
│         │                        │                               │
│         ▼                        ▼                               │
│  ┌──────────────────────────────────────┐                       │
│  │  AWS Lambda Layer 1: Ingestion       │                       │
│  │  - Frame Capture (RTSP)              │                       │
│  │  - NDVI Fetch (Daily)                │                       │
│  └──────┬───────────────────────────────┘                       │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────┐                       │
│  │  AWS SQS: Event Queue                │                       │
│  │  - Frame Events                      │                       │
│  │  - NDVI Events                       │                       │
│  └──────┬───────────────────────────────┘                       │
│         │                                                        │
│    ┌────┴────┐                                                  │
│    ▼         ▼                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Lambda: Threat   │  │ Lambda: Health   │                    │
│  │ Detection        │  │ Analysis         │                    │
│  │ (Bedrock Claude) │  │ (Score Calc)     │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
│           │                     │                               │
│           ▼                     ▼                               │
│  ┌──────────────────────────────────────┐                       │
│  │  DynamoDB: Events & Metrics          │                       │
│  │  - Threat Records                    │                       │
│  │  - Health Scores                     │                       │
│  └──────┬───────────────────────────────┘                       │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────┐                       │
│  │  Lambda: Alert Service               │                       │
│  │  - Compose Message                   │                       │
│  │  - Translate (Bhashini)              │                       │
│  │  - Send (Twilio WhatsApp)            │                       │
│  └──────┬───────────────────────────────┘                       │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────┐                       │
│  │  Farmer's WhatsApp                   │                       │
│  │  (Alert + Snapshot Evidence)         │                       │
│  └──────────────────────────────────────┘                       │
│                                                                   │
│  ┌──────────────────────────────────────┐                       │
│  │  React PWA (AWS Amplify)             │                       │
│  │  - Dashboard                         │                       │
│  │  - Threat History                    │                       │
│  │  - Crop Health Heatmap               │                       │
│  │  - Multi-Farm Management             │                       │
│  └──────────────────────────────────────┘                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Ingestion Layer (Lambda):**
- `FrameCaptureFunction`: Polls RTSP cameras every 5-10 seconds, stores frames in S3, publishes to SQS
- `NDVIFetchFunction`: Daily scheduled Lambda (EventBridge) fetches Sentinel Hub data, publishes to SQS

**Processing Layer (Lambda):**
- `ThreatDetectionFunction`: Consumes frame events, calls Bedrock Claude 3.5 Sonnet, stores results in DynamoDB
- `HealthAnalysisFunction`: Consumes NDVI events, calculates Farm_Health_Score, stores in DynamoDB

**Alert Layer (Lambda):**
- `AlertComposerFunction`: Triggered by threat detection, composes alert message with metadata
- `TranslationFunction`: Calls Bhashini API for multilingual translation
- `DeliveryFunction`: Sends via Twilio WhatsApp API with snapshot attachment

**Storage Layer:**
- `DynamoDB`: Threat records, health scores, user preferences, audit logs
- `S3`: Frame snapshots (24-hour TTL), satellite imagery, alert evidence
- `Secrets Manager`: Camera credentials, API keys

**Frontend Layer:**
- `React PWA`: Hosted on AWS Amplify, uses AppSync GraphQL API for real-time updates
- `AppSync`: GraphQL API with DynamoDB resolvers for dashboard queries

## Components and Interfaces

### 1. Frame Capture Service

**Input:**
- RTSP URL, username, password (from Secrets Manager)
- Capture interval (5-10 seconds, configurable)

**Output:**
- Frame image (JPEG, max 500KB)
- Metadata: timestamp, camera_id, farm_id

**Processing:**
- Establish RTSP connection with timeout (30s)
- Capture frame every N seconds
- Compress frame to <500KB
- Upload to S3 with path: `s3://frames/{farm_id}/{camera_id}/{timestamp}.jpg`
- Publish event to SQS: `{frame_s3_path, timestamp, camera_id, farm_id}`

**Error Handling:**
- Connection failure: retry with exponential backoff (1s, 2s, 4s, 8s max)
- Frame corruption: log and skip, continue processing
- S3 upload failure: queue for retry

### 2. Threat Detection Service

**Input:**
- Frame S3 path, timestamp, camera_id, farm_id (from SQS)

**Output:**
- Threat record: {threat_type, confidence_score, timestamp, frame_snapshot_path}

**Processing:**
- Retrieve frame from S3
- Call Bedrock Claude 3.5 Sonnet with prompt:
  ```
  Analyze this farm camera frame for threats. Identify:
  1. Fire (confidence 0-100%)
  2. Human intruders (confidence 0-100%)
  3. Animals (confidence 0-100%)
  Return JSON: {fire: X, humans: Y, animals: Z}
  ```
- Extract confidence scores
- If any score exceeds threshold (fire/humans ≥80%, animals ≥75%):
  - Create threat record in DynamoDB
  - Publish threat event to SNS for alert service
- Store analysis metadata in DynamoDB for audit

**Latency Budget:** 3 seconds per frame

### 3. NDVI Crop Health Service

**Input:**
- Farm coordinates (latitude, longitude)
- Scheduled daily at 06:00 UTC

**Output:**
- Farm_Health_Score (0-100)
- NDVI heatmap (color-coded image)
- Metadata: satellite_date, cloud_cover_percentage

**Processing:**
- Query Sentinel Hub API for latest Sentinel-2 imagery
- Calculate NDVI: (NIR - RED) / (NIR + RED)
- Map NDVI to health score: Score = (NDVI + 1) * 50 (converts -1 to 1 range to 0-100)
- Generate heatmap: Red (<0.3), Yellow (0.3-0.6), Green (>0.6)
- Store in DynamoDB: {farm_id, health_score, timestamp, heatmap_s3_path}
- If score changed >10 points from previous day: publish informational alert

**Error Handling:**
- Cloud cover >80%: use previous valid NDVI data, mark as cached
- API failure: retry with exponential backoff, use cached data

### 4. Alert Service

**Input:**
- Threat event: {threat_type, confidence_score, farm_id, camera_id, frame_snapshot_path}

**Output:**
- WhatsApp message delivered to farmer's phone

**Processing:**
- Compose alert: "🚨 THREAT DETECTED: [Type] at [Farm] [Time] (Confidence: [Score]%)"
- Retrieve farmer's language preference from DynamoDB
- Call Bhashini API to translate message
- Call Bhashini voice synthesis if voice alert enabled
- Call Twilio WhatsApp API to send message + snapshot
- Log delivery status in DynamoDB
- Measure end-to-end latency from frame capture to delivery

**Latency Budget:** 7 seconds (total 10s with detection)

**Retry Logic:**
- Failed delivery: retry up to 5 times over 30 minutes with exponential backoff

### 5. PWA Frontend

**Components:**
- Dashboard: Real-time threat alerts, farm status, health score
- Threat History: Searchable log of all detected threats with snapshots
- Crop Health: NDVI heatmap, health score trend, satellite imagery
- Multi-Farm: Switch between farms, manage cameras, configure alerts
- Settings: Language preference, alert thresholds, camera management

**Data Flow:**
- AppSync GraphQL subscriptions for real-time threat updates
- Queries for historical data (threats, health scores)
- Mutations for user preferences, camera configuration
- Offline support: Service Worker caches dashboard data, displays cached threats

**Performance:**
- Initial load: <8 seconds on 2G/3G
- Farm switch: <2 seconds
- Responsive: 320px-1920px

## Data Models

### DynamoDB Tables

**1. Threats Table**
```
PK: farm_id#camera_id
SK: timestamp
Attributes:
  - threat_type: string (fire | human | animal)
  - confidence_score: number (0-100)
  - frame_snapshot_path: string (S3 path)
  - alert_sent: boolean
  - alert_delivery_status: string (sent | delivered | failed)
  - latency_ms: number
  - created_at: timestamp
```

**2. HealthScores Table**
```
PK: farm_id
SK: date (YYYY-MM-DD)
Attributes:
  - health_score: number (0-100)
  - ndvi_value: number (-1 to 1)
  - heatmap_path: string (S3 path)
  - satellite_date: string
  - cloud_cover: number (0-100)
  - created_at: timestamp
```

**3. Farms Table**
```
PK: farm_id
Attributes:
  - user_id: string
  - name: string
  - latitude: number
  - longitude: number
  - cameras: list of {camera_id, rtsp_url, name}
  - language: string (hi | mr | ta | te | kn | bn)
  - alert_thresholds: {fire: 80, humans: 80, animals: 75}
  - created_at: timestamp
```

**4. Users Table**
```
PK: user_id
Attributes:
  - phone_number: string
  - language: string
  - farms: list of farm_id
  - alert_preferences: {voice_enabled: boolean, text_enabled: boolean}
  - created_at: timestamp
```

**5. AuditLog Table**
```
PK: farm_id#event_type
SK: timestamp
Attributes:
  - event_type: string (threat_detected | alert_sent | api_call | error)
  - details: string (JSON)
  - status: string (success | failure)
  - latency_ms: number
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.


### Correctness Properties

Based on the acceptance criteria analysis, here are the key properties that must hold true across all valid system executions:

**Property 1: Offline Data Availability**
*For any* farm data that has been cached, when the PWA is accessed without internet connectivity, that cached data SHALL be displayed to the user.
**Validates: Requirements 1.2**

**Property 2: Load Time Performance**
*For any* PWA load on a 2G/3G network, the initial load time SHALL not exceed 8 seconds.
**Validates: Requirements 1.3**

**Property 3: SPA Navigation**
*For any* navigation between PWA sections (dashboard, alerts, crop health), the transition SHALL occur without triggering a full page reload.
**Validates: Requirements 1.5**

**Property 4: Token Lifecycle Management**
*For any* authenticated user session, JWT tokens SHALL be automatically refreshed before expiration, and expired tokens SHALL be rejected on subsequent API requests.
**Validates: Requirements 1.6, 7.4**

**Property 5: Frame Capture Timing**
*For any* configured camera with a capture interval of N seconds (5-10), frames SHALL be captured at intervals of approximately N seconds ±10%.
**Validates: Requirements 2.2**

**Property 6: Connection Resilience**
*For any* failed RTSP connection, the system SHALL retry with exponential backoff (1s, 2s, 4s, 8s) until connection succeeds or max retries reached.
**Validates: Requirements 2.3**

**Property 7: Frame Storage and Cleanup**
*For any* captured frame stored in S3, the frame SHALL be automatically deleted after 24 hours via S3 TTL policy.
**Validates: Requirements 2.4**

**Property 8: Concurrent Frame Processing**
*For any* farm with N concurrent camera streams (N ≤ 10), all frames from all cameras SHALL be processed without loss.
**Validates: Requirements 2.5**

**Property 9: Error Resilience in Frame Processing**
*For any* corrupted or unreadable frame, the system SHALL log the error and continue processing subsequent frames without interruption.
**Validates: Requirements 2.6**

**Property 10: Threat Detection Confidence**
*For any* frame analyzed by the Threat_Detection_Engine, confidence scores for fire and human threats SHALL be ≥80%, and for animals ≥75%, when threats are present.
**Validates: Requirements 3.2**

**Property 11: Threat Record Creation**
*For any* detected threat with confidence above threshold, a threat record SHALL be created in DynamoDB containing timestamp, threat_type, confidence_score, and frame_snapshot_path.
**Validates: Requirements 3.3, 3.6**

**Property 12: Analysis Latency**
*For any* frame submitted to the Threat_Detection_Engine, analysis SHALL complete within 3 seconds.
**Validates: Requirements 3.4**

**Property 13: Queue Processing**
*For any* set of N frames queued for analysis, all N frames SHALL be processed sequentially without dropping any frames.
**Validates: Requirements 3.5**

**Property 14: Health Score Calculation**
*For any* NDVI value retrieved from Sentinel Hub, the Farm_Health_Score SHALL be calculated as (NDVI + 1) * 50, resulting in a value between 0-100.
**Validates: Requirements 4.2**

**Property 15: Heatmap Color Mapping**
*For any* NDVI value, the heatmap color SHALL be Red if NDVI <0.3, Yellow if 0.3-0.6, and Green if >0.6.
**Validates: Requirements 4.3**

**Property 16: Health Score Storage**
*For any* calculated Farm_Health_Score, it SHALL be stored in DynamoDB with timestamp and satellite metadata.
**Validates: Requirements 4.4**

**Property 17: Health Score Change Alert**
*For any* farm where the health score changes by >10 points from the previous day, an informational alert SHALL be triggered.
**Validates: Requirements 4.5**

**Property 18: Cached Data Fallback**
*For any* satellite query with cloud cover >80%, the system SHALL use the most recent valid NDVI data and mark it as cached.
**Validates: Requirements 4.6**

**Property 19: Alert Message Composition**
*For any* detected threat, the alert message SHALL contain threat_type, timestamp, confidence_score, and farm_location.
**Validates: Requirements 5.1**

**Property 20: Message Translation**
*For any* alert message, when translated via Bhashini API, the translated message SHALL be in the farmer's configured language.
**Validates: Requirements 5.2**

**Property 21: Threat Snapshot Attachment**
*For any* threat alert sent via WhatsApp, a snapshot of the detected threat SHALL be attached as image evidence.
**Validates: Requirements 5.4**

**Property 22: Voice Alert Generation**
*For any* farmer with voice capability enabled, threat alerts SHALL be generated as voice messages via Bhashini voice synthesis and sent as WhatsApp audio.
**Validates: Requirements 5.5**

**Property 23: Alert Delivery Logging**
*For any* alert sent, the delivery status (sent, delivered, failed) SHALL be logged in DynamoDB for audit purposes.
**Validates: Requirements 5.6**

**Property 24: End-to-End Latency Constraint**
*For any* threat detection event, the time from frame capture to WhatsApp notification delivery SHALL not exceed 10 seconds.
**Validates: Requirements 6.2**

**Property 25: Performance Warning Logging**
*For any* threat alert with latency between 8-10 seconds, a performance warning SHALL be logged with component-level timing breakdown.
**Validates: Requirements 6.3**

**Property 26: Performance Failure Alerting**
*For any* threat alert with latency exceeding 10 seconds, a performance failure SHALL be logged and an admin alert triggered.
**Validates: Requirements 6.4**

**Property 27: Concurrent Threat Processing**
*For any* set of N threats detected simultaneously, each threat SHALL be processed independently without cascading delays.
**Validates: Requirements 6.5**

**Property 28: Peak Load Latency SLA**
*For any* system state with 10+ concurrent camera streams, 95% of threat alerts SHALL maintain <10 second end-to-end latency.
**Validates: Requirements 6.6**

**Property 29: Credential Encryption**
*For any* camera credential registered, it SHALL be encrypted in AWS Secrets Manager with automatic rotation every 90 days.
**Validates: Requirements 7.1**

**Property 30: Credential Access Logging**
*For any* credential retrieval, the access SHALL be logged with timestamp and requesting service identity.
**Validates: Requirements 7.2**

**Property 31: JWT Token Issuance**
*For any* user authentication, a JWT token SHALL be issued with 1-hour expiration and a refresh token with 7-day expiration.
**Validates: Requirements 7.3**

**Property 32: Token Validation**
*For any* API request with an invalid or expired JWT token, the request SHALL be rejected.
**Validates: Requirements 7.4**

**Property 33: Data Encryption at Rest**
*For any* farm data stored in DynamoDB, it SHALL be encrypted at rest using AWS KMS with farm-specific encryption keys.
**Validates: Requirements 7.5**

**Property 34: Transport Security**
*For any* data transmission between PWA and backend, the connection SHALL use HTTPS/TLS 1.3 with certificate pinning for mobile clients.
**Validates: Requirements 7.6**

**Property 35: Farm Data Isolation**
*For any* farm registered to a user, threat detection, crop health, and alert streams for that farm SHALL be isolated from other farms.
**Validates: Requirements 8.1**

**Property 36: Farm Switch Performance**
*For any* farm switch operation in the PWA, farm-specific data SHALL load within 2 seconds.
**Validates: Requirements 8.2**

**Property 37: Multi-Farm Concurrent Processing**
*For any* system monitoring N farms concurrently, Lambda functions SHALL scale automatically to handle the workload.
**Validates: Requirements 8.3**

**Property 38: Multi-Camera Processing**
*For any* farm with up to 10 cameras, all camera streams SHALL be processed without performance degradation.
**Validates: Requirements 8.4**

**Property 39: RBAC Enforcement**
*For any* user with access to multiple farms, cross-farm data access SHALL be prevented by role-based access control.
**Validates: Requirements 8.6**

**Property 40: System Uptime SLA**
*For any* monthly measurement period, the system SHALL maintain 99.5% uptime across all components.
**Validates: Requirements 9.1**

**Property 41: Lambda Retry Logic**
*For any* failed Lambda function, the system SHALL retry with exponential backoff (1s, 2s, 4s) up to 3 attempts.
**Validates: Requirements 9.2**

**Property 42: DynamoDB Resilience**
*For any* DynamoDB operation that fails due to throttling, the system SHALL implement automatic backoff and retry without data loss.
**Validates: Requirements 9.3**

**Property 43: External API Resilience**
*For any* external API call (Sentinel Hub, Bedrock, Twilio) that fails, the request SHALL be queued and retried when service is restored.
**Validates: Requirements 9.4**

**Property 44: Alert Delivery Retry**
*For any* failed WhatsApp alert delivery, the system SHALL retry up to 5 times over 30 minutes.
**Validates: Requirements 9.5**

**Property 45: Critical Failure Alerting**
*For any* critical system failure detected, an alert SHALL be sent to the system administrator with error details and affected farms.
**Validates: Requirements 9.6**

**Property 46: Lambda Invocation Budget**
*For any* monthly period, total Lambda invocations SHALL not exceed 1,000,000 (AWS Free Tier limit).
**Validates: Requirements 10.2**

**Property 47: S3 Storage Budget**
*For any* monthly period, total S3 storage SHALL not exceed 5GB (AWS Free Tier limit).
**Validates: Requirements 10.3**

**Property 48: API Usage Rate Limiting**
*For any* external API (Sentinel Hub, Bedrock, Twilio, Bhashini), usage SHALL be tracked and rate limited to stay within free tier quotas.
**Validates: Requirements 10.5**

**Property 49: Cost Monitoring and Alerting**
*For any* monthly period, a cost report SHALL be generated showing usage against Free Tier limits, and alerts SHALL be triggered if any service approaches its limit.
**Validates: Requirements 10.6**

## Error Handling

**Frame Acquisition Errors:**
- RTSP connection timeout: Retry with exponential backoff, max 8 seconds
- Frame corruption: Log error, skip frame, continue processing
- S3 upload failure: Queue for retry, implement dead-letter queue after 3 failures

**Threat Detection Errors:**
- Bedrock API timeout: Retry with exponential backoff, max 3 attempts
- Invalid frame format: Log error, skip frame
- Confidence score parsing error: Log error, mark frame as unanalyzable

**NDVI Fetch Errors:**
- Sentinel Hub API unavailable: Use cached NDVI data, retry after 1 hour
- Cloud cover >80%: Use previous valid NDVI, mark as cached
- Invalid coordinates: Log error, alert administrator

**Alert Delivery Errors:**
- Bhashini translation failure: Retry with exponential backoff, max 3 attempts
- Twilio WhatsApp failure: Retry up to 5 times over 30 minutes
- Invalid phone number: Log error, alert farmer to update contact info

**Security Errors:**
- Invalid JWT token: Reject request, log security event
- Credential rotation failure: Alert administrator, continue with current credentials
- KMS encryption failure: Retry operation, escalate to administrator if persistent

## Testing Strategy

### Dual Testing Approach

Green-Sentinel requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests** (Specific Examples & Edge Cases):
- PWA manifest validation and service worker registration
- RTSP connection with valid/invalid credentials
- Frame compression and S3 upload
- Threat detection with known threat images
- NDVI calculation with boundary values (NDVI = -1, 0, 1)
- Alert message composition with special characters
- JWT token generation and expiration
- DynamoDB operations with throttling simulation
- Twilio WhatsApp delivery with various phone number formats

**Property-Based Tests** (Universal Properties):
- Frame capture timing: For any configured interval, frames are captured at ±10% accuracy
- Threat detection confidence: For any frame with threats, confidence scores meet thresholds
- Health score calculation: For any NDVI value, health score is correctly calculated
- Alert delivery: For any threat, alert reaches farmer within 10 seconds
- Token lifecycle: For any authenticated session, tokens are refreshed before expiration
- Concurrent processing: For any N concurrent streams, all are processed without loss
- Retry logic: For any failed operation, exponential backoff is applied correctly
- Data isolation: For any multi-farm setup, cross-farm data access is prevented
- Latency SLA: For any peak load scenario, 95% of alerts meet <10s latency

### Property-Based Testing Configuration

**Testing Framework:** Jest with fast-check for JavaScript/TypeScript

**Test Configuration:**
- Minimum 100 iterations per property test
- Seed-based reproducibility for failed cases
- Timeout: 30 seconds per test
- Tag format: `Feature: green-sentinel, Property N: [property_text]`

**Example Property Test Structure:**
```javascript
// Feature: green-sentinel, Property 24: End-to-End Latency Constraint
describe('End-to-End Latency', () => {
  it('should deliver threat alerts within 10 seconds', () => {
    fc.assert(
      fc.property(
        fc.record({
          frameTimestamp: fc.integer(),
          threatType: fc.oneof(fc.constant('fire'), fc.constant('human'), fc.constant('animal')),
          confidence: fc.integer({ min: 75, max: 100 }),
          farmId: fc.string(),
          phoneNumber: fc.string()
        }),
        (threatEvent) => {
          const deliveryTime = simulateThreatToDelivery(threatEvent);
          expect(deliveryTime).toBeLessThan(10000); // 10 seconds in ms
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Testing Priorities

1. **Critical Path Properties** (Must Test):
   - End-to-end latency <10s (Property 24)
   - Threat detection confidence thresholds (Property 10)
   - Frame capture timing (Property 5)
   - Alert delivery (Property 23)
   - Data isolation (Property 35)

2. **Resilience Properties** (Should Test):
   - Retry logic (Properties 6, 41-44)
   - Concurrent processing (Properties 8, 27, 37)
   - Error handling (Properties 9, 18)

3. **Security Properties** (Should Test):
   - Token lifecycle (Property 4)
   - Credential encryption (Property 29)
   - Data encryption (Property 33)
   - RBAC enforcement (Property 39)

4. **Performance Properties** (Should Test):
   - Load time (Property 2)
   - Farm switch performance (Property 36)
   - Peak load SLA (Property 28)

5. **Cost Properties** (Nice to Test):
   - Budget tracking (Properties 46-49)

