/**
 * Green Sentinel - Lambda Handlers Index
 *
 * Exports all Lambda handler functions.
 */

// Threat Detection
export { handler as threatDetectionHandler } from './threat-detection.handler';
export { batchProcessFrames } from './threat-detection.handler';

// Alert Service
export { handler as alertHandler } from './alert.handler';
export { retryFailedAlerts, sendHealthAlert } from './alert.handler';

// Health Analysis
export { handler as healthHandler } from './health.handler';
export {
  processSingleFarm,
  backfillHistoricalData,
  calculateHealthTrends,
} from './health.handler';
