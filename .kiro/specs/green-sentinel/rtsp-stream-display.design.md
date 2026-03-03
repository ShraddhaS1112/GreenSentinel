# RTSP Stream Display Bugfix Design

## Overview

The LiveCamera component currently only supports browser-based camera access via `getUserMedia()` and completely ignores configured RTSP URLs from IP cameras. This design outlines a comprehensive approach to add RTSP stream support while preserving all existing browser camera and threat detection functionality.

The fix involves three key components:
1. **Frontend**: Modify LiveCamera to detect RTSP cameras and display proxied streams
2. **Backend**: Implement RTSP-to-HLS/DASH transcoding service
3. **Security**: Handle RTSP credentials securely and validate stream authenticity

## Glossary

- **Bug_Condition (C)**: When a user has configured an RTSP camera URL and navigates to LiveCamera, the component attempts to use `getUserMedia()` instead of connecting to the RTSP stream
- **Property (P)**: The desired behavior when an RTSP camera is configured - the component should display the live video feed from the RTSP stream
- **Preservation**: Existing browser camera functionality, threat detection, and UI behavior must remain unchanged for non-RTSP cameras
- **RTSP_URL**: Real-Time Streaming Protocol URL (e.g., `rtsp://192.168.1.100:554/stream`) configured in camera settings
- **HLS_Stream**: HTTP Live Streaming format that browsers can display natively via `<video>` tag
- **DASH_Stream**: Dynamic Adaptive Streaming over HTTP, alternative to HLS with better adaptive bitrate
- **Stream_Proxy**: Backend service that connects to RTSP source and transcodes to browser-compatible format
- **Motion_Detection**: Client-side edge processing that analyzes video frames for movement
- **Threat_Analysis**: AI-powered frame analysis using Claude 3.5 Sonnet via Amazon Bedrock

## Bug Details

### Fault Condition

The bug manifests when a user has configured an RTSP camera with a valid URL but the LiveCamera component does not display the stream. The component currently:
1. Only checks for browser camera availability via `getUserMedia()`
2. Ignores the `rtspUrl` property on the camera object
3. Attempts to access local device camera even when RTSP camera is configured
4. Never attempts to connect to the RTSP stream endpoint

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type CameraConfig
  OUTPUT: boolean
  
  RETURN input.rtspUrl != null
         AND input.rtspUrl.startsWith('rtsp://')
         AND input.status == 'connected'
         AND NOT isDisplayingRtspStream(input.rtspUrl)
         AND isAttemptingGetUserMedia()
END FUNCTION
```

### Examples

**Example 1: RTSP Camera Not Displayed**
- User adds camera with URL: `rtsp://192.168.1.100:554/stream`
- User navigates to LiveCamera component
- Expected: Live video feed from RTSP camera displays
- Actual: Placeholder icon shows, component attempts to access browser camera

**Example 2: RTSP with Credentials**
- User adds camera with URL: `rtsp://admin:password@192.168.1.100:554/stream`
- User clicks "Start" button
- Expected: Component authenticates with credentials and displays stream
- Actual: Component ignores credentials, attempts browser camera access

**Example 3: Multiple Cameras (Mixed Types)**
- Farm has 2 RTSP cameras and browser camera option
- User navigates to LiveCamera
- Expected: Component displays RTSP stream by default, allows switching to browser camera
- Actual: Component only shows browser camera option, RTSP cameras are ignored

**Example 4: RTSP Stream Unavailable**
- User has RTSP camera configured but stream is offline
- User clicks "Start" button
- Expected: Component displays error message "RTSP stream unavailable"
- Actual: Component attempts browser camera, no indication of RTSP failure

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Browser camera access via `getUserMedia()` must continue to work exactly as before when no RTSP camera is configured
- Motion detection algorithm must continue to work on all video sources (browser or RTSP)
- AI threat analysis must continue to trigger automatically on motion detection
- Manual threat scan button must continue to work and capture current frame
- Threat analysis results display must remain unchanged
- Cooldown timer (30-second minimum between analyses) must continue to work
- All UI elements (buttons, status indicators, threat cards) must remain unchanged
- Offline functionality must continue to work for cached threat data

**Scope:**
All inputs that do NOT involve RTSP cameras should be completely unaffected by this fix. This includes:
- Browser camera access (Quick Scan mode)
- Motion detection on browser camera feeds
- Threat analysis on browser camera frames
- Manual threat scans
- Threat history and results display
- Settings and preferences

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing RTSP Detection Logic**: The LiveCamera component has no code to check if the camera has an `rtspUrl` property or to differentiate between browser and RTSP cameras

2. **No Stream Proxy Service**: There is no backend service to connect to RTSP sources and transcode them to HLS/DASH format that browsers can display

3. **Credential Handling Missing**: RTSP URLs with embedded credentials (e.g., `rtsp://user:pass@host/stream`) are not being parsed or used for authentication

4. **No Error Handling for RTSP**: The component has no error handling for RTSP connection failures, stream timeouts, or unavailable streams

