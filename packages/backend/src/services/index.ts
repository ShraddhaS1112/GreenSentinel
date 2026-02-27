/**
 * Green Sentinel - Backend Services Index
 *
 * Exports all service modules for use in Lambda handlers.
 */

// Database operations
export * from './dynamodb.service';

// Storage operations
export * from './s3.service';

// AI & Analysis
export * from './bedrock.service';

// Satellite data (FREE - AWS Open Data)
export * from './satellite-free.service';

// Weather (FREE - Open-Meteo)
export * from './weather-free.service';

// Disease & Pest Forecasting
export * from './disease-forecast.service';

// Irrigation Modeling
export * from './irrigation.service';

// Yield Prediction
export * from './yield-prediction.service';

// Legacy: Sentinel Hub (paid alternative)
export * from './sentinel-hub.service';

// Communication
export * from './twilio.service';
export * from './bhashini.service';
