#!/usr/bin/env node
/**
 * Green Sentinel - CDK Application Entry Point
 */

import * as cdk from 'aws-cdk-lib';
import { GreenSentinelStack } from './stacks/green-sentinel-stack';

const app = new cdk.App();

// Get environment from context
const environment = app.node.tryGetContext('environment') || 'development';

// Environment-specific configuration
const envConfig: Record<string, { account?: string; region: string }> = {
  development: {
    region: 'ap-south-1', // Mumbai for India
  },
  production: {
    region: 'ap-south-1',
  },
};

const config = envConfig[environment] || envConfig.development;

// Create the main stack
new GreenSentinelStack(app, `GreenSentinel-${environment}`, {
  env: {
    account: config.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: config.region,
  },
  environment,
  description: 'Green Sentinel - Digital Immune System for Indian Agriculture',
  tags: {
    Project: 'GreenSentinel',
    Environment: environment,
    ManagedBy: 'CDK',
  },
});

app.synth();
