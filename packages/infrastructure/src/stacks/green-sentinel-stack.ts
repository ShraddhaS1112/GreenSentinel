/**
 * Green Sentinel - Main CDK Stack
 *
 * Defines all AWS resources for the Green Sentinel platform:
 * - DynamoDB tables
 * - S3 buckets
 * - Lambda functions
 * - SQS queues
 * - SNS topics
 * - API Gateway / AppSync
 * - Secrets Manager
 * - EventBridge rules
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import * as path from 'path';

interface GreenSentinelStackProps extends cdk.StackProps {
  environment: string;
}

export class GreenSentinelStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GreenSentinelStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const isProd = environment === 'production';

    // =========================================================================
    // SECRETS MANAGER
    // =========================================================================

    // API Keys secret (will be populated manually)
    const apiKeysSecret = new secretsmanager.Secret(this, 'ApiKeys', {
      secretName: `green-sentinel/${environment}/api-keys`,
      description: 'External API keys for Green Sentinel',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          sentinelHubClientId: '',
          sentinelHubClientSecret: '',
        }),
        generateStringKey: 'placeholder',
      },
    });

    // Twilio credentials
    const twilioSecret = new secretsmanager.Secret(this, 'TwilioCredentials', {
      secretName: `green-sentinel/${environment}/twilio`,
      description: 'Twilio API credentials for WhatsApp',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          accountSid: '',
          authToken: '',
          whatsappNumber: '',
        }),
        generateStringKey: 'placeholder',
      },
    });

    // Bhashini credentials
    const bhashiniSecret = new secretsmanager.Secret(this, 'BhashiniCredentials', {
      secretName: `green-sentinel/${environment}/bhashini`,
      description: 'Bhashini API credentials for translation',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          userId: '',
          ulcaApiKey: '',
          inferenceApiKey: '',
          pipelineId: '',
        }),
        generateStringKey: 'placeholder',
      },
    });

    // =========================================================================
    // S3 BUCKETS
    // =========================================================================

    // Frame storage bucket with lifecycle rules
    const framesBucket = new s3.Bucket(this, 'FramesBucket', {
      bucketName: `green-sentinel-frames-${environment}-${this.account}`,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
      lifecycleRules: [
        {
          id: 'DeleteOldFrames',
          expiration: cdk.Duration.hours(24),
          enabled: true,
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Heatmaps bucket
    const heatmapsBucket = new s3.Bucket(this, 'HeatmapsBucket', {
      bucketName: `green-sentinel-heatmaps-${environment}-${this.account}`,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Assets bucket (voice messages, etc.)
    const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `green-sentinel-assets-${environment}-${this.account}`,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
      lifecycleRules: [
        {
          id: 'DeleteOldAssets',
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // =========================================================================
    // DYNAMODB TABLES
    // =========================================================================

    // Threats table
    const threatsTable = new dynamodb.Table(this, 'ThreatsTable', {
      tableName: `GreenSentinel-Threats-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: isProd,
    });

    // Add GSI for querying by farm
    threatsTable.addGlobalSecondaryIndex({
      indexName: 'farmId-index',
      partitionKey: { name: 'farmId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Health scores table
    const healthScoresTable = new dynamodb.Table(this, 'HealthScoresTable', {
      tableName: `GreenSentinel-HealthScores-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Farms table
    const farmsTable = new dynamodb.Table(this, 'FarmsTable', {
      tableName: `GreenSentinel-Farms-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    farmsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Users table
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `GreenSentinel-Users-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: 'phoneNumber-index',
      partitionKey: { name: 'phoneNumber', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Alerts table
    const alertsTable = new dynamodb.Table(this, 'AlertsTable', {
      tableName: `GreenSentinel-Alerts-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // Audit logs table
    const auditLogsTable = new dynamodb.Table(this, 'AuditLogsTable', {
      tableName: `GreenSentinel-AuditLogs-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // =========================================================================
    // SQS QUEUES
    // =========================================================================

    // Dead letter queue
    const deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: `GreenSentinel-DeadLetter-${environment}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Frame processing queue
    const frameProcessingQueue = new sqs.Queue(this, 'FrameProcessingQueue', {
      queueName: `GreenSentinel-FrameProcessing-${environment}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    // =========================================================================
    // SNS TOPICS
    // =========================================================================

    // Threat notifications topic
    const threatNotificationsTopic = new sns.Topic(this, 'ThreatNotificationsTopic', {
      topicName: `GreenSentinel-ThreatNotifications-${environment}`,
      displayName: 'Green Sentinel Threat Notifications',
    });

    // System alerts topic (for admin notifications)
    const systemAlertsTopic = new sns.Topic(this, 'SystemAlertsTopic', {
      topicName: `GreenSentinel-SystemAlerts-${environment}`,
      displayName: 'Green Sentinel System Alerts',
    });

    // =========================================================================
    // LAMBDA FUNCTIONS
    // =========================================================================

    // Common Lambda configuration
    const lambdaDefaults: Partial<lambdaNodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        ENVIRONMENT: environment,
        FRAMES_BUCKET: framesBucket.bucketName,
        HEATMAPS_BUCKET: heatmapsBucket.bucketName,
        ASSETS_BUCKET: assetsBucket.bucketName,
        THREATS_TABLE: threatsTable.tableName,
        HEALTH_SCORES_TABLE: healthScoresTable.tableName,
        FARMS_TABLE: farmsTable.tableName,
        USERS_TABLE: usersTable.tableName,
        ALERTS_TABLE: alertsTable.tableName,
        AUDIT_LOGS_TABLE: auditLogsTable.tableName,
        FRAME_PROCESSING_QUEUE_URL: frameProcessingQueue.queueUrl,
        THREAT_NOTIFICATIONS_TOPIC_ARN: threatNotificationsTopic.topicArn,
        API_KEYS_SECRET_ARN: apiKeysSecret.secretArn,
        TWILIO_SECRET_ARN: twilioSecret.secretArn,
        BHASHINI_SECRET_ARN: bhashiniSecret.secretArn,
      },
    };

    // Threat Detection Lambda
    const threatDetectionFn = new lambdaNodejs.NodejsFunction(this, 'ThreatDetectionFunction', {
      ...lambdaDefaults,
      functionName: `GreenSentinel-ThreatDetection-${environment}`,
      entry: path.join(__dirname, '../../backend/src/handlers/threat-detection.handler.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
    });

    // Alert Service Lambda
    const alertServiceFn = new lambdaNodejs.NodejsFunction(this, 'AlertServiceFunction', {
      ...lambdaDefaults,
      functionName: `GreenSentinel-AlertService-${environment}`,
      entry: path.join(__dirname, '../../backend/src/handlers/alert.handler.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
    });

    // Health Analysis Lambda
    const healthAnalysisFn = new lambdaNodejs.NodejsFunction(this, 'HealthAnalysisFunction', {
      ...lambdaDefaults,
      functionName: `GreenSentinel-HealthAnalysis-${environment}`,
      entry: path.join(__dirname, '../../backend/src/handlers/health.handler.ts'),
      handler: 'handler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
    });

    // =========================================================================
    // PERMISSIONS
    // =========================================================================

    // Grant DynamoDB permissions
    [threatsTable, healthScoresTable, farmsTable, usersTable, alertsTable, auditLogsTable].forEach((table) => {
      table.grantReadWriteData(threatDetectionFn);
      table.grantReadWriteData(alertServiceFn);
      table.grantReadWriteData(healthAnalysisFn);
    });

    // Grant S3 permissions
    framesBucket.grantReadWrite(threatDetectionFn);
    framesBucket.grantRead(alertServiceFn);
    heatmapsBucket.grantReadWrite(healthAnalysisFn);
    assetsBucket.grantReadWrite(alertServiceFn);

    // Grant SQS permissions
    frameProcessingQueue.grantConsumeMessages(threatDetectionFn);

    // Grant SNS permissions
    threatNotificationsTopic.grantPublish(threatDetectionFn);

    // Grant Secrets Manager permissions
    apiKeysSecret.grantRead(healthAnalysisFn);
    twilioSecret.grantRead(alertServiceFn);
    bhashiniSecret.grantRead(alertServiceFn);

    // Grant Bedrock permissions for threat detection
    threatDetectionFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'], // Bedrock doesn't support resource-level permissions yet
    }));

    // =========================================================================
    // EVENT SOURCE MAPPINGS
    // =========================================================================

    // SQS -> Threat Detection Lambda
    threatDetectionFn.addEventSource(
      new cdk.aws_lambda_event_sources.SqsEventSource(frameProcessingQueue, {
        batchSize: 1,
        maxConcurrency: 10,
      })
    );

    // SNS -> Alert Service Lambda
    threatNotificationsTopic.addSubscription(
      new snsSubscriptions.LambdaSubscription(alertServiceFn)
    );

    // =========================================================================
    // EVENTBRIDGE RULES
    // =========================================================================

    // Daily health analysis at 06:00 UTC
    new events.Rule(this, 'DailyHealthAnalysis', {
      ruleName: `GreenSentinel-DailyHealthAnalysis-${environment}`,
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '6',
      }),
      targets: [new targets.LambdaFunction(healthAnalysisFn)],
    });

    // =========================================================================
    // OUTPUTS
    // =========================================================================

    new cdk.CfnOutput(this, 'FramesBucketName', {
      value: framesBucket.bucketName,
      description: 'S3 bucket for camera frames',
    });

    new cdk.CfnOutput(this, 'HeatmapsBucketName', {
      value: heatmapsBucket.bucketName,
      description: 'S3 bucket for NDVI heatmaps',
    });

    new cdk.CfnOutput(this, 'FrameProcessingQueueUrl', {
      value: frameProcessingQueue.queueUrl,
      description: 'SQS queue URL for frame processing',
    });

    new cdk.CfnOutput(this, 'ThreatNotificationsTopicArn', {
      value: threatNotificationsTopic.topicArn,
      description: 'SNS topic ARN for threat notifications',
    });

    new cdk.CfnOutput(this, 'ThreatDetectionFunctionArn', {
      value: threatDetectionFn.functionArn,
      description: 'Threat detection Lambda ARN',
    });
  }
}
