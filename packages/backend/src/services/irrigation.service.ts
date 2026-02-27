/**
 * Green Sentinel - Irrigation Modeling Service
 *
 * Smart irrigation recommendations based on soil moisture estimation,
 * weather data, crop coefficients, and water balance calculations.
 */

import {
  IrrigationRecommendation,
  SoilMoistureData,
  WaterBalance,
  IrrigationAction,
  IrrigationZone,
  IrrigationSchedule,
  WaterSavings,
  GrowthStage,
  WeatherData,
} from '@green-sentinel/shared';
import { IRRIGATION_CONFIG } from '@green-sentinel/shared';
import { getWeather, getHistoricalWeather } from './weather-free.service';

// =============================================================================
// SOIL MOISTURE ESTIMATION
// =============================================================================

/**
 * Estimate soil moisture based on weather, irrigation, and crop water use
 * In production, this would integrate with soil sensors via AWS IoT Core
 */
export function estimateSoilMoisture(
  soilType: keyof typeof IRRIGATION_CONFIG.SOIL_TYPES,
  recentRainfall: number,      // mm in last 7 days
  recentIrrigation: number,    // mm applied in last 7 days
  et0: number,                 // daily ET in mm
  cropKc: number,              // crop coefficient
  daysSinceLastWatering: number
): SoilMoistureData {
  const soilProps = IRRIGATION_CONFIG.SOIL_TYPES[soilType] || IRRIGATION_CONFIG.SOIL_TYPES.loam;
  const { fieldCapacity, wiltingPoint } = soilProps;

  // Calculate water input
  const waterInput = recentRainfall + recentIrrigation;

  // Calculate crop water use (ETc)
  const cropWaterUse = et0 * cropKc * daysSinceLastWatering;

  // Estimate current moisture (simplified model)
  // Start from field capacity after irrigation, subtract water use
  const availableWater = fieldCapacity - wiltingPoint;
  const waterDeficit = Math.max(0, cropWaterUse - waterInput);
  const moistureDepletion = (waterDeficit / availableWater) * 100;

  let currentMoisture = fieldCapacity - (moistureDepletion * availableWater / 100);
  currentMoisture = Math.max(wiltingPoint, Math.min(fieldCapacity, currentMoisture));

  // Determine status
  const thresholds = IRRIGATION_CONFIG.THRESHOLDS;
  const moisturePercent = ((currentMoisture - wiltingPoint) / availableWater) * 100;

  let status: SoilMoistureData['status'];
  if (currentMoisture > fieldCapacity * 0.95) {
    status = 'waterlogged';
  } else if (moisturePercent >= thresholds.ADEQUATE) {
    status = 'adequate';
  } else if (moisturePercent >= thresholds.SEVERE_STRESS) {
    status = 'moderate_stress';
  } else {
    status = 'severe_stress';
  }

  // Calculate optimal range
  const optimalMin = wiltingPoint + (availableWater * thresholds.MODERATE_STRESS / 100);
  const optimalMax = fieldCapacity * 0.9; // Leave room before saturation

  return {
    current: Math.round(currentMoisture * 10) / 10,
    fieldCapacity,
    wiltingPoint,
    optimalRange: {
      min: Math.round(optimalMin * 10) / 10,
      max: Math.round(optimalMax * 10) / 10,
    },
    status,
  };
}

// =============================================================================
// WATER BALANCE CALCULATION
// =============================================================================

/**
 * Calculate water balance for a farm
 */
export function calculateWaterBalance(
  rainfall7Days: number,
  irrigation7Days: number,
  et0Daily: number,
  cropKc: number,
  soilMoisture: SoilMoistureData
): WaterBalance {
  // Calculate evapotranspiration over 7 days
  const etTotal = et0Daily * cropKc * 7;

  // Calculate deficit/surplus
  const netWater = rainfall7Days + irrigation7Days - etTotal;

  const deficit = netWater < 0 ? Math.abs(netWater) : 0;
  const surplus = netWater > 0 ? netWater : 0;

  // Adjust based on current soil moisture
  const moistureDeficit = soilMoisture.optimalRange.min - soilMoisture.current;
  const actualDeficit = Math.max(deficit, moistureDeficit > 0 ? moistureDeficit * 10 : 0);

  return {
    rainfall: Math.round(rainfall7Days * 10) / 10,
    irrigation: Math.round(irrigation7Days * 10) / 10,
    evapotranspiration: Math.round(etTotal * 10) / 10,
    deficit: Math.round(actualDeficit * 10) / 10,
    surplus: Math.round(surplus * 10) / 10,
  };
}

