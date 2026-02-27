/**
 * Green Sentinel - DynamoDB Service
 *
 * Handles all DynamoDB operations with proper error handling,
 * retry logic, and type safety.
 */

import {
  DynamoDBClient,
  ReturnConsumedCapacity,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
  BatchGetCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  ThreatDetection,
  HealthScore,
  Farm,
  User,
  Alert,
  AuditLog,
  AuditEventType,
  PaginatedResponse,
} from '@green-sentinel/shared';
import { AWS_RESOURCES, LIMITS } from '@green-sentinel/shared';
import { retryWithBackoff, createCompositeKey, generateId } from '@green-sentinel/shared';

// =============================================================================
// CLIENT SETUP
// =============================================================================

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  maxAttempts: 3,
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// =============================================================================
// THREAT OPERATIONS
// =============================================================================

/**
 * Save a new threat detection record
 */
export async function saveThreat(threat: ThreatDetection): Promise<void> {
  const command = new PutCommand({
    TableName: AWS_RESOURCES.TABLES.THREATS,
    Item: {
      pk: createCompositeKey(threat.farmId, threat.cameraId),
      sk: threat.createdAt,
      ...threat,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days TTL
    },
    ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
  });

  await retryWithBackoff(() => docClient.send(command), 3);
}

/**
 * Get a specific threat by ID
 */
export async function getThreat(
  farmId: string,
  cameraId: string,
  timestamp: string
): Promise<ThreatDetection | null> {
  const command = new GetCommand({
    TableName: AWS_RESOURCES.TABLES.THREATS,
    Key: {
      pk: createCompositeKey(farmId, cameraId),
      sk: timestamp,
    },
  });

  const response = await docClient.send(command);
  return response.Item as ThreatDetection | null;
}

/**
 * Query threats for a farm with pagination
 */
export async function queryThreats(
  farmId: string,
  options: {
    cameraId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    nextToken?: string;
  } = {}
): Promise<PaginatedResponse<ThreatDetection>> {
  const { cameraId, startDate, endDate, limit = 50, nextToken } = options;

  let keyCondition = 'pk = :pk';
  const expressionValues: Record<string, unknown> = {};

  if (cameraId) {
    expressionValues[':pk'] = createCompositeKey(farmId, cameraId);
  } else {
    // Query by farm only using GSI
    keyCondition = 'farmId = :farmId';
    expressionValues[':farmId'] = farmId;
  }

  if (startDate && endDate) {
    keyCondition += ' AND sk BETWEEN :start AND :end';
    expressionValues[':start'] = startDate;
    expressionValues[':end'] = endDate;
  } else if (startDate) {
    keyCondition += ' AND sk >= :start';
    expressionValues[':start'] = startDate;
  } else if (endDate) {
    keyCondition += ' AND sk <= :end';
    expressionValues[':end'] = endDate;
  }

  const command = new QueryCommand({
    TableName: AWS_RESOURCES.TABLES.THREATS,
    IndexName: cameraId ? undefined : 'farmId-index',
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: expressionValues,
    Limit: limit,
    ScanIndexForward: false, // Most recent first
    ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
  });

  const response = await docClient.send(command);
  const items = (response.Items || []) as ThreatDetection[];

  return {
    items,
    hasMore: !!response.LastEvaluatedKey,
    nextToken: response.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
      : undefined,
    totalCount: response.Count,
  };
}

/**
 * Update threat alert status
 */
export async function updateThreatAlertStatus(
  farmId: string,
  cameraId: string,
  timestamp: string,
  status: string,
  latencyMs?: number
): Promise<void> {
  const updateExpr = ['#status = :status', 'alertSent = :sent', 'updatedAt = :now'];
  const exprValues: Record<string, unknown> = {
    ':status': status,
    ':sent': true,
    ':now': new Date().toISOString(),
  };

  if (latencyMs !== undefined) {
    updateExpr.push('latencyMs = :latency');
    exprValues[':latency'] = latencyMs;
  }

  const command = new UpdateCommand({
    TableName: AWS_RESOURCES.TABLES.THREATS,
    Key: {
      pk: createCompositeKey(farmId, cameraId),
      sk: timestamp,
    },
    UpdateExpression: `SET ${updateExpr.join(', ')}`,
    ExpressionAttributeNames: { '#status': 'alertDeliveryStatus' },
    ExpressionAttributeValues: exprValues,
  });

  await docClient.send(command);
}

// =============================================================================
// HEALTH SCORE OPERATIONS
// =============================================================================

/**
 * Save a health score record
 */
export async function saveHealthScore(score: HealthScore): Promise<void> {
  const command = new PutCommand({
    TableName: AWS_RESOURCES.TABLES.HEALTH_SCORES,
    Item: {
      pk: score.farmId,
      sk: score.date,
      ...score,
    },
  });

  await docClient.send(command);
}

/**
 * Get health score for a specific date
 */
