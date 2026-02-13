# Green-Sentinel Requirements Document

## Introduction

Green-Sentinel is a Digital Immune System for Indian Agriculture, designed to prevent crop losses of 30%+ from fire, flood, and intruders. The platform combines Satellite Intelligence (NDVI) with Ground-Level AI Vision to provide city-based farmers with remote farm threat and crop health monitoring. The system operates as a zero-install Progressive Web App (PWA) optimized for low-bandwidth rural networks, delivering threat detection and multilingual alerts within 10 seconds end-to-end.

## Glossary

- **PWA**: Progressive Web App - a web application that works offline and can be installed on devices without app store distribution
- **RTSP**: Real-Time Streaming Protocol - a network protocol for streaming video from IP cameras
- **NDVI**: Normalized Difference Vegetation Index - a satellite-derived metric measuring crop health (0-1 scale, displayed as Red-to-Green heatmap)
- **Farm_Health_Score**: A composite metric (0-100) derived from NDVI data indicating overall crop health status
- **Threat_Detection_Engine**: AI system analyzing camera frames to identify humans, animals, and fire with confidence scores
- **Confidence_Score**: Probability metric (0-100%) indicating detection certainty for threats
- **End_to_End_Latency**: Time elapsed from threat detection in camera frame to WhatsApp notification delivery including snapshot evidence
- **Multilingual_Alert**: Notification message translated and delivered in regional languages (Hindi, Marathi, Tamil, Telugu, Kannada, Bengali)
- **Camera_Credential**: Authentication information (IP address, username, password) required to access RTSP streams
- **Sentinel_Hub_API**: Copernicus Sentinel Hub service providing satellite imagery and NDVI calculations
- **Bedrock_Claude**: Amazon Bedrock service running Claude 3.5 Sonnet model for vision analysis
- **Twilio_WhatsApp_API**: Twilio service enabling WhatsApp message delivery
- **Bhashini_API**: Government of India's language translation and voice synthesis service
- **AWS_Free_Tier**: AWS usage limits allowing free monthly access to specified services
- **Serverless_Architecture**: Cloud computing model using AWS Lambda, S3, DynamoDB, and AppSync without managing servers
- **System_Uptime**: Percentage of time the system is operational and responding to requests

## Requirements

### Requirement 1: Progressive Web App Core

**User Story:** As a city-based farmer, I want to access farm monitoring through a web browser without installing an app, so that I can monitor my remote farm from any device with internet connectivity.

#### Acceptance Criteria

1. THE PWA SHALL be installable on mobile and desktop devices without requiring app store distribution
2. WHEN the PWA is accessed on a device with no internet connection, THE PWA SHALL display previously cached farm data and threat history
3. WHEN the PWA is first loaded on a 2G/3G network, THE PWA SHALL complete initial load within 8 seconds
4. THE PWA SHALL support responsive design that adapts to screen sizes from 320px (mobile) to 1920px (desktop)
5. WHEN a user navigates between dashboard, threat alerts, and crop health sections, THE PWA SHALL maintain smooth transitions without full page reloads
6. THE PWA SHALL store user authentication tokens securely in browser storage with automatic refresh before expiration

### Requirement 2: RTSP Camera Frame Acquisition

**User Story:** As a farm owner, I want the system to continuously capture frames from my IP cameras, so that threats can be detected in real-time.

#### Acceptance Criteria

1. WHEN a camera is registered with valid RTSP credentials, THE Frame_Acquisition_Service SHALL establish a connection and begin streaming frames
2. WHEN frames are acquired from an RTSP stream, THE Frame_Acquisition_Service SHALL capture one frame every 5-10 seconds as configured
3. WHEN a camera connection fails, THE Frame_Acquisition_Service SHALL attempt reconnection with exponential backoff (1s, 2s, 4s, 8s maximum)
4. WHEN frames are captured, THE Frame_Acquisition_Service SHALL store frames temporarily in S3 with automatic cleanup after 24 hours
5. WHEN multiple cameras are registered for a single farm, THE Frame_Acquisition_Service SHALL manage concurrent streams without frame loss
6. WHEN a frame is corrupted or unreadable, THE Frame_Acquisition_Service SHALL log the error and continue processing subsequent frames