// =============================================================================
// IRRIGATION RECOMMENDATION
// =============================================================================

/**
 * Generate irrigation recommendation
 */
export function generateIrrigationAction(
  soilMoisture: SoilMoistureData,
  waterBalance: WaterBalance,
  upcomingRain: number,       // Expected rain in next 48 hours
  rainProbability: number,    // Probability of rain (0-100)
  areaHectares: number
): IrrigationAction {
  const { status, current, fieldCapacity, wiltingPoint } = soilMoisture;
  const availableWater = fieldCapacity - wiltingPoint;

  // Check if rain is expected
  if (rainProbability > 70 && upcomingRain > 10) {
    return {
      action: 'skip_rain_expected',
      waterNeeded: 0,
      duration: 0,
      optimalTime: '',
      reason: `Rain expected (${upcomingRain}mm with ${rainProbability}% probability)`,
      priority: 5,
    };
  }

  // Calculate water needed to reach optimal moisture
  const targetMoisture = soilMoisture.optimalRange.max;
  const waterNeededMm = Math.max(0, targetMoisture - current) * 10; // Convert to mm
  const waterNeededLiters = waterNeededMm * areaHectares * 10; // 1mm = 10L/m² = 10000L/ha

  // Determine action based on soil moisture status
  let action: IrrigationAction['action'];
  let priority: number;
  let reason: string;

  switch (status) {
    case 'severe_stress':
      action = 'irrigate_now';
      priority = 1;
      reason = 'Soil moisture critically low - crops under severe stress';
      break;
    case 'moderate_stress':
      action = 'irrigate_soon';
      priority = 2;
      reason = 'Soil moisture below optimal - irrigate within 24 hours';
      break;
    case 'adequate':
      if (waterBalance.deficit > 10) {
        action = 'irrigate_soon';
        priority = 3;
        reason = 'Water balance shows deficit - plan irrigation';
      } else {
        action = 'wait';
        priority = 4;
        reason = 'Soil moisture adequate - monitor conditions';
      }
      break;
    case 'waterlogged':
      action = 'wait';
      priority = 5;
      reason = 'Soil saturated - ensure proper drainage';
      break;
    default:
      action = 'wait';
      priority = 4;
      reason = 'Continue monitoring';
  }

  // Calculate duration (assuming typical drip flow rate of 4 L/hr per emitter)
  // This is simplified - actual calculation depends on irrigation system
  const flowRateLitersPerHour = areaHectares * 4000; // Rough estimate
  const durationMinutes = (waterNeededLiters / flowRateLitersPerHour) * 60;

  // Determine optimal time
  const now = new Date();
  const hour = now.getHours();
  let optimalHour: number;

  if (hour >= 6 && hour < 9) {
    optimalHour = hour; // Already in morning window
  } else if (hour >= 17 && hour < 19) {
    optimalHour = hour; // Already in evening window
  } else if (hour < 6) {
    optimalHour = 6; // Next morning
  } else if (hour < 17) {
    optimalHour = 17; // This evening
  } else {
    optimalHour = 6; // Tomorrow morning
  }

  const optimalTime = `${optimalHour.toString().padStart(2, '0')}:00`;

  return {
    action,
    waterNeeded: Math.round(waterNeededLiters),
    duration: Math.round(durationMinutes),
    optimalTime,
    reason,
    priority,
  };
}

// =============================================================================
// ZONE-BASED RECOMMENDATIONS
// =============================================================================

/**
 * Generate zone-based irrigation recommendations
 */
