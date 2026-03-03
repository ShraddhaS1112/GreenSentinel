# RTSP Stream Display Implementation Tasks

## Overview

This task list implements the RTSP stream display bugfix following the bug condition methodology. Tasks are organized in execution order with clear dependencies.

**Key Specifications:**
- Bug_Condition: User has configured RTSP camera but LiveCamera component ignores it and attempts `getUserMedia()` instead
- Expected_Behavior: Component detects RTSP camera, connects to backend stream proxy, displays live video feed
- Preservation: Browser camera functionality, motion detection, threat analysis, and all UI behavior must remain unchanged

---

## Phase 1: Exploration & Validation

### 1. Write bug condition exploration test

- **Property 1: Fault Condition** - RTSP Stream Not Displayed
- **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
- **DO NOT attempt to fix the test or the code when it fails**
- **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
- **GOAL**: Surface counterexamples that demonstrate the bug exists
- **Scoped PBT Approach**: Scope the property to concrete failing cases where RTSP camera is configured
- Test implementation details from Fault Condition in design:
  - Setup: Pass camera object with valid `rtspUrl` property to LiveCamera component
  - Verify: Component detects RTSP camera configuration
  - Verify: Component calls backend stream proxy endpoint `/stream-proxy/{cameraId}`
  - Verify: Component sets video element source to HLS/DASH stream URL
  - Verify: Component does NOT attempt `getUserMedia()` when RTSP camera is configured
- The test assertions should match the Expected Behavior Properties from design (2.1, 2.2, 2.3, 2.4)
- Run test on UNFIXED code
- **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
- Document counterexamples found to understand root cause:
  - Component ignores `rtspUrl` property
  - No API call to stream proxy endpoint
  - Video element not populated with HLS stream URL
  - Component attempts `getUserMedia()` instead
- Mark task complete when test is written, run, and failure is documented
- _Requirements: 1.1, 1.2, 1.3, 1.4_

### 2. Write preservation property tests (BEFORE implementing fix)

- **Property 2: Preservation** - Browser Camera and Threat Detection Unchanged
- **IMPORTANT**: Follow observation-first methodology
- Observe behavior on UNFIXED code for non-buggy inputs (browser camera mode)
- Write property-based tests capturing observed behavior patterns from Preservation Requirements:
  - Browser camera access via `getUserMedia()` works when no RTSP URL configured
  - Motion detection triggers on browser camera feed
  - Threat analysis captures frames from browser camera
  - Manual threat scan button works on browser camera
  - 30-second cooldown timer prevents rapid re-analysis
  - All UI elements display correctly
- Property-based testing generates many test cases for stronger guarantees
- Run tests on UNFIXED code
- **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
- Mark task complete when tests are written, run, and passing on unfixed code
- _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

---

## Phase 2: Backend Implementation

### 3. Implement backend stream proxy service

- [ ] 3.1 Create stream proxy service foundation
  - Create new file: `backend/src/services/streamProxyService.ts`
  - Implement `StreamProxyService` class with methods:
    - `getStreamProxyUrl(cameraId: string): Promise<{streamUrl: string, expiresAt: string}>`
    - `connectToRtspStream(rtspUrl: string, credentials?: {username: string, password: string}): Promise<void>`
    - `transcodeToHls(rtspStream: Stream): Promise<string>` (returns HLS playlist URL)
    - `monitorStreamHealth(cameraId: string): Promise<StreamHealthStatus>`
  - _Bug_Condition: isBugCondition(camera) where camera.rtspUrl exists and is valid_
  - _Expected_Behavior: Component receives HLS stream URL from backend and displays it_
  - _Preservation: Browser camera mode continues to work without stream proxy_
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3.2 Implement RTSP connection handler
  - Use `ffmpeg` or `gstreamer` to connect to RTSP source
  - Handle RTSP authentication with embedded credentials
  - Implement connection retry logic with exponential backoff (max 3 retries)
  - Handle connection timeouts (30-second timeout)
  - Log connection attempts and failures to CloudWatch
  - _Requirements: 2.3, 2.4_