### Requirement 3: AI Vision-Based Threat Detection

**User Story:** As a farmer, I want the system to automatically detect threats like fire, intruders, and animals in camera frames, so that I can respond immediately to protect my crops.

#### Acceptance Criteria

1. WHEN a frame is received from a camera, THE Threat_Detection_Engine SHALL analyze it using Claude 3.5 Sonnet via Amazon Bedrock
2. WHEN the Threat_Detection_Engine analyzes a frame, THE ENGINE SHALL return confidence scores for three threat categories: fire (≥80%), human intruders (≥80%), and animals (≥75%)
3. IF a threat is detected with confidence score above the configured threshold, THEN THE Threat_Detection_Engine SHALL create a threat record with timestamp, threat type, confidence score, and frame snapshot
4. WHEN a frame is analyzed, THE Threat_Detection_Engine SHALL complete analysis within 3 seconds per frame
5. WHEN multiple frames are queued for analysis, THE Threat_Detection_Engine SHALL process them sequentially without dropping frames
6. WHEN a threat is detected, THE Threat_Detection_Engine SHALL store the detection event in DynamoDB with full metadata for audit and historical analysis

### Requirement 4: Satellite-Based Crop Health Intelligence

**User Story:** As a farmer, I want daily satellite-derived crop health metrics, so that I can understand overall farm productivity and plan interventions.

#### Acceptance Criteria

1. WHEN a farm is registered with geographic coordinates, THE Crop_Health_Service SHALL query Sentinel Hub API daily at 06:00 UTC for NDVI data
2. WHEN NDVI data is retrieved, THE Crop_Health_Service SHALL calculate a Farm_Health_Score (0-100) where 0 represents dead crops and 100 represents peak health
3. WHEN NDVI data is processed, THE Crop_Health_Service SHALL generate a color-coded heatmap displaying Red (poor health, NDVI <0.3) through Yellow (moderate, 0.3-0.6) to Green (excellent, >0.6)
4. WHEN a Farm_Health_Score is calculated, THE Crop_Health_Service SHALL store it in DynamoDB with timestamp and satellite image metadata
5. WHEN a farm's health score changes by more than 10 points from the previous day, THE Crop_Health_Service SHALL trigger an informational alert to the farmer
6. WHEN satellite data is unavailable due to cloud cover, THE Crop_Health_Service SHALL use the most recent valid NDVI data and mark it as cached

### Requirement 5: Multilingual Alert Delivery

**User Story:** As a farmer in a regional language region, I want threat alerts delivered in my local language via WhatsApp, so that I can understand threats immediately without language barriers.

#### Acceptance Criteria

1. WHEN a threat is detected, THE Alert_Service SHALL compose an alert message containing threat type, timestamp, confidence score, and farm location
2. WHEN an alert is composed, THE Alert_Service SHALL translate the message into the farmer's configured language using Bhashini API
3. WHEN a message is translated, THE Alert_Service SHALL deliver it via Twilio WhatsApp API to the farmer's registered phone number
4. WHEN a threat alert is sent, THE Alert_Service SHALL attach a snapshot of the detected threat as image evidence
5. WHEN a farmer's language preference is set to a language with voice capability, THE Alert_Service SHALL generate a voice message using Bhashini voice synthesis and send it as a WhatsApp audio message
6. WHEN an alert is sent, THE Alert_Service SHALL log delivery status (sent, delivered, failed) in DynamoDB for audit purposes

### Requirement 6: End-to-End Latency Performance

**User Story:** As a farmer, I want threat alerts to reach me within 10 seconds of detection, so that I can respond quickly to prevent crop damage.

#### Acceptance Criteria

1. WHEN a threat is detected in a camera frame, THE System SHALL measure time from frame capture to WhatsApp notification delivery
2. WHEN the End_to_End_Latency is measured, THE System SHALL ensure it does not exceed 10 seconds including frame analysis, alert composition, translation, and delivery
3. WHEN latency exceeds 8 seconds, THE System SHALL log a performance warning with component-level timing breakdown
4. WHEN latency exceeds 10 seconds, THE System SHALL log a performance failure and trigger an alert to the system administrator
5. WHEN multiple threats are detected simultaneously, THE System SHALL process each threat independently without cascading delays
6. WHEN the system is under peak load (10+ concurrent camera streams), THE System SHALL maintain <10 second latency for 95% of threat alerts