export async function getHealthScore(
  farmId: string,
  date: string
): Promise<HealthScore | null> {
  const command = new GetCommand({
    TableName: AWS_RESOURCES.TABLES.HEALTH_SCORES,
    Key: {
      pk: farmId,
      sk: date,
    },
  });

  const response = await docClient.send(command);
  return response.Item as HealthScore | null;
}

/**
 * Get latest health score for a farm
 */
export async function getLatestHealthScore(farmId: string): Promise<HealthScore | null> {
  const command = new QueryCommand({
    TableName: AWS_RESOURCES.TABLES.HEALTH_SCORES,
    KeyConditionExpression: 'pk = :farmId',
    ExpressionAttributeValues: { ':farmId': farmId },
    Limit: 1,
    ScanIndexForward: false,
  });

  const response = await docClient.send(command);
  return (response.Items?.[0] as HealthScore) || null;
}

/**
 * Get health score history for a farm
 */
export async function getHealthScoreHistory(
  farmId: string,
  days: number = 30
): Promise<HealthScore[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const command = new QueryCommand({
    TableName: AWS_RESOURCES.TABLES.HEALTH_SCORES,
    KeyConditionExpression: 'pk = :farmId AND sk BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':farmId': farmId,
      ':start': startDate,
      ':end': endDate,
    },
    ScanIndexForward: true,
  });

  const response = await docClient.send(command);
  return (response.Items || []) as HealthScore[];
}

// =============================================================================
// FARM OPERATIONS
// =============================================================================

/**
 * Save or update a farm
 */
export async function saveFarm(farm: Farm): Promise<void> {
  const command = new PutCommand({
    TableName: AWS_RESOURCES.TABLES.FARMS,
    Item: {
      pk: farm.farmId,
      ...farm,
    },
  });

  await docClient.send(command);
}

/**
 * Get a farm by ID
 */
export async function getFarm(farmId: string): Promise<Farm | null> {
  const command = new GetCommand({
    TableName: AWS_RESOURCES.TABLES.FARMS,
    Key: { pk: farmId },
  });

  const response = await docClient.send(command);
  return response.Item as Farm | null;
}

/**
 * Get all farms for a user
 */
export async function getFarmsByUser(userId: string): Promise<Farm[]> {
  const command = new QueryCommand({
    TableName: AWS_RESOURCES.TABLES.FARMS,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  });

  const response = await docClient.send(command);
  return (response.Items || []) as Farm[];
}

/**
 * Update farm cameras
 */
export async function updateFarmCameras(
  farmId: string,
  cameras: Farm['cameras']
): Promise<void> {
  const command = new UpdateCommand({
    TableName: AWS_RESOURCES.TABLES.FARMS,
    Key: { pk: farmId },
    UpdateExpression: 'SET cameras = :cameras, updatedAt = :now',
    ExpressionAttributeValues: {
      ':cameras': cameras,
      ':now': new Date().toISOString(),
    },
  });

  await docClient.send(command);
}

/**
 * Delete a farm
 */
export async function deleteFarm(farmId: string): Promise<void> {
  const command = new DeleteCommand({
    TableName: AWS_RESOURCES.TABLES.FARMS,
    Key: { pk: farmId },
  });

  await docClient.send(command);
}

// =============================================================================
// USER OPERATIONS
// =============================================================================

/**
 * Save or update a user
 */
export async function saveUser(user: User): Promise<void> {
  const command = new PutCommand({
    TableName: AWS_RESOURCES.TABLES.USERS,
    Item: {
      pk: user.userId,
      ...user,
    },
  });

  await docClient.send(command);
}

/**
 * Get a user by ID
 */
export async function getUser(userId: string): Promise<User | null> {
  const command = new GetCommand({
    TableName: AWS_RESOURCES.TABLES.USERS,
    Key: { pk: userId },
  });

  const response = await docClient.send(command);
  return response.Item as User | null;
}

/**
 * Get user by phone number
 */
export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  const command = new QueryCommand({
    TableName: AWS_RESOURCES.TABLES.USERS,
    IndexName: 'phoneNumber-index',
    KeyConditionExpression: 'phoneNumber = :phone',
    ExpressionAttributeValues: { ':phone': phoneNumber },
    Limit: 1,
  });

  const response = await docClient.send(command);
  return (response.Items?.[0] as User) || null;
}

/**
 * Update user language preference
 */
export async function updateUserLanguage(
  userId: string,
  language: string
): Promise<void> {
  const command = new UpdateCommand({
    TableName: AWS_RESOURCES.TABLES.USERS,
    Key: { pk: userId },
    UpdateExpression: 'SET #lang = :language, updatedAt = :now',
    ExpressionAttributeNames: { '#lang': 'language' },
    ExpressionAttributeValues: {
      ':language': language,
      ':now': new Date().toISOString(),
    },
  });

  await docClient.send(command);
}

// =============================================================================
// ALERT OPERATIONS
// =============================================================================

/**
 * Save an alert
 */