- [ ] 3.3 Implement HLS transcoding pipeline
  - Transcode RTSP stream to HLS format (H.264 video, AAC audio)
  - Generate `.m3u8` playlist file with 3-second segment duration
  - Generate `.ts` segment files (target: 1-2 Mbps bitrate for rural networks)
  - Store segments in S3 bucket with automatic cleanup after 24 hours
  - Implement segment rotation to maintain 30-second buffer
  - _Requirements: 2.1, 2.2_

- [ ] 3.4 Create stream proxy API endpoint
  - Endpoint: `GET /api/stream-proxy/{cameraId}`
  - Request validation: Verify camera ownership and permissions
  - Response: `{ streamUrl: "https://s3.../playlist.m3u8", expiresAt: "ISO8601_timestamp" }`
  - Implement rate limiting (max 10 requests per minute per user)
  - Handle errors: Return 404 if camera not found, 403 if unauthorized, 503 if stream unavailable
  - Log all requests to CloudWatch
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3.5 Implement stream health monitoring
  - Monitor stream availability and connection status
  - Track stream bitrate and frame rate metrics
  - Detect stream disconnections and timeouts
  - Log health metrics to CloudWatch every 30 seconds
  - Trigger alerts if stream unavailable for more than 2 minutes
  - Implement automatic reconnection with exponential backoff
  - _Requirements: 2.5_

---

## Phase 3: Security & Credential Handling

### 4. Implement credential extraction and secure storage

- [ ] 4.1 Create credential service
  - Create new file: `backend/src/services/credentialService.ts`
  - Implement `CredentialService` class with methods:
    - `extractCredentialsFromUrl(rtspUrl: string): {username?: string, password?: string, cleanUrl: string}`
    - `storeCredentials(cameraId: string, credentials: {username: string, password: string}): Promise<void>`
    - `retrieveCredentials(cameraId: string): Promise<{username?: string, password?: string}>`
    - `validateCredentialFormat(username: string, password: string): boolean`
  - _Requirements: 2.4_

- [ ] 4.2 Implement RTSP URL parsing
  - Parse RTSP URLs to extract username and password
  - Handle URL format: `rtsp://[username[:password]@]host[:port]/path`
  - Validate credential format (alphanumeric, special chars allowed)
  - Remove credentials from URL before logging or storing
  - Handle edge cases: URLs without credentials, malformed URLs
  - _Requirements: 2.4_

- [ ] 4.3 Integrate AWS Secrets Manager for credential storage
  - Store credentials in AWS Secrets Manager with key: `green-sentinel/camera/{cameraId}/rtsp-credentials`
  - Encrypt credentials at rest using AWS KMS
  - Implement automatic rotation policy (90-day rotation)
  - Audit all credential access with CloudTrail logging
  - Implement credential caching in memory with 5-minute TTL
  - Rate limit credential retrieval (max 100 requests per minute)
  - _Requirements: 2.4_

- [ ] 4.4 Implement credential validation and error handling
  - Validate credentials before storing (non-empty, reasonable length)
  - Handle credential retrieval failures gracefully
  - Never log or expose credentials in error messages
  - Implement secure credential comparison (constant-time comparison)
  - Log credential access with timestamp and requesting service
  - _Requirements: 2.4_

---

## Phase 4: Frontend Implementation

### 5. Modify LiveCamera component for RTSP support

- [ ] 5.1 Add RTSP camera detection logic
  - Modify `frontend/src/components/LiveCamera.tsx`
  - Add logic to detect camera type (RTSP vs browser)
  - Check if `camera.rtspUrl` exists and is valid RTSP URL
  - Store camera type in component state: `cameraType: 'rtsp' | 'browser'`
  - Pass full camera object to component instead of just farmId
  - Add type definitions for camera object with optional `rtspUrl` property
  - _Bug_Condition: isBugCondition(camera) where camera.rtspUrl exists_
  - _Expected_Behavior: expectedBehavior(component) displays RTSP stream_
  - _Preservation: Browser camera detection continues to work when rtspUrl is absent_
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5.2 Implement stream source handling
  - For browser cameras: Continue using `getUserMedia()` as before
  - For RTSP cameras: Fetch HLS stream URL from backend `/stream-proxy/{cameraId}`
  - Implement HLS.js library for adaptive streaming playback
  - Set video element source based on camera type
  - Handle stream source switching when user changes cameras
  - Implement error handling for stream source failures
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5.3 Integrate backend stream proxy API
  - Add API call to fetch stream proxy URL: `GET /api/stream-proxy/{cameraId}`
  - Implement retry logic for API failures (max 3 retries with exponential backoff)
  - Handle API errors: 404 (camera not found), 403 (unauthorized), 503 (stream unavailable)
  - Display appropriate error messages for each error type
  - Implement request timeout (10-second timeout)
  - Cache stream proxy URL with 5-minute TTL
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5.4 Add RTSP-specific error handling
  - Distinguish between browser camera errors and RTSP stream errors
  - Display specific error messages:
    - "RTSP stream unavailable" when stream is offline
    - "Failed to connect to RTSP camera" when connection fails
    - "Invalid RTSP credentials" when authentication fails
    - "Stream connection timeout" when stream takes too long to connect
  - Implement fallback to browser camera if RTSP fails (with user confirmation)
  - Log errors to CloudWatch with camera ID and error type
  - Implement automatic retry for transient failures
  - _Requirements: 2.5_