### Requirement 7: Security and Credential Management

**User Story:** As a farm owner, I want my camera credentials and farm data to be protected from unauthorized access, so that my farm remains secure and private.

#### Acceptance Criteria

1. WHEN camera credentials are registered, THE Security_Service SHALL encrypt them using AWS Secrets Manager with automatic rotation every 90 days
2. WHEN a credential is retrieved for camera connection, THE Security_Service SHALL log the access with timestamp and requesting service identity
3. WHEN a user authenticates to the PWA, THE Security_Service SHALL issue a JWT token with 1-hour expiration and refresh token with 7-day expiration
4. WHEN API requests are made, THE Security_Service SHALL validate JWT tokens and reject requests with invalid or expired tokens
5. WHEN farm data is stored in DynamoDB, THE Security_Service SHALL encrypt it at rest using AWS KMS with farm-specific encryption keys
6. WHEN data is transmitted between PWA and backend, THE Security_Service SHALL use HTTPS/TLS 1.3 with certificate pinning for mobile clients

### Requirement 8: Multi-Farm Scalability

**User Story:** As an agricultural cooperative, I want to monitor multiple farms simultaneously, so that I can manage a portfolio of farms efficiently.

#### Acceptance Criteria

1. WHEN a user registers multiple farms, THE System SHALL maintain separate threat detection, crop health, and alert streams for each farm
2. WHEN a user switches between farms in the PWA, THE System SHALL load farm-specific data within 2 seconds
3. WHEN multiple farms are monitored concurrently, THE System SHALL scale Lambda functions automatically to handle concurrent workloads
4. WHEN a farm has multiple cameras (up to 10), THE System SHALL process all camera streams without performance degradation
5. WHEN DynamoDB usage increases with multiple farms, THE System SHALL use on-demand billing to scale capacity automatically
6. WHEN a user has access to multiple farms, THE System SHALL enforce role-based access control (RBAC) to prevent cross-farm data access

### Requirement 9: System Reliability and Recovery

**User Story:** As a farmer, I want the system to be available 24/7 and recover automatically from failures, so that I never miss critical threat alerts.

#### Acceptance Criteria

1. THE System SHALL maintain 99.5% uptime measured monthly across all components
2. WHEN a Lambda function fails, THE System SHALL automatically retry the function with exponential backoff (1s, 2s, 4s) up to 3 attempts
3. WHEN a DynamoDB operation fails due to throttling, THE System SHALL implement automatic backoff and retry without data loss
4. WHEN an external API (Sentinel Hub, Bedrock, Twilio) is unavailable, THE System SHALL queue requests and retry when service is restored
5. WHEN a threat alert fails to deliver via WhatsApp, THE System SHALL retry delivery up to 5 times over 30 minutes
6. WHEN the system detects a critical failure, THE System SHALL send an alert to the system administrator with error details and affected farms

### Requirement 10: AWS Free Tier Cost Compliance

**User Story:** As a project stakeholder, I want the system to operate within AWS Free Tier limits, so that demo and pilot deployments incur no infrastructure costs.

#### Acceptance Criteria

1. WHEN the system is deployed, THE Architecture SHALL use only AWS services included in the Free Tier (Lambda, S3, DynamoDB, AppSync, Secrets Manager)
2. WHEN Lambda functions are invoked, THE System SHALL ensure total monthly invocations do not exceed 1,000,000 (Free Tier limit)
3. WHEN data is stored in S3, THE System SHALL ensure total storage does not exceed 5GB monthly (Free Tier limit)
4. WHEN DynamoDB is used, THE System SHALL configure on-demand billing with Free Tier limits (25GB storage, 25 read/write capacity units)
5. WHEN external APIs are called (Sentinel Hub, Bedrock, Twilio, Bhashini), THE System SHALL track usage and implement rate limiting to stay within free tier quotas
6. WHEN monthly costs are calculated, THE System SHALL generate a cost report showing usage against Free Tier limits and alert if any service approaches its limit