export async function saveAlert(alert: Alert): Promise<void> {
  const command = new PutCommand({
    TableName: AWS_RESOURCES.TABLES.ALERTS,
    Item: {
      pk: alert.userId,
      sk: alert.createdAt,
      ...alert,
      ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days TTL
    },
  });

  await docClient.send(command);
}

/**
 * Get recent alerts for a user
 */
export async function getRecentAlerts(
  userId: string,
  limit: number = 20
): Promise<Alert[]> {
  const command = new QueryCommand({
    TableName: AWS_RESOURCES.TABLES.ALERTS,
    KeyConditionExpression: 'pk = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    Limit: limit,
    ScanIndexForward: false,
  });

  const response = await docClient.send(command);
  return (response.Items || []) as Alert[];
}

/**
 * Update alert delivery status
 */
export async function updateAlertStatus(
  userId: string,
  createdAt: string,
  status: string,
  deliveredAt?: string
): Promise<void> {
  const updateExpr = ['deliveryStatus = :status', 'deliveryAttempts = deliveryAttempts + :one'];
  const exprValues: Record<string, unknown> = {
    ':status': status,
    ':one': 1,
  };

  if (deliveredAt) {
    updateExpr.push('deliveredAt = :delivered');
    exprValues[':delivered'] = deliveredAt;
  }

  updateExpr.push('lastAttemptAt = :now');
  exprValues[':now'] = new Date().toISOString();

  const command = new UpdateCommand({
    TableName: AWS_RESOURCES.TABLES.ALERTS,
    Key: { pk: userId, sk: createdAt },
    UpdateExpression: `SET ${updateExpr.join(', ')}`,
    ExpressionAttributeValues: exprValues,
  });

  await docClient.send(command);
}

// =============================================================================
// AUDIT LOG OPERATIONS
// =============================================================================

/**
 * Log an audit event
 */
export async function logAuditEvent(
  farmId: string,
  eventType: AuditEventType,
  details: Record<string, unknown>,
  status: 'success' | 'failure',
  latencyMs?: number
): Promise<void> {
  const now = new Date().toISOString();
  const log: AuditLog = {
    farmId,
    eventType,
    timestamp: now,
    details,
    status,
    latencyMs,
  };

  const command = new PutCommand({
    TableName: AWS_RESOURCES.TABLES.AUDIT_LOGS,
    Item: {
      pk: createCompositeKey(farmId, eventType),
      sk: now,
      ...log,
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year TTL
    },
  });

  // Fire and forget for audit logs to not block main operations
  docClient.send(command).catch(err => {
    console.error('Failed to write audit log:', err);
  });
}

/**
 * Query audit logs for a farm
 */
export async function queryAuditLogs(
  farmId: string,
  eventType?: AuditEventType,
  options: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<AuditLog[]> {
  const { startDate, endDate, limit = 100 } = options;

  let keyCondition = 'pk = :pk';
  const pk = eventType
    ? createCompositeKey(farmId, eventType)
    : farmId;

  const exprValues: Record<string, unknown> = { ':pk': pk };

  if (startDate && endDate) {
    keyCondition += ' AND sk BETWEEN :start AND :end';
    exprValues[':start'] = startDate;
    exprValues[':end'] = endDate;
  }

  const command = new QueryCommand({
    TableName: AWS_RESOURCES.TABLES.AUDIT_LOGS,
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: exprValues,
    Limit: limit,
    ScanIndexForward: false,
  });

  const response = await docClient.send(command);
  return (response.Items || []) as AuditLog[];
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Batch get multiple farms
 */
export async function batchGetFarms(farmIds: string[]): Promise<Farm[]> {
  if (farmIds.length === 0) return [];

  const chunks = [];
  for (let i = 0; i < farmIds.length; i += LIMITS.API.BATCH_SIZE) {
    chunks.push(farmIds.slice(i, i + LIMITS.API.BATCH_SIZE));
  }

  const results: Farm[] = [];
  for (const chunk of chunks) {
    const command = new BatchGetCommand({
      RequestItems: {
        [AWS_RESOURCES.TABLES.FARMS]: {
          Keys: chunk.map(id => ({ pk: id })),
        },
      },
    });

    const response = await docClient.send(command);
    const items = response.Responses?.[AWS_RESOURCES.TABLES.FARMS] || [];
    results.push(...(items as Farm[]));
  }

  return results;
}

/**
 * Transactional write for related operations
 */
export async function transactionalSaveThreatAndAlert(
  threat: ThreatDetection,
  alert: Alert
): Promise<void> {
  const command = new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: AWS_RESOURCES.TABLES.THREATS,
          Item: {
            pk: createCompositeKey(threat.farmId, threat.cameraId),
            sk: threat.createdAt,
            ...threat,
          },
        },
      },
      {
        Put: {
          TableName: AWS_RESOURCES.TABLES.ALERTS,
          Item: {
            pk: alert.userId,
            sk: alert.createdAt,
            ...alert,
          },
        },
      },
    ],
  });

  await docClient.send(command);
}