- [ ] 5.5 Ensure motion detection compatibility
  - Verify motion detection canvas logic works with HLS video element
  - Motion detection algorithm should work identically on both video sources
  - No changes needed to motion detection algorithm itself
  - Test motion detection on both browser and RTSP cameras
  - _Preservation: Motion detection behavior unchanged for all video sources_
  - _Requirements: 3.3_

- [ ] 5.6 Ensure frame capture for threat analysis
  - Verify frame capture works with both `getUserMedia()` and HLS video elements
  - Canvas drawing should work identically on both video sources
  - No changes needed to threat analysis frame capture logic
  - Test frame capture on both browser and RTSP cameras
  - _Preservation: Threat analysis frame capture unchanged for all video sources_
  - _Requirements: 3.4, 3.5_

- [ ] 5.7 Implement camera switching UI
  - Add UI to switch between RTSP and browser cameras
  - Display list of available cameras (RTSP and browser)
  - Handle camera switching without losing motion detection state
  - Preserve threat analysis history when switching cameras
  - Display current camera type in UI
  - _Preservation: Camera switching behavior unchanged_
  - _Requirements: 3.2_

---

## Phase 5: Testing & Validation

### 6. Verify bug condition exploration test now passes

- [ ] 6.1 Re-run bug condition exploration test
  - **Property 1: Expected Behavior** - RTSP Stream Displayed
  - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
  - The test from task 1 encodes the expected behavior
  - When this test passes, it confirms the expected behavior is satisfied
  - Run bug condition exploration test from step 1
  - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
  - Verify all counterexamples from task 1 are now resolved:
    - Component detects RTSP camera configuration
    - API call to stream proxy endpoint is made
    - Video element populated with HLS stream URL
    - Component does NOT attempt `getUserMedia()` for RTSP cameras
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

### 7. Verify preservation tests still pass

- [ ] 7.1 Re-run preservation property tests
  - **Property 2: Preservation** - Browser Camera and Threat Detection Unchanged
  - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
  - Run preservation property tests from step 2
  - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
  - Verify all preservation requirements are met:
    - Browser camera access via `getUserMedia()` works when no RTSP URL configured
    - Motion detection triggers on browser camera feed
    - Threat analysis captures frames from browser camera
    - Manual threat scan button works on browser camera
    - 30-second cooldown timer prevents rapid re-analysis
    - All UI elements display correctly
    - All tests still pass after fix (no regressions)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

### 8. Integration testing

- [ ] 8.1 Test full RTSP flow
  - Add RTSP camera through Camera Management interface
  - Navigate to LiveCamera component
  - Verify stream displays correctly
  - Verify motion detection triggers on RTSP stream
  - Verify threat analysis works on RTSP stream
  - Verify manual threat scan works on RTSP stream
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 8.2 Test camera switching
  - Configure both RTSP and browser cameras
  - Switch between RTSP and browser cameras
  - Verify stream switches correctly
  - Verify motion detection continues to work
  - Verify threat analysis continues to work
  - _Requirements: 3.2_

- [ ] 8.3 Test error scenarios
  - Test RTSP stream unavailable (offline camera)
  - Test invalid RTSP credentials
  - Test RTSP connection timeout
  - Test stream connection failure
  - Verify appropriate error messages display
  - Verify fallback to browser camera works
  - _Requirements: 2.5_