export function generateZoneRecommendations(
  zones: { zoneId: string; zoneName: string; ndmi: number }[],
  soilType: keyof typeof IRRIGATION_CONFIG.SOIL_TYPES,
  et0: number,
  cropKc: number
): IrrigationZone[] {
  return zones.map((zone, index) => {
    // Estimate stress level from NDMI
    // NDMI < 0 indicates water stress
    let stressLevel: IrrigationZone['stressLevel'];
    if (zone.ndmi < -0.2) {
      stressLevel = 'severe';
    } else if (zone.ndmi < 0) {
      stressLevel = 'moderate';
    } else if (zone.ndmi < 0.1) {
      stressLevel = 'mild';
    } else {
      stressLevel = 'none';
    }

    // Calculate priority based on stress
    const stressPriority: Record<IrrigationZone['stressLevel'], number> = {
      severe: 1,
      moderate: 2,
      mild: 3,
      none: 4,
    };

    // Estimate water needed based on stress and ET
    const stressMultiplier: Record<IrrigationZone['stressLevel'], number> = {
      severe: 1.5,
      moderate: 1.0,
      mild: 0.5,
      none: 0,
    };

    const waterNeeded = et0 * cropKc * stressMultiplier[stressLevel] * 10000; // L/ha

    return {
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      moistureLevel: Math.round((zone.ndmi + 1) * 50), // Normalize to 0-100
      stressLevel,
      priority: stressPriority[stressLevel],
      waterNeeded: Math.round(waterNeeded),
      lastIrrigated: undefined, // Would come from irrigation logs
    };
  }).sort((a, b) => a.priority - b.priority);
}

// =============================================================================
// IRRIGATION SCHEDULE
// =============================================================================

/**
 * Generate irrigation schedule for the week
 */
export function generateIrrigationSchedule(
  zones: IrrigationZone[],
  dailyForecast: WeatherData['daily'],
  et0: number
): IrrigationSchedule[] {
  const schedule: IrrigationSchedule[] = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0]!;

    const forecast = dailyForecast[dayOffset];
    if (!forecast) continue;

    // Check if rain is expected
    if (forecast.precipitationProbability > 70 && forecast.precipitation > 10) {
      schedule.push({
        date: dateStr,
        time: '',
        zones: [],
        waterAmount: 0,
        duration: 0,
        status: 'skipped',
        skipReason: `Rain expected (${forecast.precipitation}mm)`,
      });
      continue;
    }

    // Schedule irrigation for stressed zones
    const stressedZones = zones.filter(z => z.stressLevel !== 'none');

    if (stressedZones.length > 0 || dayOffset % 2 === 0) {
      // Irrigate every other day or when stress detected
      const zonesToIrrigate = stressedZones.length > 0
        ? stressedZones.map(z => z.zoneId)
        : zones.slice(0, 2).map(z => z.zoneId);

      const totalWater = stressedZones.reduce((sum, z) => sum + z.waterNeeded, 0) ||
        et0 * 10000; // Default amount

      schedule.push({
        date: dateStr,
        time: '06:00',
        zones: zonesToIrrigate,
        waterAmount: Math.round(totalWater),
        duration: Math.round(totalWater / 1000), // Rough duration estimate
        status: dayOffset === 0 ? 'scheduled' : 'scheduled',
      });
    }
  }

  return schedule;
}

// =============================================================================
// WATER SAVINGS CALCULATION
// =============================================================================

/**
 * Calculate water savings compared to traditional irrigation
 */
export function calculateWaterSavings(
  actualUsage: number,          // Liters used with smart irrigation
  traditionalUsage: number,     // Estimated traditional usage
  waterCostPerKL: number = IRRIGATION_CONFIG.WATER_COST_PER_KL
): WaterSavings {
  const weekSavings = Math.max(0, traditionalUsage * 0.15 - actualUsage * 0.15);
  const monthSavings = weekSavings * 4;
  const seasonSavings = monthSavings * 4;

  const percentageSaved = traditionalUsage > 0
    ? Math.round(((traditionalUsage - actualUsage) / traditionalUsage) * 100)
    : 0;

  const costSavings = (seasonSavings / 1000) * waterCostPerKL;

  return {
    thisWeek: Math.round(weekSavings),
    thisMonth: Math.round(monthSavings),
    thisSeason: Math.round(seasonSavings),
    percentageVsTraditional: Math.max(0, percentageSaved),
    costSavings: Math.round(costSavings),
  };
}