5. **Video Element Configuration**: The `<video>` element is only configured for `getUserMedia()` streams, not for HLS/DASH playback

## Correctness Properties

**Property 1: Fault Condition - RTSP Stream Display**

_For any_ camera configuration where an RTSP URL is present and the stream is available, the fixed LiveCamera component SHALL detect the RTSP camera, connect to the backend stream proxy, and display the live video feed from the RTSP stream using HLS or DASH format.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

**Property 2: Preservation - Browser Camera and Threat Detection**

_For any_ camera configuration where NO RTSP URL is present (browser camera mode), the fixed component SHALL produce exactly the same behavior as the original component, preserving all existing functionality for browser camera access, motion detection, threat analysis, and UI interactions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**Frontend Changes:**

**File**: `frontend/src/components/LiveCamera.tsx`

**Specific Changes**:

1. **Camera Type Detection**: Add logic to detect whether the current camera is RTSP or browser-based
   - Check if `camera.rtspUrl` exists and is valid
   - Store camera type in component state
   - Pass camera object to component instead of just farmId

2. **Stream Source Handling**: Modify video element source based on camera type
   - For browser cameras: Continue using `getUserMedia()` as before
   - For RTSP cameras: Use HLS/DASH stream URL from backend proxy
   - Implement HLS.js or dash.js library for adaptive streaming

3. **Backend Stream Proxy Integration**: Add API call to get stream proxy URL
   - Call new endpoint `/stream-proxy/{cameraId}` to get HLS/DASH URL
   - Handle stream proxy errors and timeouts
   - Implement retry logic for stream connection failures

4. **Error Handling for RTSP**: Add specific error handling for RTSP failures
   - Distinguish between browser camera errors and RTSP stream errors
   - Display appropriate error messages for each failure type
   - Implement fallback to browser camera if RTSP fails

5. **Motion Detection Compatibility**: Ensure motion detection works with both video sources
   - Motion detection canvas logic works with any video element source
   - No changes needed to motion detection algorithm

6. **Frame Capture for Analysis**: Ensure frame capture works with both video sources
   - Canvas drawing works with both `getUserMedia()` and HLS/DASH video elements
   - No changes needed to threat analysis frame capture

**Backend Changes:**

**File**: `backend/src/services/streamProxyService.ts` (new file)

**Specific Changes**:

1. **RTSP Connection Handler**: Implement RTSP stream connection logic
   - Use `ffmpeg` or `gstreamer` to connect to RTSP source
   - Handle RTSP authentication with embedded credentials
   - Implement connection retry logic with exponential backoff

2. **Stream Transcoding**: Implement real-time transcoding to HLS/DASH
   - Transcode RTSP stream to HLS format (recommended for simplicity)
   - Generate `.m3u8` playlist file and `.ts` segment files
   - Store segments in S3 with automatic cleanup after 24 hours
   - Target bitrate: 1-2 Mbps for low-bandwidth rural networks

3. **Credential Extraction**: Parse and secure RTSP credentials
   - Extract username/password from RTSP URL
   - Store credentials in AWS Secrets Manager
   - Use credentials for RTSP authentication
   - Never log or expose credentials in error messages

4. **Stream Health Monitoring**: Monitor stream quality and availability
   - Detect stream disconnections and timeouts
   - Track stream bitrate and frame rate
   - Log stream health metrics to CloudWatch
   - Trigger alerts if stream is unavailable

5. **API Endpoint**: Create new endpoint to provide stream proxy URL
   - Endpoint: `GET /stream-proxy/{cameraId}`
   - Returns: `{ streamUrl: "https://s3.../playlist.m3u8", expiresAt: "..." }`
   - Validates camera ownership and permissions
   - Implements rate limiting to prevent abuse

**Security Changes:**

**File**: `backend/src/services/credentialService.ts` (new file)

**Specific Changes**:

1. **Credential Extraction**: Parse RTSP URLs to extract credentials
   - Extract username and password from URL format: `rtsp://user:pass@host/stream`
   - Validate credential format and length
   - Remove credentials from URL before logging

2. **Secure Storage**: Store credentials in AWS Secrets Manager
   - Create secret for each camera: `green-sentinel/camera/{cameraId}/rtsp-credentials`
   - Encrypt credentials at rest using KMS
   - Implement automatic rotation policy (90 days)
   - Audit all credential access

3. **Credential Retrieval**: Safely retrieve credentials for stream connection
   - Retrieve from Secrets Manager only when needed
   - Log access with timestamp and requesting service
   - Implement rate limiting on credential retrieval
   - Cache credentials in memory with TTL (5 minutes)

### Implementation Priority

1. **Phase 1 (Critical)**: Frontend detection + backend stream proxy endpoint
2. **Phase 2 (Important)**: RTSP connection and HLS transcoding
3. **Phase 3 (Security)**: Credential extraction and secure storage
4. **Phase 4 (Reliability)**: Error handling and stream health monitoring

## Testing Strategy

### Dual Testing Approach

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