- [ ] 8.4 Test multi-camera farm
  - Configure farm with 2+ RTSP cameras and browser camera
  - Verify all cameras display correctly
  - Verify switching between cameras works
  - Verify motion detection works on all cameras
  - Verify threat analysis works on all cameras
  - _Requirements: 3.2_

- [ ] 8.5 Test offline functionality
  - Verify cached threat data displays when offline
  - Verify RTSP stream gracefully handles offline mode
  - Verify browser camera continues to work offline
  - _Requirements: 3.1_

### 9. Checkpoint - Ensure all tests pass

- [ ] 9.1 Final validation
  - Ensure bug condition exploration test passes (Property 1)
  - Ensure preservation property tests pass (Property 2)
  - Ensure all unit tests pass
  - Ensure all integration tests pass
  - Ensure no regressions in existing functionality
  - Ensure error handling works correctly
  - Ensure performance is acceptable (stream latency < 5 seconds)
  - Ensure security best practices are followed (credentials never logged)
  - Ask the user if questions arise or if additional testing is needed
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

---

## Task Dependencies

```
Phase 1: Exploration & Validation
├── Task 1: Write bug condition exploration test
└── Task 2: Write preservation property tests

Phase 2: Backend Implementation (depends on Phase 1)
└── Task 3: Implement backend stream proxy service
    ├── 3.1: Create stream proxy service foundation
    ├── 3.2: Implement RTSP connection handler
    ├── 3.3: Implement HLS transcoding pipeline
    ├── 3.4: Create stream proxy API endpoint
    └── 3.5: Implement stream health monitoring

Phase 3: Security & Credential Handling (depends on Phase 2)
└── Task 4: Implement credential extraction and secure storage
    ├── 4.1: Create credential service
    ├── 4.2: Implement RTSP URL parsing
    ├── 4.3: Integrate AWS Secrets Manager
    └── 4.4: Implement credential validation

Phase 4: Frontend Implementation (depends on Phase 2 & 3)
└── Task 5: Modify LiveCamera component for RTSP support
    ├── 5.1: Add RTSP camera detection logic
    ├── 5.2: Implement stream source handling
    ├── 5.3: Integrate backend stream proxy API
    ├── 5.4: Add RTSP-specific error handling
    ├── 5.5: Ensure motion detection compatibility
    ├── 5.6: Ensure frame capture for threat analysis
    └── 5.7: Implement camera switching UI

Phase 5: Testing & Validation (depends on Phase 4)
├── Task 6: Verify bug condition exploration test passes
├── Task 7: Verify preservation tests still pass
├── Task 8: Integration testing
└── Task 9: Checkpoint - Ensure all tests pass
```

---

## Priority & Execution Order

**Critical Path (must complete in order):**
1. Task 1 & 2: Write exploration and preservation tests
2. Task 3: Backend stream proxy service
3. Task 4: Credential handling
4. Task 5: Frontend modifications
5. Task 6 & 7: Verify tests pass
6. Task 8 & 9: Integration testing and validation

**Parallel Opportunities:**
- Tasks 3 and 4 can be developed in parallel after Phase 1
- Sub-tasks within Task 3 can be parallelized (3.2, 3.3, 3.4 can start after 3.1)
- Sub-tasks within Task 4 can be parallelized (4.2, 4.3, 4.4 can start after 4.1)
- Sub-tasks within Task 5 can be parallelized (5.2-5.7 can start after 5.1)

---

## Success Criteria

- [ ] Bug condition exploration test passes (Property 1: Fault Condition → Expected Behavior)
- [ ] Preservation property tests pass (Property 2: Preservation unchanged)
- [ ] RTSP cameras display live video feed in LiveCamera component
- [ ] Browser camera functionality continues to work unchanged
- [ ] Motion detection works on both RTSP and browser cameras
- [ ] Threat analysis works on both RTSP and browser cameras
- [ ] Error handling displays appropriate messages for RTSP failures
- [ ] Credentials are securely stored and never logged
- [ ] Stream latency is acceptable (< 5 seconds)
- [ ] No regressions in existing functionality
- [ ] All tests pass (unit, integration, property-based)
