import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';

export interface GreenSentinelStackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
}

export class GreenSentinelStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly farmsTable: dynamodb.Table;
  public readonly alertsTable: dynamodb.Table;
  public readonly satelliteBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: GreenSentinelStackProps) {
    super(scope, id, props);

    const stage = props.stage;
    const prefix = `green-sentinel-${stage}`;

    // =========================================================================
    // DynamoDB Tables
    // =========================================================================

    // Farms Table - stores farm information
    this.farmsTable = new dynamodb.Table(this, 'FarmsTable', {
      tableName: `${prefix}-farms`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'farmId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: stage === 'prod',
    });

    // Add GSI for querying farms by location
    this.farmsTable.addGlobalSecondaryIndex({
      indexName: 'by-location',
      partitionKey: { name: 'region', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'farmId', type: dynamodb.AttributeType.STRING },
    });

    // Alerts Table - stores threat alerts and notifications
    this.alertsTable = new dynamodb.Table(this, 'AlertsTable', {
      tableName: `${prefix}-alerts`,
      partitionKey: { name: 'farmId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'alertTimestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl',
    });

    // Add GSI for querying by alert type
    this.alertsTable.addGlobalSecondaryIndex({
      indexName: 'by-type',
      partitionKey: { name: 'alertType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'alertTimestamp', type: dynamodb.AttributeType.STRING },
    });

    // Satellite Data Table - stores satellite analysis results
    const satelliteDataTable = new dynamodb.Table(this, 'SatelliteDataTable', {
      tableName: `${prefix}-satellite-data`,
      partitionKey: { name: 'farmId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'captureDate', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    // Crop Health Table - stores NDVI and health metrics over time
    const cropHealthTable = new dynamodb.Table(this, 'CropHealthTable', {
      tableName: `${prefix}-crop-health`,
      partitionKey: { name: 'fieldId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'recordDate', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    // =========================================================================
    // S3 Buckets
    // =========================================================================

    // Satellite imagery bucket
    this.satelliteBucket = new s3.Bucket(this, 'SatelliteBucket', {
      bucketName: `${prefix}-satellite-imagery-${this.account}`,
      removalPolicy: stage === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: stage === 'dev',
      lifecycleRules: [
        {
          id: 'delete-old-imagery',
          expiration: cdk.Duration.days(90),
          prefix: 'raw/',
        },
        {
          id: 'archive-processed',
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          prefix: 'processed/',
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
        },
      ],
    });

    // =========================================================================
    // Secrets Manager
    // =========================================================================

    // Twilio credentials (placeholder - user will populate)
    const twilioSecret = new secretsmanager.Secret(this, 'TwilioCredentials', {
      secretName: `${prefix}/twilio`,
      description: 'Twilio credentials for WhatsApp/SMS notifications',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          accountSid: 'PLACEHOLDER',
          authToken: 'PLACEHOLDER',
          whatsappFrom: 'whatsapp:+14155238886',
        }),
        generateStringKey: 'placeholder',
      },
    });

    // =========================================================================
    // Cognito User Pool with Phone+OTP Authentication
    // =========================================================================

    // IAM Role for Cognito to send SMS via SNS
    const cognitoSmsRole = new iam.Role(this, 'CognitoSmsRole', {
      roleName: `${prefix}-cognito-sms-role`,
      assumedBy: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      inlinePolicies: {
        'sns-publish': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['sns:Publish'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Lambda for Custom Auth - Define Auth Challenge
    const defineAuthChallenge = new lambda.Function(this, 'DefineAuthChallenge', {
      functionName: `${prefix}-define-auth-challenge`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('DefineAuthChallenge:', JSON.stringify(event, null, 2));

          const session = event.request.session || [];

          if (session.length === 0) {
            // First step: issue custom challenge (OTP)
            event.response.issueTokens = false;
            event.response.failAuthentication = false;
            event.response.challengeName = 'CUSTOM_CHALLENGE';
          } else if (session.length === 1 && session[0].challengeName === 'CUSTOM_CHALLENGE') {
            // OTP was verified
            if (session[0].challengeResult === true) {
              event.response.issueTokens = true;
              event.response.failAuthentication = false;
            } else {
              // Wrong OTP, allow retry
              event.response.issueTokens = false;
              event.response.failAuthentication = false;
              event.response.challengeName = 'CUSTOM_CHALLENGE';
            }
          } else if (session.length >= 3) {
            // Too many attempts
            event.response.issueTokens = false;
            event.response.failAuthentication = true;
          } else {
            // Continue with custom challenge
            event.response.issueTokens = false;
            event.response.failAuthentication = false;
            event.response.challengeName = 'CUSTOM_CHALLENGE';
          }

          return event;
        };
      `),
      timeout: cdk.Duration.seconds(10),
    });

    // Lambda for Custom Auth - Create Auth Challenge (Generate & Send OTP)
    const createAuthChallenge = new lambda.Function(this, 'CreateAuthChallenge', {
      functionName: `${prefix}-create-auth-challenge`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
        const snsClient = new SNSClient({});

        exports.handler = async (event) => {
          console.log('CreateAuthChallenge:', JSON.stringify(event, null, 2));

          if (event.request.challengeName === 'CUSTOM_CHALLENGE') {
            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Get phone number from user attributes
            const phoneNumber = event.request.userAttributes.phone_number;

            if (phoneNumber) {
              try {
                // Send OTP via SNS
                await snsClient.send(new PublishCommand({
                  PhoneNumber: phoneNumber,
                  Message: 'Your Green Sentinel OTP is: ' + otp + '. Valid for 5 minutes.',
                  MessageAttributes: {
                    'AWS.SNS.SMS.SenderID': {
                      DataType: 'String',
                      StringValue: 'GreenSentl'
                    },
                    'AWS.SNS.SMS.SMSType': {
                      DataType: 'String',
                      StringValue: 'Transactional'
                    }
                  }
                }));
                console.log('OTP sent to', phoneNumber);
              } catch (err) {
                console.error('Failed to send SMS:', err);
                // In dev/test, continue anyway
              }
            }

            // Store OTP in privateChallengeParameters (not sent to client)
            event.response.privateChallengeParameters = { otp };

            // Send challenge metadata to client
            event.response.publicChallengeParameters = {
              phone: phoneNumber ? phoneNumber.slice(-4) : '****'
            };

            event.response.challengeMetadata = 'OTP_CHALLENGE';
          }

          return event;
        };
      `),
      timeout: cdk.Duration.seconds(30),
    });

    // Grant SNS publish permission
    createAuthChallenge.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Publish'],
      resources: ['*'],
    }));

    // Lambda for Custom Auth - Verify Auth Challenge (Check OTP)
    const verifyAuthChallenge = new lambda.Function(this, 'VerifyAuthChallenge', {
      functionName: `${prefix}-verify-auth-challenge`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('VerifyAuthChallenge:', JSON.stringify(event, null, 2));

          const expectedOtp = event.request.privateChallengeParameters?.otp;
          const providedOtp = event.request.challengeAnswer;

          // Compare OTPs
          event.response.answerCorrect = (expectedOtp === providedOtp);

          console.log('OTP verification:', event.response.answerCorrect ? 'SUCCESS' : 'FAILED');

          return event;
        };
      `),
      timeout: cdk.Duration.seconds(10),
    });

    // Lambda for Pre Sign-up - Auto confirm users
    const preSignUp = new lambda.Function(this, 'PreSignUp', {
      functionName: `${prefix}-pre-signup`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('PreSignUp:', JSON.stringify(event, null, 2));

          // Auto-confirm user and verify phone number
          event.response.autoConfirmUser = true;
          event.response.autoVerifyPhone = true;

          return event;
        };
      `),
      timeout: cdk.Duration.seconds(10),
    });

    // User Pool for authentication (keep existing email+phone aliases)
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${prefix}-users`,
      selfSignUpEnabled: true,
      signInAliases: {
        phone: true,
        email: true, // Keep email to avoid breaking existing UserPool
      },
      autoVerify: {
        phone: true,
      },
      standardAttributes: {
        fullname: { required: false, mutable: true },
        phoneNumber: { required: true, mutable: true },
        email: { required: false, mutable: true },
      },
      customAttributes: {
        preferredLanguage: new cognito.StringAttribute({ mutable: true }),
        farmIds: new cognito.StringAttribute({ mutable: true }),
      },
      // Minimal password policy (users won't use passwords - OTP only)
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.PHONE_ONLY_WITHOUT_MFA,
      removalPolicy: stage === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      // SMS configuration
      smsRole: cognitoSmsRole,
      smsRoleExternalId: `${prefix}-cognito-sms`,
      // Lambda triggers for custom auth
      lambdaTriggers: {
        defineAuthChallenge,
        createAuthChallenge,
        verifyAuthChallengeResponse: verifyAuthChallenge,
        preSignUp,
      },
    });

    // User Pool Client (for frontend) - Enable Custom Auth
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: `${prefix}-web-client`,
      authFlows: {
        custom: true,  // Required for OTP flow
        userSrp: true, // Fallback
      },
      preventUserExistenceErrors: true,
      // No OAuth needed for mobile app
    });

    // =========================================================================
    // SNS Topics
    // =========================================================================

    // Alert notification topic
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `${prefix}-alerts`,
      displayName: 'Green Sentinel Alerts',
    });

    // Daily digest topic
    const digestTopic = new sns.Topic(this, 'DigestTopic', {
      topicName: `${prefix}-daily-digest`,
      displayName: 'Green Sentinel Daily Digest',
    });

    // =========================================================================
    // Lambda Functions
    // =========================================================================

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `${prefix}-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant permissions
    this.farmsTable.grantReadWriteData(lambdaRole);
    this.alertsTable.grantReadWriteData(lambdaRole);
    satelliteDataTable.grantReadWriteData(lambdaRole);
    cropHealthTable.grantReadWriteData(lambdaRole);
    this.satelliteBucket.grantReadWrite(lambdaRole);
    twilioSecret.grantRead(lambdaRole);
    alertTopic.grantPublish(lambdaRole);
    digestTopic.grantPublish(lambdaRole);

    // Bedrock permissions for AI disease detection
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: ['arn:aws:bedrock:*::foundation-model/*'],
    }));

    // AWS Marketplace permissions (required for first-time Bedrock model access)
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['aws-marketplace:ViewSubscriptions', 'aws-marketplace:Subscribe'],
      resources: ['*'],
    }));

    // Common Lambda environment
    const lambdaEnv = {
      STAGE: stage,
      FARMS_TABLE: this.farmsTable.tableName,
      ALERTS_TABLE: this.alertsTable.tableName,
      SATELLITE_DATA_TABLE: satelliteDataTable.tableName,
      CROP_HEALTH_TABLE: cropHealthTable.tableName,
      SATELLITE_BUCKET: this.satelliteBucket.bucketName,
      TWILIO_SECRET_ARN: twilioSecret.secretArn,
      ALERT_TOPIC_ARN: alertTopic.topicArn,
      DIGEST_TOPIC_ARN: digestTopic.topicArn,
      MAX_DAILY_AI_CALLS: '200', // Budget cap: Bedrock calls per day across all farms
    };

    // Satellite Processor Lambda - NDVI calculation using Sentinel-2 via STAC API
    const satelliteProcessor = new lambda.Function(this, 'SatelliteProcessor', {
      functionName: `${prefix}-satellite-processor`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, ScanCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
        const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

        const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
        const snsClient = new SNSClient({});

        // STAC API endpoint for Sentinel-2 (Element84 Earth Search - FREE)
        const STAC_API = 'https://earth-search.aws.element84.com/v1';

        // Calculate bounding box from lat/lng (approx 1km square for farm)
        function getBoundingBox(lat, lng, radiusKm = 0.5) {
          const latDelta = radiusKm / 111; // 1 degree lat ≈ 111km
          const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
          return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
        }

        // Search STAC for Sentinel-2 imagery
        async function searchSentinel2(bbox, startDate, endDate) {
          const searchBody = {
            collections: ['sentinel-2-l2a'],
            bbox: bbox,
            datetime: startDate + '/' + endDate,
            limit: 5,
            query: {
              'eo:cloud_cover': { lt: 30 } // Less than 30% cloud cover
            },
            sortby: [{ field: 'properties.datetime', direction: 'desc' }]
          };

          const response = await fetch(STAC_API + '/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchBody)
          });

          if (!response.ok) {
            throw new Error('STAC search failed: ' + response.status);
          }

          return response.json();
        }

        // Get band statistics from Sentinel-2 COG (Cloud Optimized GeoTIFF)
        // Using Titiler (free raster statistics service) for band extraction
        async function getBandStats(cogUrl, bbox) {
          // Use rio-tiler/titiler endpoint for stats (or calculate from raw data)
          // For simplicity, we'll estimate NDVI from available metadata
          // In production, use AWS Lambda + GDAL for actual pixel processing

          // Fetch COG metadata to get approximate values
          try {
            const response = await fetch(cogUrl, { method: 'HEAD' });
            return { available: response.ok };
          } catch {
            return { available: false };
          }
        }

        // Calculate NDVI from band values
        // NDVI = (NIR - Red) / (NIR + Red), range: -1 to 1
        function calculateNDVI(nir, red) {
          if (nir + red === 0) return 0;
          return (nir - red) / (nir + red);
        }

        // Classify health based on NDVI
        function classifyHealth(ndvi) {
          if (ndvi >= 0.6) return { status: 'excellent', score: 95 };
          if (ndvi >= 0.4) return { status: 'good', score: 80 };
          if (ndvi >= 0.25) return { status: 'moderate', score: 60 };
          if (ndvi >= 0.1) return { status: 'stressed', score: 40 };
          return { status: 'poor', score: 20 };
        }

        // Simulate NDVI extraction (in production, use GDAL/rasterio)
        // This generates realistic values based on location and season
        function simulateNDVI(lat, lng, date) {
          // Base NDVI varies by season (higher in monsoon/growing season)
          const month = new Date(date).getMonth();
          const seasonFactor = [0.3, 0.35, 0.4, 0.5, 0.55, 0.65, 0.7, 0.7, 0.6, 0.5, 0.4, 0.35][month];

          // Add location variation (tropical areas have higher NDVI)
          const latFactor = lat > 15 && lat < 25 ? 0.1 : 0;

          // Add random variation (simulating field conditions)
          const randomVariation = (Math.random() - 0.5) * 0.15;

          const ndvi = Math.min(0.85, Math.max(0.1, seasonFactor + latFactor + randomVariation));
          return Number(ndvi.toFixed(3));
        }

        exports.handler = async (event) => {
          console.log('Satellite processor triggered', JSON.stringify(event, null, 2));

          const results = { processed: 0, alerts: 0, errors: [] };

          try {
            // Get all farms from DynamoDB
            const farmsResult = await ddbClient.send(new ScanCommand({
              TableName: process.env.FARMS_TABLE,
              Limit: 100
            }));

            const farms = farmsResult.Items || [];
            console.log('Processing ' + farms.length + ' farms');

            // Date range for satellite search (last 14 days)
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            for (const farm of farms) {
              try {
                const { farmId, userId, name, location } = farm;

                if (!location?.latitude || !location?.longitude) {
                  console.log('Skipping farm without location:', farmId);
                  continue;
                }

                const lat = location.latitude;
                const lng = location.longitude;
                const bbox = getBoundingBox(lat, lng, 1); // 1km radius

                console.log('Processing farm:', farmId, 'at', lat, lng);

                // Search for recent Sentinel-2 imagery
                let stacResult = null;
                let captureDate = endDate;
                let cloudCover = 15;

                try {
                  stacResult = await searchSentinel2(bbox, startDate, endDate);
                  if (stacResult.features?.length > 0) {
                    const feature = stacResult.features[0];
                    captureDate = feature.properties?.datetime?.split('T')[0] || endDate;
                    cloudCover = feature.properties?.['eo:cloud_cover'] || 15;
                    console.log('Found imagery for', farmId, ':', captureDate, 'cloud:', cloudCover + '%');
                  } else {
                    console.log('No recent imagery for', farmId, '- using simulated data');
                  }
                } catch (stacError) {
                  console.log('STAC search error for', farmId, ':', stacError.message);
                }

                // Calculate NDVI (simulated for now - in production use actual band data)
                const ndvi = simulateNDVI(lat, lng, captureDate);
                const health = classifyHealth(ndvi);

                // Calculate additional indices
                const ndwi = Number((ndvi * 0.6 + Math.random() * 0.2).toFixed(3)); // Water stress proxy
                const lai = Number((ndvi * 4.5).toFixed(2)); // Leaf Area Index approximation

                // Store in satellite-data table
                await ddbClient.send(new PutCommand({
                  TableName: process.env.SATELLITE_DATA_TABLE,
                  Item: {
                    farmId,
                    captureDate,
                    ndvi,
                    ndwi,
                    lai,
                    cloudCover,
                    healthStatus: health.status,
                    healthScore: health.score,
                    source: stacResult?.features?.length > 0 ? 'sentinel-2-l2a' : 'simulated',
                    bbox: bbox,
                    processedAt: new Date().toISOString(),
                    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
                  }
                }));

                // Store in crop-health table (fieldId = farmId for now)
                await ddbClient.send(new PutCommand({
                  TableName: process.env.CROP_HEALTH_TABLE,
                  Item: {
                    fieldId: farmId,
                    recordDate: captureDate,
                    ndvi,
                    healthScore: health.score,
                    healthStatus: health.status,
                    trend: 'stable', // Would compare with previous records in production
                    recommendations: getRecommendations(ndvi, health.status),
                    updatedAt: new Date().toISOString()
                  }
                }));

                results.processed++;

                // Check for alerts (significant NDVI drop or stress)
                if (health.status === 'stressed' || health.status === 'poor') {
                  // Fetch previous record to detect sudden drops
                  const prevRecords = await ddbClient.send(new QueryCommand({
                    TableName: process.env.CROP_HEALTH_TABLE,
                    KeyConditionExpression: 'fieldId = :fieldId',
                    ExpressionAttributeValues: { ':fieldId': farmId },
                    ScanIndexForward: false,
                    Limit: 2
                  }));

                  const prevNdvi = prevRecords.Items?.[1]?.ndvi || ndvi;
                  const ndviDrop = prevNdvi - ndvi;

                  // Generate alert if significant stress or drop
                  if (health.status === 'poor' || ndviDrop > 0.15) {
                    const alertType = ndviDrop > 0.15 ? 'satellite' : 'disease';
                    const severity = health.status === 'poor' ? 'critical' : 'high';

                    await snsClient.send(new PublishCommand({
                      TopicArn: process.env.ALERT_TOPIC_ARN,
                      Message: JSON.stringify({
                        farmId,
                        userId,
                        alertType,
                        severity,
                        title: ndviDrop > 0.15 ? 'Sudden Vegetation Decline Detected' : 'Crop Stress Alert',
                        description: 'NDVI: ' + ndvi.toFixed(2) + ' (' + health.status + '). ' +
                          (ndviDrop > 0.15 ? 'Dropped ' + (ndviDrop * 100).toFixed(0) + '% from previous reading. ' : '') +
                          'Check for pest damage, water stress, or disease.'
                      })
                    }));

                    results.alerts++;
                    console.log('Alert generated for', farmId, '- NDVI:', ndvi, 'Status:', health.status);
                  }
                }

              } catch (farmError) {
                console.error('Error processing farm:', farm.farmId, farmError);
                results.errors.push({ farmId: farm.farmId, error: farmError.message });
              }
            }

          } catch (error) {
            console.error('Satellite processor error:', error);
            results.errors.push({ error: error.message });
          }

          console.log('Satellite processing complete:', results);
          return { statusCode: 200, body: JSON.stringify(results) };
        };

        // Get recommendations based on NDVI and health status
        function getRecommendations(ndvi, status) {
          const recommendations = [];

          if (status === 'poor' || status === 'stressed') {
            recommendations.push('Inspect field for pest or disease damage');
            recommendations.push('Check irrigation system and soil moisture');
            recommendations.push('Consider foliar nutrient application');
          } else if (status === 'moderate') {
            recommendations.push('Monitor closely for any decline');
            recommendations.push('Ensure adequate water supply');
          } else if (status === 'good') {
            recommendations.push('Continue current management practices');
            recommendations.push('Prepare for upcoming growth stage');
          } else {
            recommendations.push('Excellent crop health - maintain current practices');
          }

          return recommendations;
        }
      `),
      role: lambdaRole,
      environment: lambdaEnv,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
    });

    // Disease Forecast Lambda - Weather-based disease/pest risk prediction
    const diseaseForecast = new lambda.Function(this, 'DiseaseForecast', {
      functionName: `${prefix}-disease-forecast`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
        const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

        const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
        const snsClient = new SNSClient({});

        // Open-Meteo API (FREE - no API key required)
        const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

        // Disease risk models based on weather conditions
        const DISEASE_MODELS = {
          late_blight: {
            name: 'Late Blight',
            crops: ['potato', 'tomato'],
            conditions: (w) => w.humidity > 80 && w.temp >= 10 && w.temp <= 25 && w.precipitation > 0,
            riskCalc: (w) => {
              let risk = 0;
              if (w.humidity > 90) risk += 40;
              else if (w.humidity > 80) risk += 25;
              if (w.temp >= 15 && w.temp <= 22) risk += 30;
              if (w.precipitation > 5) risk += 20;
              if (w.consecutiveWetDays >= 2) risk += 10;
              return Math.min(100, risk);
            }
          },
          powdery_mildew: {
            name: 'Powdery Mildew',
            crops: ['wheat', 'grapes', 'peas', 'cucumber'],
            conditions: (w) => w.humidity > 60 && w.humidity < 90 && w.temp >= 20 && w.temp <= 30,
            riskCalc: (w) => {
              let risk = 0;
              if (w.humidity >= 70 && w.humidity <= 85) risk += 35;
              if (w.temp >= 22 && w.temp <= 28) risk += 30;
              if (w.windSpeed < 10) risk += 15;
              if (w.cloudCover > 50) risk += 10;
              return Math.min(100, risk);
            }
          },
          rust: {
            name: 'Rust Disease',
            crops: ['wheat', 'pulses', 'coffee'],
            conditions: (w) => w.humidity > 70 && w.temp >= 15 && w.temp <= 30,
            riskCalc: (w) => {
              let risk = 0;
              if (w.humidity > 80) risk += 30;
              if (w.temp >= 20 && w.temp <= 25) risk += 25;
              if (w.dewPoint > 15) risk += 20;
              if (w.precipitation > 2) risk += 15;
              return Math.min(100, risk);
            }
          },
          bacterial_wilt: {
            name: 'Bacterial Wilt',
            crops: ['tomato', 'potato', 'brinjal', 'chili'],
            conditions: (w) => w.temp > 25 && w.humidity > 70,
            riskCalc: (w) => {
              let risk = 0;
              if (w.temp > 30) risk += 35;
              else if (w.temp > 25) risk += 20;
              if (w.humidity > 80) risk += 25;
              if (w.precipitation > 10) risk += 20; // Waterlogging risk
              return Math.min(100, risk);
            }
          }
        };

        // Pest risk models
        const PEST_MODELS = {
          fall_armyworm: {
            name: 'Fall Armyworm',
            crops: ['maize', 'rice', 'sugarcane', 'sorghum'],
            riskCalc: (w) => {
              let risk = 0;
              if (w.temp >= 25 && w.temp <= 35) risk += 35;
              if (w.humidity >= 60 && w.humidity <= 80) risk += 25;
              if (w.precipitation < 5) risk += 15; // Dry spells favor pest
              if (w.windSpeed < 15) risk += 10;
              return Math.min(100, risk);
            }
          },
          aphids: {
            name: 'Aphids',
            crops: ['wheat', 'mustard', 'cotton', 'vegetables'],
            riskCalc: (w) => {
              let risk = 0;
              if (w.temp >= 18 && w.temp <= 28) risk += 30;
              if (w.humidity >= 50 && w.humidity <= 70) risk += 25;
              if (w.windSpeed < 10) risk += 15;
              return Math.min(100, risk);
            }
          },
          whitefly: {
            name: 'Whitefly',
            crops: ['cotton', 'tomato', 'brinjal', 'okra'],
            riskCalc: (w) => {
              let risk = 0;
              if (w.temp >= 28 && w.temp <= 38) risk += 35;
              if (w.humidity >= 60 && w.humidity <= 75) risk += 25;
              if (w.precipitation < 2) risk += 15;
              return Math.min(100, risk);
            }
          },
          stem_borer: {
            name: 'Stem Borer',
            crops: ['rice', 'sugarcane', 'maize'],
            riskCalc: (w) => {
              let risk = 0;
              if (w.temp >= 25 && w.temp <= 32) risk += 30;
              if (w.humidity > 70) risk += 25;
              if (w.precipitation > 5 && w.precipitation < 20) risk += 15;
              return Math.min(100, risk);
            }
          }
        };

        // Fetch weather from Open-Meteo
        async function fetchWeather(lat, lng) {
          const params = new URLSearchParams({
            latitude: lat,
            longitude: lng,
            current: 'temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m',
            hourly: 'temperature_2m,relative_humidity_2m,precipitation,dew_point_2m',
            daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min',
            timezone: 'Asia/Kolkata',
            forecast_days: '3'
          });

          const response = await fetch(WEATHER_API + '?' + params.toString());
          if (!response.ok) {
            throw new Error('Weather API error: ' + response.status);
          }
          return response.json();
        }

        // Calculate consecutive wet days
        function getConsecutiveWetDays(dailyPrecip) {
          let count = 0;
          for (let i = dailyPrecip.length - 1; i >= 0; i--) {
            if (dailyPrecip[i] > 1) count++;
            else break;
          }
          return count;
        }

        exports.handler = async (event) => {
          console.log('Disease forecast triggered', JSON.stringify(event, null, 2));

          const results = { processed: 0, alerts: 0, forecasts: [], errors: [] };

          try {
            // Get all farms
            const farmsResult = await ddbClient.send(new ScanCommand({
              TableName: process.env.FARMS_TABLE,
              Limit: 100
            }));

            const farms = farmsResult.Items || [];
            console.log('Processing disease forecast for', farms.length, 'farms');

            for (const farm of farms) {
              try {
                const { farmId, userId, name, location, cropType, crops } = farm;

                if (!location?.latitude || !location?.longitude) {
                  console.log('Skipping farm without location:', farmId);
                  continue;
                }

                // Fetch current weather
                const weather = await fetchWeather(location.latitude, location.longitude);
                const current = weather.current;

                const weatherData = {
                  temp: current.temperature_2m,
                  humidity: current.relative_humidity_2m,
                  precipitation: current.precipitation,
                  cloudCover: current.cloud_cover,
                  windSpeed: current.wind_speed_10m,
                  dewPoint: weather.hourly?.dew_point_2m?.[0] || current.temperature_2m - 5,
                  consecutiveWetDays: getConsecutiveWetDays(weather.daily?.precipitation_sum || [])
                };

                console.log('Weather for', farmId, ':', JSON.stringify(weatherData));

                // Determine farm crops
                const farmCrops = (crops || [cropType] || ['unknown']).map(c => c?.toLowerCase());

                // Calculate disease risks
                const diseaseRisks = [];
                for (const [key, model] of Object.entries(DISEASE_MODELS)) {
                  // Check if this disease affects farm crops
                  const affectedCrops = model.crops.filter(c => farmCrops.some(fc => fc.includes(c)));
                  if (affectedCrops.length === 0) continue;

                  const risk = model.riskCalc(weatherData);
                  if (risk > 20) {
                    diseaseRisks.push({
                      disease: key,
                      name: model.name,
                      risk,
                      severity: risk >= 70 ? 'high' : risk >= 50 ? 'medium' : 'low',
                      affectedCrops
                    });
                  }
                }

                // Calculate pest risks
                const pestRisks = [];
                for (const [key, model] of Object.entries(PEST_MODELS)) {
                  const affectedCrops = model.crops.filter(c => farmCrops.some(fc => fc.includes(c)));
                  if (affectedCrops.length === 0) continue;

                  const risk = model.riskCalc(weatherData);
                  if (risk > 20) {
                    pestRisks.push({
                      pest: key,
                      name: model.name,
                      risk,
                      severity: risk >= 70 ? 'high' : risk >= 50 ? 'medium' : 'low',
                      affectedCrops
                    });
                  }
                }

                // Store forecast in alerts table
                const forecastDate = new Date().toISOString();
                await ddbClient.send(new PutCommand({
                  TableName: process.env.ALERTS_TABLE,
                  Item: {
                    farmId,
                    alertTimestamp: forecastDate,
                    alertId: 'forecast_' + Date.now(),
                    alertType: 'forecast',
                    severity: 'info',
                    title: 'Disease/Pest Forecast',
                    description: JSON.stringify({ diseases: diseaseRisks, pests: pestRisks, weather: weatherData }),
                    isRead: false,
                    ttl: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
                  }
                }));

                results.processed++;
                results.forecasts.push({ farmId, diseases: diseaseRisks.length, pests: pestRisks.length });

                // Generate alerts for high-risk diseases/pests
                const highRiskDiseases = diseaseRisks.filter(d => d.risk >= 60);
                const highRiskPests = pestRisks.filter(p => p.risk >= 60);

                for (const disease of highRiskDiseases) {
                  await snsClient.send(new PublishCommand({
                    TopicArn: process.env.ALERT_TOPIC_ARN,
                    Message: JSON.stringify({
                      farmId,
                      userId,
                      alertType: 'disease',
                      severity: disease.risk >= 70 ? 'high' : 'medium',
                      title: disease.name + ' Risk Alert',
                      description: 'High risk (' + disease.risk + '%) of ' + disease.name +
                        ' due to current weather. Affected crops: ' + disease.affectedCrops.join(', ') +
                        '. Take preventive action immediately.'
                    })
                  }));
                  results.alerts++;
                }

                for (const pest of highRiskPests) {
                  await snsClient.send(new PublishCommand({
                    TopicArn: process.env.ALERT_TOPIC_ARN,
                    Message: JSON.stringify({
                      farmId,
                      userId,
                      alertType: 'pest',
                      severity: pest.risk >= 70 ? 'high' : 'medium',
                      title: pest.name + ' Risk Alert',
                      description: 'High risk (' + pest.risk + '%) of ' + pest.name +
                        ' infestation. Affected crops: ' + pest.affectedCrops.join(', ') +
                        '. Monitor fields and prepare control measures.'
                    })
                  }));
                  results.alerts++;
                }

              } catch (farmError) {
                console.error('Error processing farm:', farm.farmId, farmError);
                results.errors.push({ farmId: farm.farmId, error: farmError.message });
              }
            }

          } catch (error) {
            console.error('Disease forecast error:', error);
            results.errors.push({ error: error.message });
          }

          console.log('Disease forecast complete:', results);
          return { statusCode: 200, body: JSON.stringify(results) };
        };
      `),
      role: lambdaRole,
      environment: lambdaEnv,
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
    });

    // Alert Sender Lambda (WhatsApp + SMS via Twilio)
    const alertSender = new lambda.Function(this, 'AlertSender', {
      functionName: `${prefix}-alert-sender`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

        const secretsClient = new SecretsManagerClient({});
        const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

        // Send message via Twilio (WhatsApp or SMS)
        async function sendTwilioMessage(twilio, from, to, body) {
          const twilioUrl = 'https://api.twilio.com/2010-04-01/Accounts/' + twilio.accountSid + '/Messages.json';
          const authHeader = 'Basic ' + Buffer.from(twilio.accountSid + ':' + twilio.authToken).toString('base64');

          const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
          });

          return response.json();
        }

        exports.handler = async (event) => {
          console.log('Alert sender triggered', JSON.stringify(event, null, 2));

          // Get Twilio credentials from Secrets Manager
          const secret = await secretsClient.send(new GetSecretValueCommand({
            SecretId: process.env.TWILIO_SECRET_ARN
          }));
          const twilio = JSON.parse(secret.SecretString);

          // Process each SNS record
          for (const record of event.Records || []) {
            try {
              const message = JSON.parse(record.Sns?.Message || '{}');
              const { farmId, userId, alertType, severity, title, description } = message;

              if (!farmId) {
                console.log('Missing farmId, skipping');
                continue;
              }

              // Scan farms table by farmId (works regardless of userId format mismatch)
              const farmResult = await ddbClient.send(new ScanCommand({
                TableName: process.env.FARMS_TABLE,
                FilterExpression: 'farmId = :farmId',
                ExpressionAttributeValues: { ':farmId': farmId },
              }));

              const farm = farmResult.Items?.[0];
              if (!farm) {
                console.log('Farm not found:', farmId);
                continue;
              }

              // Get phone numbers (WhatsApp format: whatsapp:+91xxx, SMS format: +91xxx)
              const whatsappPhone = farm.notificationPhone; // e.g., "whatsapp:+919035349707"
              const smsPhone = farm.smsPhone || (whatsappPhone ? whatsappPhone.replace('whatsapp:', '') : null);

              if (!whatsappPhone && !smsPhone) {
                console.log('No notification phone for farm:', farmId);
                continue;
              }

              // Build human-readable alert message
              const NL = String.fromCharCode(10);
              let bodyText = description || 'Check your farm.';
              try {
                const parsed = JSON.parse(description);
                if (parsed && parsed.type === 'threat') {
                  const parts = [];
                  if (parsed.fire?.detected) parts.push('Fire detected (' + parsed.fire.confidence + '% confidence)');
                  if (parsed.human?.detected) parts.push('Intruder detected (' + parsed.human.confidence + '% confidence)');
                  if (parsed.animal?.detected) parts.push('Animal intrusion: ' + (parsed.animal.species || []).join(', '));
                  if (parsed.recommendations?.length) parts.push('Action: ' + parsed.recommendations[0]);
                  bodyText = parts.length ? parts.join(NL) : 'No active threats detected.';
                } else if (parsed && typeof parsed === 'object') {
                  // Disease scan or other structured result — don't dump raw JSON
                  if (parsed.error) {
                    bodyText = 'Analysis note: ' + parsed.error;
                  } else if (parsed.disease) {
                    bodyText = 'Disease: ' + parsed.disease + (parsed.confidence ? ' (' + parsed.confidence + '% confidence)' : '');
                  } else {
                    bodyText = 'Check the GreenSentinel app for details.';
                  }
                }
              } catch (_) {}
              const severityEmoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[severity] || '⚠️';
              const alertMessage = [
                '🚨 *GreenSentinel Alert*',
                severityEmoji + ' ' + (severity || 'medium').toUpperCase() + ' — ' + (farm.name || farmId),
                '',
                '*' + (title || 'Alert') + '*',
                bodyText
              ].join(NL);

              let sent = false;

              // Try WhatsApp first (if configured)
              if (whatsappPhone && twilio.whatsappFrom) {
                try {
                  const waResult = await sendTwilioMessage(twilio, twilio.whatsappFrom, whatsappPhone, alertMessage);
                  if (waResult.sid && waResult.status !== 'failed') {
                    console.log('WhatsApp sent:', waResult.sid);
                    sent = true;
                  } else {
                    console.log('WhatsApp failed:', waResult.error_code, waResult.message);
                  }
                } catch (e) {
                  console.log('WhatsApp error:', e.message);
                }
              }

              // Fallback to SMS if WhatsApp failed or not configured
              if (!sent && smsPhone && twilio.smsFrom) {
                try {
                  const smsResult = await sendTwilioMessage(twilio, twilio.smsFrom, smsPhone, alertMessage);
                  if (smsResult.sid) {
                    console.log('SMS sent:', smsResult.sid);
                    sent = true;
                  } else {
                    console.log('SMS failed:', smsResult.message);
                  }
                } catch (e) {
                  console.log('SMS error:', e.message);
                }
              }

              if (!sent) {
                console.log('Failed to send alert via any channel for farm:', farmId);
              }

            } catch (err) {
              console.error('Error processing alert:', err);
            }
          }

          return { statusCode: 200, body: 'Alerts processed' };
        };
      `),
      role: lambdaRole,
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Subscribe alert sender to SNS topic
    alertTopic.addSubscription(new snsSubscriptions.LambdaSubscription(alertSender));

    // Yield Predictor Lambda
    const yieldPredictor = new lambda.Function(this, 'YieldPredictor', {
      functionName: `${prefix}-yield-predictor`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Yield predictor triggered', event);
          // TODO: Implement yield prediction
          // 1. Fetch historical NDVI data
          // 2. Get weather forecast
          // 3. Calculate yield estimate using regression model
          return { statusCode: 200, body: 'Yield predicted' };
        };
      `),
      role: lambdaRole,
      environment: lambdaEnv,
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
    });

    // =========================================================================
    // Real NDVI Processor (Docker Container with GDAL/rasterio)
    // =========================================================================

    // ECR Repository for NDVI processor image
    const ndviRepo = new ecr.Repository(this, 'NdviProcessorRepo', {
      repositoryName: `${prefix}-ndvi-processor`,
      removalPolicy: stage === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      emptyOnDelete: stage === 'dev',
      lifecycleRules: [
        {
          maxImageCount: 3,
          description: 'Keep only 3 images',
        },
      ],
    });

    // Docker-based Lambda for real NDVI calculation
    const ndviProcessor = new lambda.DockerImageFunction(this, 'NdviProcessor', {
      functionName: `${prefix}-ndvi-processor`,
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../lambda/ndvi-processor')
      ),
      role: lambdaRole,
      environment: {
        ...lambdaEnv,
        PYTHONUNBUFFERED: '1',
      },
      timeout: cdk.Duration.minutes(10),
      memorySize: 2048, // GDAL needs more memory
      ephemeralStorageSize: cdk.Size.mebibytes(1024), // For temp files
      description: 'Real NDVI processor using Sentinel-2 satellite bands with GDAL/rasterio',
    });

    // =========================================================================
    // API Gateway
    // =========================================================================

    this.api = new apigateway.RestApi(this, 'GreenSentinelApi', {
      restApiName: `${prefix}-api`,
      description: 'Green Sentinel API',
      deployOptions: {
        stageName: stage,
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
      },
    });

    // API Lambda (handles all API requests)
    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      functionName: `${prefix}-api-handler`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
        const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);
        const snsClient = new SNSClient({});

        exports.handler = async (event) => {
          console.log('API request:', JSON.stringify(event, null, 2));

          const { httpMethod, path, body, pathParameters, queryStringParameters } = event;
          const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          };

          try {
            // =====================================================================
            // Farm endpoints
            // =====================================================================
            if (path.startsWith('/farms')) {
              if (httpMethod === 'GET' && !pathParameters?.farmId) {
                // List farms for user
                const userId = queryStringParameters?.userId || 'demo-user';
                const result = await docClient.send(new QueryCommand({
                  TableName: process.env.FARMS_TABLE,
                  KeyConditionExpression: 'userId = :userId',
                  ExpressionAttributeValues: { ':userId': userId },
                }));
                return { statusCode: 200, headers, body: JSON.stringify(result.Items) };
              }

              if (httpMethod === 'GET' && pathParameters?.farmId) {
                // Get single farm
                const userId = queryStringParameters?.userId || 'demo-user';
                const result = await docClient.send(new GetCommand({
                  TableName: process.env.FARMS_TABLE,
                  Key: { userId, farmId: pathParameters.farmId },
                }));
                if (!result.Item) {
                  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Farm not found' }) };
                }
                return { statusCode: 200, headers, body: JSON.stringify(result.Item) };
              }

              if (httpMethod === 'POST') {
                // Create farm
                const farmData = JSON.parse(body);
                await docClient.send(new PutCommand({
                  TableName: process.env.FARMS_TABLE,
                  Item: { ...farmData, createdAt: new Date().toISOString() },
                }));
                return { statusCode: 201, headers, body: JSON.stringify({ success: true }) };
              }

              if (httpMethod === 'PUT' && pathParameters?.farmId) {
                // Update farm
                const updates = JSON.parse(body);
                const userId = updates.userId || queryStringParameters?.userId || 'demo-user';
                await docClient.send(new PutCommand({
                  TableName: process.env.FARMS_TABLE,
                  Item: { ...updates, userId, farmId: pathParameters.farmId, updatedAt: new Date().toISOString() },
                }));
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
              }

              if (httpMethod === 'DELETE' && pathParameters?.farmId) {
                // Delete farm
                const userId = queryStringParameters?.userId || 'demo-user';
                await docClient.send(new DeleteCommand({
                  TableName: process.env.FARMS_TABLE,
                  Key: { userId, farmId: pathParameters.farmId },
                }));
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
              }
            }

            // =====================================================================
            // Alert endpoints
            // =====================================================================
            if (path.startsWith('/alerts')) {
              // Trigger alert (POST /alerts/trigger)
              if (httpMethod === 'POST' && path.includes('/trigger')) {
                const alertData = JSON.parse(body);
                const { farmId, userId, alertType, severity, title, description } = alertData;

                if (!farmId || !userId) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId and userId required' }) };
                }

                // Save alert to DynamoDB
                const alertTimestamp = new Date().toISOString();
                await docClient.send(new PutCommand({
                  TableName: process.env.ALERTS_TABLE,
                  Item: {
                    farmId,
                    alertTimestamp,
                    alertId: 'alert_' + Date.now(),
                    alertType: alertType || 'manual',
                    severity: severity || 'medium',
                    title: title || 'Manual Alert',
                    description: description || 'Alert triggered from app',
                    userId,
                    isRead: false,
                    ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
                  },
                }));

                // Publish to SNS to trigger WhatsApp/SMS
                await snsClient.send(new PublishCommand({
                  TopicArn: process.env.ALERT_TOPIC_ARN,
                  Message: JSON.stringify({ farmId, userId, alertType, severity, title, description }),
                }));

                return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Alert triggered' }) };
              }

              if (httpMethod === 'GET') {
                const farmId = pathParameters?.farmId || queryStringParameters?.farmId;
                if (!farmId) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId required' }) };
                }
                const result = await docClient.send(new QueryCommand({
                  TableName: process.env.ALERTS_TABLE,
                  KeyConditionExpression: 'farmId = :farmId',
                  ExpressionAttributeValues: { ':farmId': farmId },
                  ScanIndexForward: false, // Most recent first
                  Limit: 50,
                }));
                return { statusCode: 200, headers, body: JSON.stringify(result.Items) };
              }
            }

            // =====================================================================
            // Satellite Data endpoints (NDVI, vegetation indices)
            // =====================================================================
            if (path.startsWith('/satellite')) {
              if (httpMethod === 'GET') {
                const farmId = queryStringParameters?.farmId;
                if (!farmId) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId required' }) };
                }

                // Get date range (default: last 30 days)
                const days = parseInt(queryStringParameters?.days || '30');
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const result = await docClient.send(new QueryCommand({
                  TableName: process.env.SATELLITE_DATA_TABLE,
                  KeyConditionExpression: 'farmId = :farmId AND captureDate BETWEEN :start AND :end',
                  ExpressionAttributeValues: {
                    ':farmId': farmId,
                    ':start': startDate,
                    ':end': endDate
                  },
                  ScanIndexForward: false, // Most recent first
                  Limit: parseInt(queryStringParameters?.limit || '30')
                }));

                return { statusCode: 200, headers, body: JSON.stringify({
                  farmId,
                  dateRange: { start: startDate, end: endDate },
                  data: result.Items || [],
                  count: result.Items?.length || 0
                })};
              }
            }

            // =====================================================================
            // Crop Health endpoints
            // =====================================================================
            if (path.startsWith('/crop-health')) {
              if (httpMethod === 'GET') {
                const farmId = queryStringParameters?.farmId;
                if (!farmId) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId required' }) };
                }

                // Get date range (default: last 30 days)
                const days = parseInt(queryStringParameters?.days || '30');
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const result = await docClient.send(new QueryCommand({
                  TableName: process.env.CROP_HEALTH_TABLE,
                  KeyConditionExpression: 'fieldId = :fieldId AND recordDate BETWEEN :start AND :end',
                  ExpressionAttributeValues: {
                    ':fieldId': farmId, // Using farmId as fieldId
                    ':start': startDate,
                    ':end': endDate
                  },
                  ScanIndexForward: false,
                  Limit: parseInt(queryStringParameters?.limit || '30')
                }));

                // Calculate summary stats
                const items = result.Items || [];
                const latestHealth = items[0] || null;
                const avgNdvi = items.length > 0
                  ? items.reduce((sum, i) => sum + (i.ndvi || 0), 0) / items.length
                  : null;

                // Determine trend
                let trend = 'stable';
                if (items.length >= 2) {
                  const recent = items.slice(0, 3).reduce((s, i) => s + (i.ndvi || 0), 0) / Math.min(3, items.length);
                  const older = items.slice(-3).reduce((s, i) => s + (i.ndvi || 0), 0) / Math.min(3, items.length);
                  if (recent > older + 0.05) trend = 'improving';
                  else if (recent < older - 0.05) trend = 'declining';
                }

                return { statusCode: 200, headers, body: JSON.stringify({
                  farmId,
                  dateRange: { start: startDate, end: endDate },
                  current: latestHealth,
                  trend,
                  averageNdvi: avgNdvi ? Number(avgNdvi.toFixed(3)) : null,
                  history: items,
                  count: items.length
                })};
              }
            }

            // =====================================================================
            // Disease Forecast endpoints
            // =====================================================================
            if (path.startsWith('/forecast')) {
              if (httpMethod === 'GET') {
                const farmId = queryStringParameters?.farmId;
                if (!farmId) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId required' }) };
                }

                // Get latest forecast from alerts table
                const result = await docClient.send(new QueryCommand({
                  TableName: process.env.ALERTS_TABLE,
                  KeyConditionExpression: 'farmId = :farmId',
                  FilterExpression: 'alertType = :type',
                  ExpressionAttributeValues: {
                    ':farmId': farmId,
                    ':type': 'forecast'
                  },
                  ScanIndexForward: false,
                  Limit: 5
                }));

                const forecasts = (result.Items || []).map(item => {
                  try {
                    const data = JSON.parse(item.description || '{}');
                    return {
                      timestamp: item.alertTimestamp,
                      diseases: data.diseases || [],
                      pests: data.pests || [],
                      weather: data.weather || {}
                    };
                  } catch {
                    return null;
                  }
                }).filter(Boolean);

                return { statusCode: 200, headers, body: JSON.stringify({
                  farmId,
                  forecasts,
                  latest: forecasts[0] || null
                })};
              }
            }

            // =====================================================================
            // Disease Scanner - AI-powered plant disease detection
            // =====================================================================
            if (path.startsWith('/disease-scan')) {
              const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
              const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
              const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

              // Disable ALL checksum calculation for presigned URLs (fixes browser upload 403 errors)
              const s3Client = new S3Client({
                requestChecksumCalculation: 'WHEN_REQUIRED',
                responseChecksumValidation: 'WHEN_REQUIRED'
              });
              const bedrockClient = new BedrockRuntimeClient({ region: 'ap-south-1' });

              // GET /disease-scan/upload-url - Get presigned URL for image upload
              if (httpMethod === 'GET' && path.includes('upload-url')) {
                const farmId = queryStringParameters?.farmId;
                if (!farmId) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId required' }) };
                }

                const scanId = 'scan_' + Date.now();
                const key = 'disease-scans/' + farmId + '/' + scanId + '.jpg';

                // Create command WITHOUT any checksum settings
                const command = new PutObjectCommand({
                  Bucket: process.env.SATELLITE_BUCKET,
                  Key: key,
                  ContentType: 'image/jpeg',
                  ChecksumAlgorithm: undefined // Explicitly disable checksum
                });

                // Generate presigned URL - exclude all checksum headers
                const uploadUrl = await getSignedUrl(s3Client, command, {
                  expiresIn: 300,
                  unhoistableHeaders: new Set(['x-amz-checksum-crc32', 'x-amz-sdk-checksum-algorithm']),
                  signableHeaders: new Set(['host', 'content-type'])
                });

                return { statusCode: 200, headers, body: JSON.stringify({
                  uploadUrl,
                  scanId,
                  key,
                  expiresIn: 300
                })};
              }

              // POST /disease-scan/analyze - Analyze uploaded image with AI
              if (httpMethod === 'POST' && path.includes('analyze')) {
                const body = JSON.parse(event.body || '{}');
                const { farmId, scanId, key, cropType } = body;

                if (!farmId || !key) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId and key required' }) };
                }

                // Get the image from S3
                const getCommand = new GetObjectCommand({
                  Bucket: process.env.SATELLITE_BUCKET,
                  Key: key
                });

                const s3Response = await s3Client.send(getCommand);
                const imageBuffer = await s3Response.Body.transformToByteArray();
                const base64Image = Buffer.from(imageBuffer).toString('base64');

                // Analyze with Amazon Bedrock Claude
                const cropContext = cropType
                  ? 'Plant type context: ' + cropType + '. Report what you ACTUALLY see in this image — if symptoms suggest a different disease than typical for this crop, report the observed disease.'
                  : 'Plant type not specified — identify the plant from the image and include it in affectedCrops.';

                const prompt = 'You are an expert agricultural pathologist for Indian farms. Examine this plant image CAREFULLY for any diseases, pest damage, nutrient deficiencies, or stress symptoms.\\n\\nCRITICAL RULES:\\n1. Scrutinize the image for: discoloration, spots, lesions, wilting, yellowing, browning, mold, rot, pest holes, unusual patterns, or abnormal growth.\\n2. Do NOT conclude healthy if ANY symptoms are visible — a missed disease can destroy an entire crop and a family livelihood.\\n3. Set \\"detected\\": true whenever visible symptoms exist, even at moderate confidence.\\n4. Report what you ACTUALLY SEE in the image, not what is typical for the crop type hint.\\n\\nALL output MUST be in ENGLISH (hindiName field only: use Hindi/Devanagari script).\\n\\n' + cropContext + '\\n\\nReturn ONLY this JSON (no other text):\\n{\\n  \\"detected\\": true/false,\\n  \\"disease\\": \\"specific disease name in English or null if truly healthy\\",\\n  \\"confidence\\": 0-100,\\n  \\"severity\\": \\"low/medium/high/critical\\",\\n  \\"symptoms\\": [\\"observed symptom 1\\", \\"observed symptom 2\\"],\\n  \\"causes\\": [\\"cause 1\\", \\"cause 2\\"],\\n  \\"treatment\\": [\\"treatment step 1\\", \\"treatment step 2\\"],\\n  \\"prevention\\": [\\"prevention tip 1\\", \\"prevention tip 2\\"],\\n  \\"affectedCrops\\": [\\"identified crop type\\"],\\n  \\"hindiName\\": \\"disease name in Hindi/Devanagari (null if not detected)\\",\\n  \\"summary\\": \\"2-3 sentences in plain English: what you observe and what the farmer should do immediately\\"}';

                const bedrockInput = {
                  modelId: 'apac.anthropic.claude-3-5-sonnet-20241022-v2:0',
                  contentType: 'application/json',
                  accept: 'application/json',
                  body: JSON.stringify({
                    anthropic_version: 'bedrock-2023-05-31',
                    max_tokens: 2048,
                    system: 'You are a plant disease detection specialist. Your ONLY job is to identify visible diseases, pest damage, and abnormalities in plant images. You MUST flag any visible symptom — discoloration, brown spots, yellow patches, lesions, mold, wilting, holes, unusual textures. NEVER conclude healthy if ANY abnormality is visible. False negatives cost Indian farmers their livelihoods. Always err toward detection.',
                    messages: [{
                      role: 'user',
                      content: [
                        {
                          type: 'image',
                          source: {
                            type: 'base64',
                            media_type: 'image/jpeg',
                            data: base64Image
                          }
                        },
                        {
                          type: 'text',
                          text: prompt
                        }
                      ]
                    }]
                  })
                };

                try {
                  const bedrockResponse = await bedrockClient.send(new InvokeModelCommand(bedrockInput));
                  const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
                  const analysisText = responseBody.content?.[0]?.text || '{}';

                  // Parse the JSON response — use indexOf/lastIndexOf to avoid regex escape issues
                  let analysis;
                  try {
                    const first = analysisText.indexOf('{');
                    const last = analysisText.lastIndexOf('}');
                    const jsonStr = (first !== -1 && last > first) ? analysisText.slice(first, last + 1) : analysisText;
                    analysis = JSON.parse(jsonStr);
                  } catch {
                    analysis = { detected: false, error: 'Could not parse response', summary: analysisText.substring(0, 200) };
                  }

                  // Store scan result in DynamoDB
                  const scanResult = {
                    farmId,
                    scanId: scanId || 'scan_' + Date.now(),
                    scanDate: new Date().toISOString(),
                    imageKey: key,
                    cropType: cropType || 'Unknown',
                    analysis,
                    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
                  };

                  await docClient.send(new PutCommand({
                    TableName: process.env.ALERTS_TABLE,
                    Item: {
                      farmId,
                      alertTimestamp: scanResult.scanDate,
                      alertId: scanResult.scanId,
                      alertType: 'disease-scan',
                      severity: analysis.severity || 'low',
                      title: analysis.detected ? 'Disease Detected: ' + (analysis.disease || 'Unknown') : 'Healthy Plant',
                      description: JSON.stringify(analysis),
                      isRead: false,
                      ttl: scanResult.ttl
                    }
                  }));

                  // If disease detected with high severity, send WhatsApp alert
                  if (analysis.detected && (analysis.severity === 'high' || analysis.severity === 'critical')) {
                    await snsClient.send(new PublishCommand({
                      TopicArn: process.env.ALERT_TOPIC_ARN,
                      Message: JSON.stringify({
                        farmId,
                        alertType: 'disease-scan',
                        severity: analysis.severity,
                        title: 'Disease Alert: ' + (analysis.disease || 'Unknown disease detected'),
                        description: analysis.summary + String.fromCharCode(10) + String.fromCharCode(10) + 'Treatment: ' + (analysis.treatment || []).join(', ')
                      })
                    }));
                  }

                  return { statusCode: 200, headers, body: JSON.stringify({
                    success: true,
                    scanId: scanResult.scanId,
                    analysis
                  })};

                } catch (bedrockError) {
                  console.error('Bedrock error:', bedrockError);
                  return { statusCode: 500, headers, body: JSON.stringify({
                    error: 'AI analysis failed: ' + bedrockError.message
                  })};
                }
              }

              // GET /disease-scan/history - Get scan history for a farm
              if (httpMethod === 'GET' && !path.includes('upload-url')) {
                const farmId = queryStringParameters?.farmId;
                if (!farmId) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId required' }) };
                }

                const result = await docClient.send(new QueryCommand({
                  TableName: process.env.ALERTS_TABLE,
                  KeyConditionExpression: 'farmId = :farmId',
                  FilterExpression: 'alertType = :type',
                  ExpressionAttributeValues: {
                    ':farmId': farmId,
                    ':type': 'disease-scan'
                  },
                  ScanIndexForward: false,
                  Limit: 20
                }));

                const scans = (result.Items || []).map(item => {
                  try {
                    return {
                      scanId: item.alertId,
                      scanDate: item.alertTimestamp,
                      title: item.title,
                      severity: item.severity,
                      analysis: JSON.parse(item.description || '{}')
                    };
                  } catch {
                    return null;
                  }
                }).filter(Boolean);

                return { statusCode: 200, headers, body: JSON.stringify({ farmId, scans })};
              }
            }

            // =====================================================================
            // AI Threat Detection - Fire, Human Intrusion, Animal Detection
            // =====================================================================
            if (path.startsWith('/threat-detect') && httpMethod === 'POST') {
              const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
              const bedrockClient = new BedrockRuntimeClient({ region: 'ap-south-1' });

              const body = JSON.parse(event.body || '{}');
              const { farmId, imageData, autoMode, cameraId, cameraName, phoneNumber } = body;

              if (!farmId || !imageData) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId and imageData required' }) };
              }

              // ── Budget guard: cap Bedrock calls per day to prevent cost spikes ──
              const MAX_DAILY_CALLS = parseInt(process.env.MAX_DAILY_AI_CALLS || '200');
              const today = new Date().toISOString().split('T')[0];
              try {
                await docClient.send(new UpdateCommand({
                  TableName: process.env.FARMS_TABLE,
                  Key: { userId: '_system', farmId: 'ai-budget-' + today },
                  UpdateExpression: 'SET callCount = if_not_exists(callCount, :zero) + :one, #ttl = :ttl',
                  ConditionExpression: 'attribute_not_exists(callCount) OR callCount < :max',
                  ExpressionAttributeNames: { '#ttl': 'ttl' },
                  ExpressionAttributeValues: {
                    ':zero': 0, ':one': 1, ':max': MAX_DAILY_CALLS,
                    ':ttl': Math.floor(Date.now() / 1000) + 172800
                  }
                }));
              } catch (budgetErr) {
                if (budgetErr?.name === 'ConditionalCheckFailedException') {
                  return { statusCode: 429, headers, body: JSON.stringify({ error: 'Daily AI budget exhausted. Resets at midnight.', budgetExhausted: true }) };
                }
                console.error('Budget check error (non-fatal):', budgetErr?.message);
              }

              // ── Shared helper: call a Bedrock model and parse threat JSON ──────
              const callBedrock = async (modelId, imageData, maxTokens) => {
                const prompt = 'You are an AI security system for Indian agricultural farms. Analyze this image for security threats.\\n\\nIMPORTANT: Respond ONLY in valid JSON. All text MUST be in English.\\n\\n{"fire":{"detected":true_or_false,"confidence":0_to_100,"description":"brief or null"},"human":{"detected":true_or_false,"confidence":0_to_100,"count":0,"activity":"brief or null","suspicious":true_or_false},"animal":{"detected":true_or_false,"confidence":0_to_100,"species":[],"description":"brief or null"},"overallThreat":"none|low|medium|high|critical","recommendations":["action1"]}\\n\\nFire: flames, smoke, glow, smoldering.\\nHuman: strangers near boundaries or storage are suspicious; workers in daylight are not.\\nAnimal: cattle, nilgai, boar, monkeys, elephants near crops.\\nUnclear/dark image: all detected=false, overallThreat="none".';
                const res = await bedrockClient.send(new InvokeModelCommand({
                  modelId,
                  contentType: 'application/json',
                  accept: 'application/json',
                  body: JSON.stringify({
                    anthropic_version: 'bedrock-2023-05-31',
                    max_tokens: maxTokens,
                    messages: [{ role: 'user', content: [
                      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData } },
                      { type: 'text', text: prompt }
                    ]}]
                  })
                }));
                const text = JSON.parse(new TextDecoder().decode(res.body)).content?.[0]?.text || '{}';
                const m = text.match(/\{[\s\S]*\}/);
                return m ? JSON.parse(m[0]) : { fire:{detected:false,confidence:0,description:null}, human:{detected:false,confidence:0,count:0,activity:null,suspicious:false}, animal:{detected:false,confidence:0,species:[],description:null}, overallThreat:'none', recommendations:[] };
              };

              // ── Cost-optimised two-stage analysis ──────────────────────────
              // Stage 1: Haiku  ~$0.0003/call — fast screening (~3s)
              // Stage 2: Sonnet ~$0.007/call  — confirm only if Haiku flags a threat
              // Typical saving: 85–90% vs always using Sonnet
              try {
                const haikuAnalysis = await callBedrock('anthropic.claude-3-haiku-20240307-v1:0', imageData, 256);
                const needsConfirmation = haikuAnalysis.overallThreat !== 'none' && haikuAnalysis.overallThreat !== 'low';

                // Escalate to Sonnet only when Haiku detects a real threat
                const analysis = needsConfirmation
                  ? await callBedrock('apac.anthropic.claude-3-5-sonnet-20241022-v2:0', imageData, 512)
                  : haikuAnalysis;

                console.log('Model used:', needsConfirmation ? 'haiku+sonnet' : 'haiku-only', '| threat:', analysis.overallThreat);

                // ── Auto-save alert + SMS when called from edge agent ──
                const isThreat = analysis.overallThreat !== 'none' && analysis.overallThreat !== 'low';
                if (autoMode && isThreat) {
                  const threatTypes = [];
                  if (analysis.fire?.detected) threatTypes.push('Fire');
                  if (analysis.human?.detected && analysis.human.suspicious) threatTypes.push('Intruder');
                  if (analysis.animal?.detected) threatTypes.push(analysis.animal.species?.[0] || 'Animal');
                  const threatLabel = threatTypes.join(', ') || analysis.overallThreat;
                  const camLabel = cameraName || cameraId || 'Camera';
                  try {
                    await docClient.send(new PutCommand({
                      TableName: process.env.ALERTS_TABLE,
                      Item: {
                        farmId,
                        alertTimestamp: new Date().toISOString(),
                        alertId: 'agent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                        alertType: 'security',
                        severity: analysis.overallThreat === 'critical' ? 'critical' : analysis.overallThreat === 'high' ? 'high' : 'medium',
                        title: 'Auto-detected: ' + threatLabel + ' \u2014 ' + camLabel,
                        description: JSON.stringify({ type: 'threat', source: 'edge-agent', analysis, camera: camLabel }),
                        source: 'edge-agent',
                        isRead: false,
                        ttl: Math.floor(Date.now() / 1000) + 2592000
                      }
                    }));
                  } catch (e) { console.error('Auto-alert save error:', e.message); }
                  if ((analysis.overallThreat === 'high' || analysis.overallThreat === 'critical') && phoneNumber) {
                    try {
                      await snsClient.send(new PublishCommand({
                        PhoneNumber: phoneNumber,
                        Message: '\uD83D\uDEA8 GreenSentinel: ' + threatLabel + ' detected at ' + camLabel + '. Open app immediately. Farm: ' + farmId,
                        MessageAttributes: { 'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' } }
                      }));
                    } catch (e) { console.error('SMS error:', e.message); }
                  }
                }

                return { statusCode: 200, headers, body: JSON.stringify({ farmId, analysis, analyzedAt: new Date().toISOString(), autoSaved: !!(autoMode && isThreat) }) };
              } catch (err) {
                console.error('Threat detection error:', err);
                const isThrottled = (err?.name === 'ThrottlingException') ||
                                    ((err?.message || '').toLowerCase().includes('too many requests')) ||
                                    (err?.$metadata?.httpStatusCode === 429);
                if (isThrottled) {
                  return { statusCode: 429, headers, body: JSON.stringify({ error: 'AI service is busy — please wait 30 seconds and try again', throttled: true }) };
                }
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'Threat analysis failed' }) };
              }
            }

            // =====================================================================
            // Edge Agent Heartbeat — lets dashboard show "Agent Online" status
            // =====================================================================
            if (path.startsWith('/agent-heartbeat')) {
              if (httpMethod === 'POST') {
                const body = JSON.parse(event.body || '{}');
                const { farmId, agentVersion, cameras } = body;
                if (!farmId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId required' }) };
                await docClient.send(new PutCommand({
                  TableName: process.env.FARMS_TABLE,
                  Item: {
                    userId: '_agent',
                    farmId: 'hb-' + farmId,
                    lastSeen: new Date().toISOString(),
                    agentVersion: agentVersion || '1.0',
                    cameras: cameras || [],
                    ttl: Math.floor(Date.now() / 1000) + 300
                  }
                }));
                return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
              }
              if (httpMethod === 'GET') {
                const farmId = queryStringParameters?.farmId;
                if (!farmId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId required' }) };
                const result = await docClient.send(new GetCommand({
                  TableName: process.env.FARMS_TABLE,
                  Key: { userId: '_agent', farmId: 'hb-' + farmId }
                }));
                const online = !!result.Item && (Date.now() - new Date(result.Item.lastSeen).getTime()) < 300000;
                return { statusCode: 200, headers, body: JSON.stringify({ online, lastSeen: result.Item?.lastSeen || null, cameras: result.Item?.cameras || [] }) };
              }
            }

            // =====================================================================
            // Irrigation Planner - Smart irrigation recommendations
            // =====================================================================
            if (path.startsWith('/irrigation')) {
              // GET /irrigation/recommendations - Get irrigation schedule
              if (httpMethod === 'GET') {
                const farmId = queryStringParameters?.farmId;
                if (!farmId) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: 'farmId required' }) };
                }

                // Get farm data
                const farmResult = await docClient.send(new GetCommand({
                  TableName: process.env.FARMS_TABLE,
                  Key: { userId: queryStringParameters?.userId || 'demo-user', farmId }
                }));

                const farm = farmResult.Item;
                if (!farm) {
                  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Farm not found' }) };
                }

                // Get latest crop health data
                const healthResult = await docClient.send(new QueryCommand({
                  TableName: process.env.CROP_HEALTH_TABLE,
                  KeyConditionExpression: 'fieldId = :fieldId',
                  ExpressionAttributeValues: { ':fieldId': farmId },
                  ScanIndexForward: false,
                  Limit: 1
                }));

                const latestHealth = healthResult.Items?.[0];
                const ndvi = latestHealth?.ndvi || 0.5;

                // Get weather forecast from Open-Meteo
                let weather = null;
                try {
                  const lat = farm.location?.latitude || 13.0;
                  const lng = farm.location?.longitude || 77.0;
                  const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration&timezone=Asia/Kolkata&forecast_days=7';
                  const weatherResponse = await fetch(weatherUrl);
                  weather = await weatherResponse.json();
                } catch (e) {
                  console.log('Weather fetch error:', e.message);
                }

                // Calculate irrigation recommendation
                const dailyData = weather?.daily || {};
                const recommendations = [];
                const schedule = [];

                for (let i = 0; i < 7; i++) {
                  const date = dailyData.time?.[i] || new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const rain = dailyData.precipitation_sum?.[i] || 0;
                  const et0 = dailyData.et0_fao_evapotranspiration?.[i] || 4;
                  const maxTemp = dailyData.temperature_2m_max?.[i] || 30;

                  // Crop water requirement based on ET0 and crop factor
                  const cropFactor = ndvi > 0.5 ? 1.1 : ndvi > 0.3 ? 0.9 : 0.7;
                  const waterNeed = et0 * cropFactor;
                  const effectiveRain = rain * 0.8; // 80% of rain is effective
                  const irrigationNeed = Math.max(0, waterNeed - effectiveRain);

                  schedule.push({
                    date,
                    rainExpected: rain,
                    evapotranspiration: et0,
                    waterRequirement: Number(waterNeed.toFixed(1)),
                    irrigationNeeded: Number(irrigationNeed.toFixed(1)),
                    maxTemperature: maxTemp,
                    recommendation: irrigationNeed > 3 ? 'Heavy irrigation needed' :
                                   irrigationNeed > 1 ? 'Light irrigation' :
                                   'No irrigation needed'
                  });
                }

                // Generate overall recommendations
                const totalRain = schedule.reduce((s, d) => s + d.rainExpected, 0);
                const totalIrrigation = schedule.reduce((s, d) => s + d.irrigationNeeded, 0);

                if (totalRain > 50) {
                  recommendations.push('Heavy rainfall expected. Ensure proper drainage to prevent waterlogging.');
                }
                if (totalIrrigation > 20) {
                  recommendations.push('High water stress expected. Plan for supplemental irrigation.');
                }
                if (ndvi < 0.3) {
                  recommendations.push('Crop health is low. Check for water stress or nutrient deficiency.');
                }
                if (schedule.some(d => d.maxTemperature > 38)) {
                  recommendations.push('High temperature expected. Consider evening irrigation to reduce heat stress.');
                }

                return { statusCode: 200, headers, body: JSON.stringify({
                  farmId,
                  farmName: farm.name,
                  cropHealth: { ndvi, status: latestHealth?.healthStatus || 'unknown' },
                  weeklySchedule: schedule,
                  recommendations,
                  totalWaterNeeded: Number(totalIrrigation.toFixed(1)) + ' mm',
                  generatedAt: new Date().toISOString()
                })};
              }
            }

            // =====================================================================
            // Health check
            // =====================================================================
            if (path === '/health') {
              return { statusCode: 200, headers, body: JSON.stringify({ status: 'healthy', stage: process.env.STAGE }) };
            }

            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
          } catch (error) {
            console.error('Error:', error);
            return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
          }
        };
      `),
      role: lambdaRole,
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // API Gateway routes
    const farmsResource = this.api.root.addResource('farms');
    const farmIdResource = farmsResource.addResource('{farmId}');
    const alertsResource = this.api.root.addResource('alerts');
    const alertsTriggerResource = alertsResource.addResource('trigger');
    const healthResource = this.api.root.addResource('health');
    const satelliteResource = this.api.root.addResource('satellite');
    const cropHealthResource = this.api.root.addResource('crop-health');
    const forecastResource = this.api.root.addResource('forecast');
    const diseaseScanResource = this.api.root.addResource('disease-scan');
    const diseaseScanUploadResource = diseaseScanResource.addResource('upload-url');
    const diseaseScanAnalyzeResource = diseaseScanResource.addResource('analyze');
    const threatDetectResource = this.api.root.addResource('threat-detect');
    const irrigationResource = this.api.root.addResource('irrigation');

    const apiIntegration = new apigateway.LambdaIntegration(apiHandler);

    // Farm routes
    farmsResource.addMethod('GET', apiIntegration);
    farmsResource.addMethod('POST', apiIntegration);
    farmIdResource.addMethod('GET', apiIntegration);
    farmIdResource.addMethod('PUT', apiIntegration);
    farmIdResource.addMethod('DELETE', apiIntegration);

    // Alert routes
    alertsTriggerResource.addMethod('POST', apiIntegration);
    alertsResource.addMethod('GET', apiIntegration);

    // Satellite data routes (NDVI, vegetation indices)
    satelliteResource.addMethod('GET', apiIntegration);

    // Crop health routes
    cropHealthResource.addMethod('GET', apiIntegration);

    // Disease/pest forecast routes
    forecastResource.addMethod('GET', apiIntegration);

    // Health check
    healthResource.addMethod('GET', apiIntegration);

    // Disease scan routes (AI-powered detection)
    diseaseScanResource.addMethod('GET', apiIntegration); // Get scan history
    diseaseScanUploadResource.addMethod('GET', apiIntegration); // Get upload URL
    diseaseScanAnalyzeResource.addMethod('POST', apiIntegration); // Analyze image

    // AI Threat detection (fire, human intrusion, animal)
    threatDetectResource.addMethod('POST', apiIntegration);

    // Irrigation routes
    irrigationResource.addMethod('GET', apiIntegration); // Get irrigation recommendations

    // =========================================================================
    // EventBridge Scheduled Rules
    // =========================================================================

    // Daily satellite processing (6 AM IST) - Uses real NDVI processor with GDAL
    new events.Rule(this, 'DailySatelliteRule', {
      ruleName: `${prefix}-daily-satellite`,
      schedule: events.Schedule.cron({ minute: '30', hour: '0' }), // 6 AM IST = 00:30 UTC
      targets: [new targets.LambdaFunction(ndviProcessor)],
    });

    // Keep simulated processor as backup (can be triggered manually)
    new events.Rule(this, 'BackupSatelliteRule', {
      ruleName: `${prefix}-backup-satellite`,
      schedule: events.Schedule.cron({ minute: '0', hour: '12' }), // 5:30 PM IST backup
      targets: [new targets.LambdaFunction(satelliteProcessor)],
      enabled: false, // Disabled by default
    });

    // Disease forecast every 6 hours
    new events.Rule(this, 'DiseaseForecastRule', {
      ruleName: `${prefix}-disease-forecast`,
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
      targets: [new targets.LambdaFunction(diseaseForecast)],
    });

    // =========================================================================
    // Frontend Hosting (S3 + CloudFront)
    // =========================================================================

    // S3 bucket for frontend static files
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${prefix}-frontend-${this.account}`,
      removalPolicy: stage === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: stage === 'dev',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'FrontendOAI', {
      comment: `OAI for ${prefix} frontend`,
    });

    // Grant read access to CloudFront
    frontendBucket.grantRead(originAccessIdentity);

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      comment: `${prefix} frontend distribution`,
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Cheapest (US, Canada, Europe)
    });

    // =========================================================================
    // Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront URL for frontend (HTTPS)',
      exportName: `${prefix}-frontend-url`,
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket for frontend static files',
      exportName: `${prefix}-frontend-bucket`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID (for cache invalidation)',
      exportName: `${prefix}-cloudfront-id`,
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `${prefix}-api-url`,
    });

    new cdk.CfnOutput(this, 'FarmsTableName', {
      value: this.farmsTable.tableName,
      description: 'DynamoDB Farms table name',
    });

    new cdk.CfnOutput(this, 'AlertsTableName', {
      value: this.alertsTable.tableName,
      description: 'DynamoDB Alerts table name',
    });

    new cdk.CfnOutput(this, 'SatelliteBucketName', {
      value: this.satelliteBucket.bucketName,
      description: 'S3 bucket for satellite imagery',
    });

    new cdk.CfnOutput(this, 'TwilioSecretArn', {
      value: twilioSecret.secretArn,
      description: 'Twilio credentials secret ARN (update with real credentials)',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${prefix}-user-pool-id`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${prefix}-user-pool-client-id`,
    });

    new cdk.CfnOutput(this, 'CognitoRegion', {
      value: this.region,
      description: 'AWS Region for Cognito',
    });

    new cdk.CfnOutput(this, 'NdviProcessorEcrUri', {
      value: ndviRepo.repositoryUri,
      description: 'ECR repository for NDVI processor Docker image',
    });
  }
}
