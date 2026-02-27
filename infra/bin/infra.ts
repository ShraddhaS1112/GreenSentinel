#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GreenSentinelStack } from '../lib/green-sentinel-stack';

const app = new cdk.App();

// Development stack
new GreenSentinelStack(app, 'GreenSentinelDev', {
  stage: 'dev',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '938881281454',
    region: process.env.CDK_DEFAULT_REGION || 'ap-south-1',
  },
  description: 'Green Sentinel - Development Environment',
  tags: {
    Project: 'GreenSentinel',
    Environment: 'dev',
  },
});

// Production stack (deploy when ready)
// new GreenSentinelStack(app, 'GreenSentinelProd', {
//   stage: 'prod',
//   env: {
//     account: '938881281454',
//     region: 'ap-south-1',
//   },
//   description: 'Green Sentinel - Production Environment',
//   tags: {
//     Project: 'GreenSentinel',
//     Environment: 'prod',
//   },
// });

app.synth();