// =============================================================================
// MAIN RECOMMENDATION FUNCTION
// =============================================================================

/**
 * Generate complete irrigation recommendation for a farm
 */
export async function generateIrrigationRecommendation(
  farmId: string,
  cropType: string,
  growthStage: GrowthStage,
  soilType: keyof typeof IRRIGATION_CONFIG.SOIL_TYPES,
  areaHectares: number,
  latitude: number,
  longitude: number,
  satelliteZones?: { zoneId: string; zoneName: string; ndmi: number }[]
): Promise<IrrigationRecommendation> {
  // Get weather data
  const weather = await getWeather(farmId, { latitude, longitude });

  // Get historical weather for rainfall
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  let recentRainfall = 0;
  try {
    const historical = await getHistoricalWeather(
      latitude,
      longitude,
      weekAgo.toISOString().split('T')[0]!,
      now.toISOString().split('T')[0]!
    );
    recentRainfall = historical.daily.reduce((sum, d) => sum + d.precipitation, 0);
  } catch {
    // Use current data if historical fails
    recentRainfall = weather.daily.slice(0, 7).reduce((sum, d) => sum + d.precipitation, 0);
  }

  // Get crop coefficient
  const cropCoeffs = IRRIGATION_CONFIG.CROP_COEFFICIENTS[cropType as keyof typeof IRRIGATION_CONFIG.CROP_COEFFICIENTS] ||
    { initial: 0.5, mid: 1.0, late: 0.7 };

  const cropKc = getCropCoefficientForStage(cropCoeffs, growthStage);

  // Get ET0 from weather
  const et0 = weather.agricultural.et0;

  // Estimate soil moisture
  const soilMoisture = estimateSoilMoisture(
    soilType,
    recentRainfall,
    0, // Would come from irrigation logs
    et0,
    cropKc,
    2 // Assumed days since last watering
  );

  // Calculate water balance
  const waterBalance = calculateWaterBalance(
    recentRainfall,
    0, // Would come from irrigation logs
    et0,
    cropKc,
    soilMoisture
  );

  // Generate recommendation
  const upcomingRain = weather.daily.slice(0, 2).reduce((sum, d) => sum + d.precipitation, 0);
  const rainProbability = Math.max(...weather.daily.slice(0, 2).map(d => d.precipitationProbability));

  const recommendation = generateIrrigationAction(
    soilMoisture,
    waterBalance,
    upcomingRain,
    rainProbability,
    areaHectares
  );

  // Generate zone recommendations
  const zones = satelliteZones
    ? generateZoneRecommendations(satelliteZones, soilType, et0, cropKc)
    : [];

  // Generate schedule
  const schedule = generateIrrigationSchedule(zones, weather.daily, et0);

  // Calculate savings
  const traditionalUsage = et0 * cropKc * areaHectares * 10000 * 7; // Weekly traditional
  const smartUsage = traditionalUsage * 0.7; // Assume 30% savings with smart irrigation
  const savings = calculateWaterSavings(smartUsage, traditionalUsage);

  return {
    farmId,
    date: new Date().toISOString().split('T')[0]!,
    soilMoisture,
    waterBalance,
    recommendation,
    zones,
    schedule,
    savings,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get crop coefficient for growth stage
 */
function getCropCoefficientForStage(
  coeffs: { initial: number; mid: number; late: number },
  stage: GrowthStage
): number {
  switch (stage) {
    case GrowthStage.GERMINATION:
    case GrowthStage.SEEDLING:
      return coeffs.initial;
    case GrowthStage.VEGETATIVE:
    case GrowthStage.FLOWERING:
    case GrowthStage.FRUIT_DEVELOPMENT:
      return coeffs.mid;
    case GrowthStage.MATURITY:
    case GrowthStage.HARVEST_READY:
      return coeffs.late;
    default:
      return coeffs.mid;
  }
}
