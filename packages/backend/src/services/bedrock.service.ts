/**
 * Green Sentinel - Amazon Bedrock Service
 *
 * Handles AI vision analysis using Claude 3.5 Sonnet for threat detection.
 * Implements proper error handling, timeout management, and response parsing.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';
import { ThreatScores, AnalysisMetadata } from '@green-sentinel/shared';
import { AI_CONFIG, LIMITS } from '@green-sentinel/shared';

// =============================================================================
// CLIENT SETUP
// =============================================================================

const bedrockClient = new BedrockRuntimeClient({
  region: AI_CONFIG.BEDROCK.REGION,
});

// =============================================================================
// TYPES
// =============================================================================

export interface ThreatAnalysisResult {
  scores: ThreatScores;
  metadata: AnalysisMetadata;
  rawResponse: string;
}

export interface AnalysisError {
  code: string;
  message: string;
  retryable: boolean;
}

// =============================================================================
// THREAT ANALYSIS
// =============================================================================

/**
 * Analyze a camera frame for threats using Claude 3.5 Sonnet
 */
export async function analyzeFrameForThreats(
  frameBuffer: Buffer,
  options: {
    farmContext?: string;
    timeOfDay?: 'day' | 'night';
  } = {}
): Promise<ThreatAnalysisResult> {
  const startTime = Date.now();

  // Build the prompt with optional context
  let prompt = AI_CONFIG.BEDROCK.THREAT_ANALYSIS_PROMPT;
  if (options.farmContext) {
    prompt += `\n\nAdditional context: ${options.farmContext}`;
  }
  if (options.timeOfDay === 'night') {
    prompt += '\n\nNote: This is a night-time capture. Adjust your analysis for low-light conditions.';
  }

  // Convert frame to base64
  const base64Frame = frameBuffer.toString('base64');
  const mediaType = detectImageMediaType(frameBuffer);

  // Build Claude messages API request
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: AI_CONFIG.BEDROCK.MAX_TOKENS,
    temperature: AI_CONFIG.BEDROCK.TEMPERATURE,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Frame,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  };

  try {
    const command = new InvokeModelCommand({
      modelId: AI_CONFIG.BEDROCK.MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    // Set timeout for the request
    const response = await Promise.race([
      bedrockClient.send(command),
      createTimeout(LIMITS.LATENCY.FRAME_ANALYSIS),
    ]) as InvokeModelCommandOutput;

    const analysisTimeMs = Date.now() - startTime;

    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const rawResponse = responseBody.content?.[0]?.text || '';

    // Extract scores from response
    const scores = parseScoresFromResponse(rawResponse);

    return {
      scores,
      metadata: {
        modelId: AI_CONFIG.BEDROCK.MODEL_ID,
        modelVersion: 'claude-3-5-sonnet',
        analysisTimeMs,
        allScores: scores,
        rawResponse,
      },
      rawResponse,
    };
  } catch (error) {
    const analysisError = handleBedrockError(error);
    throw new Error(`Threat analysis failed: ${analysisError.message}`);
  }
}

/**
 * Parse threat scores from Claude's response
 */
function parseScoresFromResponse(response: string): ThreatScores {
  // Default scores if parsing fails
  const defaultScores: ThreatScores = {
    fire: 0,
    human: 0,
    animal: 0,
  };

  try {
    // Try to extract JSON from the response
    // Claude might return just JSON or JSON with some text
    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in response, using defaults');
      return defaultScores;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and clamp scores to 0-100
    return {
      fire: clampScore(parsed.fire ?? 0),
      human: clampScore(parsed.human ?? parsed.humans ?? 0),
      animal: clampScore(parsed.animal ?? parsed.animals ?? 0),
    };
  } catch (error) {
    console.error('Failed to parse scores from response:', error);
    console.error('Raw response:', response);

    // Try alternative parsing for natural language responses
    return parseScoresFromText(response);
  }
}

/**
 * Fallback parser for natural language responses
 */
function parseScoresFromText(text: string): ThreatScores {
  const scores: ThreatScores = {
    fire: 0,
    human: 0,
    animal: 0,
  };

  const lowerText = text.toLowerCase();

  // Look for percentage patterns
  const fireMatch = lowerText.match(/fire[:\s]*(\d+)%?/);
  const humanMatch = lowerText.match(/human[s]?[:\s]*(\d+)%?/);
  const animalMatch = lowerText.match(/animal[s]?[:\s]*(\d+)%?/);

  if (fireMatch?.[1]) scores.fire = clampScore(parseInt(fireMatch[1], 10));
  if (humanMatch?.[1]) scores.human = clampScore(parseInt(humanMatch[1], 10));
  if (animalMatch?.[1]) scores.animal = clampScore(parseInt(animalMatch[1], 10));

  return scores;
}

/**
 * Clamp score to valid range 0-100
 */
function clampScore(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Detect image media type from buffer
 */
function detectImageMediaType(buffer: Buffer): string {
  // Check magic bytes
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  // Default to JPEG for camera frames
  return 'image/jpeg';
}

/**
 * Create a timeout promise
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Analysis timeout after ${ms}ms`));
    }, ms);
  });
}

/**
 * Handle Bedrock-specific errors
 */
function handleBedrockError(error: unknown): AnalysisError {
  const err = error as Error & { name?: string; $metadata?: { httpStatusCode?: number } };

  // Timeout error
  if (err.message?.includes('timeout')) {
    return {
      code: 'TIMEOUT',
      message: 'Analysis timed out. The frame may be too complex or the service is slow.',
      retryable: true,
    };
  }

  // Rate limiting
  if (err.name === 'ThrottlingException' || err.$metadata?.httpStatusCode === 429) {
    return {
      code: 'THROTTLED',
      message: 'Request was throttled. Please try again later.',
      retryable: true,
    };
  }

  // Service unavailable
  if (err.$metadata?.httpStatusCode === 503) {
    return {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Bedrock service is temporarily unavailable.',
      retryable: true,
    };
  }

  // Model not found or access denied
  if (err.name === 'AccessDeniedException') {
    return {
      code: 'ACCESS_DENIED',
      message: 'Access to the AI model is denied. Check IAM permissions.',
      retryable: false,
    };
  }

  // Validation error
  if (err.name === 'ValidationException') {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request format or image data.',
      retryable: false,
    };
  }

  // Generic error
  return {
    code: 'UNKNOWN',
    message: err.message || 'An unknown error occurred during analysis.',
    retryable: true,
  };
}

// =============================================================================
// BATCH ANALYSIS (for processing multiple frames)
// =============================================================================

/**
 * Analyze multiple frames in sequence with rate limiting
 */
export async function analyzeMultipleFrames(
  frames: Array<{ id: string; buffer: Buffer }>,
  delayBetweenMs: number = 500
): Promise<Map<string, ThreatAnalysisResult | Error>> {
  const results = new Map<string, ThreatAnalysisResult | Error>();

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame) continue;

    try {
      const result = await analyzeFrameForThreats(frame.buffer);
      results.set(frame.id, result);
    } catch (error) {
      results.set(frame.id, error as Error);
    }

    // Add delay between requests to avoid throttling
    if (i < frames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenMs));
    }
  }

  return results;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Check if Bedrock service is available
 */
export async function checkBedrockHealth(): Promise<{
  available: boolean;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Create a minimal test request
    // Using a tiny 1x1 white pixel JPEG
    const testPixel = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==',
      'base64'
    );

    await analyzeFrameForThreats(testPixel);
    const latencyMs = Date.now() - startTime;

    return { available: true, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      available: false,
      latencyMs,
      error: (error as Error).message,
    };
  }
}
