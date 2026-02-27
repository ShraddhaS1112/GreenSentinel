/**
 * Green Sentinel - Yield Prediction Service
 *
 * Predicts crop yields using vegetation indices, weather data,
 * and historical patterns. Uses rule-based model with optional
 * ML enhancement via Amazon SageMaker.
 */

import {
  YieldPrediction,
  YieldComparison,
  YieldFactors,
  YieldFactor,
  YieldTimeline,
  YieldHistory,
  YieldRecord,
  GrowthStage,
  SatelliteAnalysis,
  WeatherData,
  DiseaseAndPestForecast,
} from '@green-sentinel/shared';
import { YIELD_CONFIG, CROP_DETECTION_CONFIG } from '@green-sentinel/shared';

// =============================================================================
// YIELD PREDICTION ENGINE
// =============================================================================

/**
 * Predict yield for a farm based on multiple factors
 */
export async function predictYield(
  farmId: string,
  cropType: string,
  variety: string | undefined,
  sowingDate: string,
  areaHectares: number,
  satellite: SatelliteAnalysis,
  weather: WeatherData,
  forecast: DiseaseAndPestForecast,
  historicalYields?: YieldHistory
): Promise<YieldPrediction> {
  // Get baseline yield for crop
  const baseline = YIELD_CONFIG.BASELINE_YIELDS[cropType as keyof typeof YIELD_CONFIG.BASELINE_YIELDS] ||
    { average: 2000, good: 3000, excellent: 4000 };

  // Calculate factor scores
  const ndviScore = calculateNDVIScore(satellite);
  const weatherScore = calculateWeatherScore(weather);
  const irrigationScore = estimateIrrigationScore(satellite, weather);
  const pestDiseaseScore = calculatePestDiseaseScore(forecast);
  const historicalScore = calculateHistoricalScore(historicalYields);

  // Calculate weighted yield prediction
  const weights = YIELD_CONFIG.FACTOR_WEIGHTS;
  const normalizedScore =
    ndviScore * weights.NDVI +
    weatherScore * weights.WEATHER +
    irrigationScore * weights.IRRIGATION +
    pestDiseaseScore * weights.PEST_DISEASE +
    historicalScore * weights.HISTORICAL +
    50 * weights.SOIL; // Default soil score

  // Convert score to yield (0-100 score maps to average-excellent range)
  const yieldRange = baseline.excellent - baseline.average;
  const predictedYield = baseline.average + (normalizedScore / 100) * yieldRange;

  // Calculate confidence interval
  const confidence = calculateConfidenceInterval(
    predictedYield,
    normalizedScore,
    satellite.indices.ndvi.stdDev
  );

  // Identify factors affecting yield
  const factors = identifyYieldFactors(
    ndviScore,
    weatherScore,
    irrigationScore,
    pestDiseaseScore,
    satellite,
    weather,
    forecast
  );

  // Calculate comparisons
  const comparison = calculateComparisons(
    predictedYield,
    baseline,
    historicalYields
  );

  // Calculate timeline
  const timeline = calculateTimeline(
    cropType,
    sowingDate,
    satellite.healthCategory
  );

  // Generate recommendations
  const recommendations = generateYieldRecommendations(factors, timeline);

  return {
    farmId,
    cropType,
    variety,
    predictedYield: Math.round(predictedYield),
    unit: 'kg/hectare',
    confidence,
    comparison,
    factors,
    timeline,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

// =============================================================================
// FACTOR SCORE CALCULATIONS
// =============================================================================

/**
 * Calculate score based on NDVI and vegetation health
 */
function calculateNDVIScore(satellite: SatelliteAnalysis): number {
  const { indices, healthScore } = satellite;
  const ndvi = indices.ndvi.mean;

  // NDVI contribution (higher is better for vegetative crops)
  let score = 0;

  if (ndvi > 0.6) {
    score = 90 + (ndvi - 0.6) * 25; // 90-100 for NDVI > 0.6
  } else if (ndvi > 0.4) {
    score = 60 + (ndvi - 0.4) * 150; // 60-90 for NDVI 0.4-0.6
  } else if (ndvi > 0.2) {
    score = 30 + (ndvi - 0.2) * 150; // 30-60 for NDVI 0.2-0.4
  } else {
    score = ndvi * 150; // 0-30 for NDVI < 0.2
  }

  // Adjust for uniformity (lower stdDev is better)
  const uniformityBonus = Math.max(0, 10 - indices.ndvi.stdDev * 50);
  score += uniformityBonus;

  // Incorporate overall health score
  score = (score * 0.7) + (healthScore * 0.3);

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate score based on weather conditions
 */
function calculateWeatherScore(weather: WeatherData): number {
  const { daily, agricultural, alerts } = weather;
  let score = 70; // Base score

  // GDD contribution (adequate heat accumulation)
  if (agricultural.gdd > 100) {
    score += 10;
  } else if (agricultural.gdd < 50) {
    score -= 10;
  }

  // Rain/ET balance
  const totalRain = daily.slice(0, 7).reduce((sum, d) => sum + d.precipitation, 0);
  const totalET = agricultural.et0 * 7;
  const waterBalance = totalRain - totalET;

  if (waterBalance > -20 && waterBalance < 50) {
    score += 10; // Good balance
  } else if (waterBalance < -50) {
    score -= 15; // Water deficit
  } else if (waterBalance > 100) {
    score -= 10; // Too much water
  }

  // Penalty for weather alerts
  const alertPenalty = alerts.reduce((penalty, alert) => {
    switch (alert.severity) {
      case 'critical': return penalty + 20;
      case 'high': return penalty + 10;
      case 'medium': return penalty + 5;
      default: return penalty;
    }
  }, 0);

  score -= alertPenalty;

  // Frost risk penalty
  if (agricultural.frostRisk) {
    score -= 15;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Estimate irrigation score from moisture indices
 */
function estimateIrrigationScore(
  satellite: SatelliteAnalysis,
  weather: WeatherData
): number {
  const ndmi = satellite.indices.ndmi.mean;
  const ndwi = satellite.indices.ndwi.mean;

  let score = 70; // Base score

  // NDMI indicates canopy moisture
  if (ndmi > 0.2) {
    score += 20; // Well irrigated
  } else if (ndmi > 0) {
    score += 10; // Adequate
  } else if (ndmi > -0.1) {
    score -= 5; // Mild stress
  } else {
    score -= 20; // Water stress
  }

  // Adjust based on ET and rain forecast
  const upcomingRain = weather.daily.slice(0, 3).reduce((sum, d) => sum + d.precipitation, 0);
  if (upcomingRain > 20) {
    score += 5; // Rain coming
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate score based on pest and disease pressure
 */
function calculatePestDiseaseScore(forecast: DiseaseAndPestForecast): number {
  let score = 100; // Start with perfect score

  // Deduct for disease risks
  for (const disease of forecast.diseases) {
    switch (disease.riskLevel) {
      case 'critical':
        score -= 25;
        break;
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 5;
        break;
    }
  }

  // Deduct for pest risks
  for (const pest of forecast.pests) {
    switch (pest.riskLevel) {
      case 'critical':
        score -= 20;
        break;
      case 'high':
        score -= 12;
        break;
      case 'medium':
        score -= 4;
        break;
    }
  }

  return Math.max(0, score);
}

/**
 * Calculate score based on historical performance
 */
function calculateHistoricalScore(history?: YieldHistory): number {
  if (!history || history.records.length === 0) {
    return 50; // Neutral score if no history
  }

  let score = 50;

  // Trend analysis
  switch (history.trend) {
    case 'improving':
      score += 20;
      break;
    case 'stable':
      score += 10;
      break;
    case 'declining':
      score -= 10;
      break;
  }

  // Recent performance vs average
  const recentRecords = history.records.slice(-3);
  const recentAvg = recentRecords.reduce((sum, r) => sum + r.yield, 0) / recentRecords.length;

  if (recentAvg > history.averageYield * 1.1) {
    score += 15;
  } else if (recentAvg < history.averageYield * 0.9) {
    score -= 15;
  }

  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// CONFIDENCE & COMPARISON
// =============================================================================

/**
 * Calculate confidence interval for prediction
 */
function calculateConfidenceInterval(
  predictedYield: number,
  normalizedScore: number,
  ndviStdDev: number
): YieldPrediction['confidence'] {
  // Higher confidence when:
  // - Score is high (conditions are good)
  // - NDVI variation is low (uniform crop)

  const baseVariation = 0.15; // 15% base variation
  const scoreVariation = (100 - normalizedScore) / 500; // Up to 20% more variation for low scores
  const uniformityVariation = ndviStdDev * 0.5; // Up to 10% more for high variation

  const totalVariation = baseVariation + scoreVariation + uniformityVariation;

  const low = Math.round(predictedYield * (1 - totalVariation));
  const high = Math.round(predictedYield * (1 + totalVariation));
  const percentage = Math.round((1 - totalVariation) * 100);

  return { low, high, percentage };
}

/**
 * Calculate yield comparisons
 */
function calculateComparisons(
  predicted: number,
  baseline: { average: number; good: number; excellent: number },
  history?: YieldHistory
): YieldComparison {
  const lastYearYield = history?.records[history.records.length - 1]?.yield || baseline.average;
  const personalBest = history?.bestYield || baseline.good;
  const personalBestYear = history?.bestYear || new Date().getFullYear() - 1;

  const lastYearDelta = Math.round(((predicted - lastYearYield) / lastYearYield) * 100);
  const regionalDelta = Math.round(((predicted - baseline.average) / baseline.average) * 100);

  // National average (rough estimate)
  const nationalAverage = baseline.average * 0.8;

  return {
    lastYear: lastYearYield,
    lastYearDelta,
    regionalAverage: baseline.average,
    regionalDelta,
    nationalAverage: Math.round(nationalAverage),
    personalBest,
    personalBestYear,
  };
}

// =============================================================================
// FACTOR IDENTIFICATION
// =============================================================================

/**
 * Identify positive and negative factors affecting yield
 */
function identifyYieldFactors(
  ndviScore: number,
  weatherScore: number,
  irrigationScore: number,
  pestDiseaseScore: number,
  satellite: SatelliteAnalysis,
  weather: WeatherData,
  forecast: DiseaseAndPestForecast
): YieldFactors {
  const positive: YieldFactor[] = [];
  const negative: YieldFactor[] = [];
  const neutral: YieldFactor[] = [];

  // NDVI factors
  if (ndviScore > 70) {
    positive.push({
      factor: 'Healthy Vegetation',
      impact: Math.round((ndviScore - 70) / 3),
      description: `Strong NDVI readings (${satellite.indices.ndvi.mean.toFixed(2)}) indicate healthy crop growth`,
      actionable: false,
    });
  } else if (ndviScore < 50) {
    negative.push({
      factor: 'Poor Vegetation Health',
      impact: -Math.round((50 - ndviScore) / 3),
      description: `Low NDVI (${satellite.indices.ndvi.mean.toFixed(2)}) indicates stressed or sparse vegetation`,
      actionable: true,
      recommendation: 'Check for nutrient deficiency, water stress, or disease',
    });
  }

  // Weather factors
  if (weatherScore > 70) {
    positive.push({
      factor: 'Favorable Weather',
      impact: Math.round((weatherScore - 70) / 4),
      description: 'Weather conditions are conducive to good crop growth',
      actionable: false,
    });
  } else if (weatherScore < 50) {
    negative.push({
      factor: 'Unfavorable Weather',
      impact: -Math.round((50 - weatherScore) / 4),
      description: 'Weather conditions are challenging for crop growth',
      actionable: false,
    });
  }

  // Weather alerts
  if (weather.agricultural.frostRisk) {
    negative.push({
      factor: 'Frost Risk',
      impact: -15,
      description: 'Frost warning in the forecast could damage crops',
      actionable: true,
      recommendation: 'Cover sensitive crops, avoid irrigation at night',
    });
  }

  // Irrigation factors
  if (irrigationScore > 70) {
    positive.push({
      factor: 'Good Moisture Levels',
      impact: Math.round((irrigationScore - 70) / 5),
      description: 'Satellite moisture indices show adequate water availability',
      actionable: false,
    });
  } else if (irrigationScore < 50) {
    negative.push({
      factor: 'Water Stress',
      impact: -Math.round((50 - irrigationScore) / 4),
      description: 'Low moisture indices indicate water stress',
      actionable: true,
      recommendation: 'Increase irrigation frequency, check for irrigation system issues',
    });
  }

  // Pest & Disease factors
  const highRiskDiseases = forecast.diseases.filter(d =>
    d.riskLevel === 'high' || d.riskLevel === 'critical'
  );
  const highRiskPests = forecast.pests.filter(p =>
    p.riskLevel === 'high' || p.riskLevel === 'critical'
  );

  if (highRiskDiseases.length > 0) {
    negative.push({
      factor: 'Disease Pressure',
      impact: -10 * highRiskDiseases.length,
      description: `High risk of ${highRiskDiseases.map(d => d.name).join(', ')}`,
      actionable: true,
      recommendation: highRiskDiseases[0]?.preventiveActions[0] || 'Apply preventive treatment',
    });
  }

  if (highRiskPests.length > 0) {
    negative.push({
      factor: 'Pest Pressure',
      impact: -8 * highRiskPests.length,
      description: `High risk of ${highRiskPests.map(p => p.name).join(', ')}`,
      actionable: true,
      recommendation: highRiskPests[0]?.controlMeasures[0]?.description || 'Scout and treat if needed',
    });
  }

  if (pestDiseaseScore > 80) {
    positive.push({
      factor: 'Low Pest/Disease Pressure',
      impact: 5,
      description: 'No significant pest or disease threats detected',
      actionable: false,
    });
  }

  // Rainfall factor
  const weeklyRain = weather.daily.slice(0, 7).reduce((sum, d) => sum + d.precipitation, 0);
  if (weeklyRain > 20 && weeklyRain < 100) {
    positive.push({
      factor: 'Adequate Rainfall',
      impact: 5,
      description: `Recent/expected rainfall (${weeklyRain.toFixed(0)}mm) is beneficial`,
      actionable: false,
    });
  } else if (weeklyRain > 150) {
    negative.push({
      factor: 'Excessive Rainfall',
      impact: -10,
      description: `Heavy rainfall (${weeklyRain.toFixed(0)}mm) may cause waterlogging`,
      actionable: true,
      recommendation: 'Ensure proper drainage, watch for root diseases',
    });
  }

  return { positive, negative, neutral };
}

// =============================================================================
// TIMELINE CALCULATION
// =============================================================================

/**
 * Calculate crop growth timeline
 */
function calculateTimeline(
  cropType: string,
  sowingDate: string,
  currentHealth: string
): YieldTimeline {
  const sowing = new Date(sowingDate);
  const now = new Date();
  const daysSinceSowing = Math.floor((now.getTime() - sowing.getTime()) / (1000 * 60 * 60 * 24));

  // Get growth duration for crop
  const durations = YIELD_CONFIG.GROWTH_DURATION[cropType as keyof typeof YIELD_CONFIG.GROWTH_DURATION] as Record<string, number> | undefined;
  const totalDuration = durations?.kharif || durations?.rabi || durations?.annual || durations?.any || 120;

  // Determine current growth stage based on days
  const stages = CROP_DETECTION_CONFIG.GROWTH_STAGES;
  let currentStage = GrowthStage.GERMINATION;
  let accumulatedDays = 0;
  let daysInCurrentStage = 0;
  let expectedNextStage = '';
  let daysToNextStage = 0;

  const stageOrder: GrowthStage[] = [
    GrowthStage.GERMINATION,
    GrowthStage.SEEDLING,
    GrowthStage.VEGETATIVE,
    GrowthStage.FLOWERING,
    GrowthStage.FRUIT_DEVELOPMENT,
    GrowthStage.MATURITY,
    GrowthStage.HARVEST_READY,
  ];

  for (let i = 0; i < stageOrder.length; i++) {
    const stage = stageOrder[i]!;
    const stageConfig = stages[stage];
    const stageDuration = stageConfig?.durationDays || 15;

    if (daysSinceSowing < accumulatedDays + stageDuration) {
      currentStage = stage;
      daysInCurrentStage = daysSinceSowing - accumulatedDays;
      daysToNextStage = stageDuration - daysInCurrentStage;
      expectedNextStage = stageOrder[i + 1] || 'Harvest';
      break;
    }

    accumulatedDays += stageDuration;
  }

  // Calculate expected harvest date
  const harvestDate = new Date(sowing);
  harvestDate.setDate(harvestDate.getDate() + totalDuration);

  const daysToHarvest = Math.max(0, Math.floor((harvestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate stage progress
  const stageProgress = stages[currentStage]?.durationDays
    ? Math.round((daysInCurrentStage / stages[currentStage]!.durationDays) * 100)
    : 50;

  return {
    sowingDate,
    currentStage,
    expectedHarvestDate: harvestDate.toISOString().split('T')[0]!,
    daysToHarvest,
    stageProgress,
  };
}

// =============================================================================
// RECOMMENDATIONS
// =============================================================================

/**
 * Generate yield improvement recommendations
 */
function generateYieldRecommendations(
  factors: YieldFactors,
  timeline: YieldTimeline
): string[] {
  const recommendations: string[] = [];

  // Add recommendations from negative factors
  for (const factor of factors.negative) {
    if (factor.actionable && factor.recommendation) {
      recommendations.push(factor.recommendation);
    }
  }

  // Stage-specific recommendations
  switch (timeline.currentStage) {
    case GrowthStage.VEGETATIVE:
      recommendations.push('Ensure adequate nitrogen for vegetative growth');
      break;
    case GrowthStage.FLOWERING:
      recommendations.push('Avoid water stress during flowering for better fruit set');
      recommendations.push('Consider foliar micronutrient spray');
      break;
    case GrowthStage.FRUIT_DEVELOPMENT:
      recommendations.push('Maintain consistent irrigation for fruit development');
      recommendations.push('Monitor for fruit pests');
      break;
    case GrowthStage.MATURITY:
      recommendations.push('Reduce irrigation as crop approaches maturity');
      recommendations.push('Plan harvest logistics');
      break;
  }

  // General recommendations if nothing critical
  if (recommendations.length === 0) {
    recommendations.push('Continue current management practices');
    recommendations.push('Regular scouting for early pest/disease detection');
  }

  // Limit to top 5 recommendations
  return recommendations.slice(0, 5);
}

// =============================================================================
// HISTORICAL ANALYSIS
// =============================================================================

/**
 * Analyze historical yield data
 */
export function analyzeYieldHistory(records: YieldRecord[]): YieldHistory {
  if (records.length === 0) {
    return {
      farmId: '',
      records: [],
      averageYield: 0,
      bestYield: 0,
      bestYear: 0,
      trend: 'stable',
    };
  }

  const yields = records.map(r => r.yield);
  const averageYield = Math.round(yields.reduce((a, b) => a + b, 0) / yields.length);
  const bestYield = Math.max(...yields);
  const bestRecord = records.find(r => r.yield === bestYield);
  const bestYear = bestRecord?.year || new Date().getFullYear();

  // Calculate trend
  let trend: YieldHistory['trend'] = 'stable';
  if (records.length >= 3) {
    const firstHalf = records.slice(0, Math.floor(records.length / 2));
    const secondHalf = records.slice(Math.floor(records.length / 2));

    const firstAvg = firstHalf.reduce((sum, r) => sum + r.yield, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.yield, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.1) trend = 'improving';
    else if (secondAvg < firstAvg * 0.9) trend = 'declining';
  }

  return {
    farmId: records[0]?.year?.toString() || '',
    records,
    averageYield,
    bestYield,
    bestYear,
    trend,
  };
}
