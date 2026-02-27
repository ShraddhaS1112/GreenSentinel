/**
 * Green Sentinel - Frontend Irrigation Service
 *
 * Calculates irrigation recommendations based on weather data
 */

import { WeatherData } from './weatherService';

// Types
export interface SoilMoistureData {
  current: number;
  fieldCapacity: number;
  wiltingPoint: number;
  optimalRange: { min: number; max: number };
  status: 'adequate' | 'moderate_stress' | 'severe_stress' | 'waterlogged';
}

export interface WaterBalance {
  rainfall: number;
  irrigation: number;
  evapotranspiration: number;
  deficit: number;
  surplus: number;
}

export interface ZoneData {
  zoneId: string;
  zoneName: string;
  moistureLevel: number;
  stressLevel: 'none' | 'mild' | 'moderate' | 'severe';
  priority: number;
  waterNeeded: number;
}

export interface ScheduleItem {
  date: string;
  time: string;
  zones: string[];
  waterAmount: number;
  duration: number;
  status: 'scheduled' | 'completed' | 'skipped';
  skipReason?: string;
}

export interface IrrigationRecommendation {
  action: 'irrigate_now' | 'irrigate_soon' | 'wait' | 'skip_rain_expected';
  waterNeeded: number;
  duration: number;
  optimalTime: string;
  reason: string;
  priority: number;
}

export interface WaterSavings {
  thisWeek: number;
  thisMonth: number;
  thisSeason: number;
  percentageVsTraditional: number;
  costSavings: number;
}

export interface IrrigationData {
  soilMoisture: SoilMoistureData;
  waterBalance: WaterBalance;
  recommendation: IrrigationRecommendation;
  zones: ZoneData[];
  schedule: ScheduleItem[];
  savings: WaterSavings;
}

// Crop coefficients (Kc) for different crops at different stages
const CROP_COEFFICIENTS: Record<string, { initial: number; mid: number; late: number }> = {
  rice: { initial: 1.05, mid: 1.2, late: 0.9 },
  wheat: { initial: 0.3, mid: 1.15, late: 0.25 },
  cotton: { initial: 0.35, mid: 1.2, late: 0.5 },
  sugarcane: { initial: 0.4, mid: 1.25, late: 0.75 },
  maize: { initial: 0.3, mid: 1.2, late: 0.35 },
  potato: { initial: 0.5, mid: 1.15, late: 0.75 },
  tomato: { initial: 0.6, mid: 1.15, late: 0.8 },
  onion: { initial: 0.7, mid: 1.05, late: 0.75 },
  vegetables: { initial: 0.5, mid: 1.0, late: 0.8 },
};

// Soil water holding capacity by type (mm per meter depth)
const SOIL_CAPACITY: Record<string, { fieldCapacity: number; wiltingPoint: number }> = {
  sandy: { fieldCapacity: 100, wiltingPoint: 40 },
  loamy: { fieldCapacity: 200, wiltingPoint: 80 },
  clay: { fieldCapacity: 300, wiltingPoint: 150 },
  silty: { fieldCapacity: 250, wiltingPoint: 100 },
};

/**
 * Calculate irrigation recommendations based on weather data
 */
export function calculateIrrigation(
  weather: WeatherData,
  cropType: string = 'vegetables',
  soilType: string = 'loamy',
  areaHectares: number = 1,
  lastIrrigationDate?: string
): IrrigationData {
  const kc = CROP_COEFFICIENTS[cropType.toLowerCase()] || CROP_COEFFICIENTS.vegetables;
  const soil = SOIL_CAPACITY[soilType.toLowerCase()] || SOIL_CAPACITY.loamy;

  // Calculate water balance for past 7 days
  const rainfall = weather.daily.slice(0, 7).reduce((sum, d) => sum + d.precipitation, 0);
  const et0Weekly = weather.daily.slice(0, 7).reduce((sum, d) => sum + d.et0, 0);
  const etc = et0Weekly * kc.mid; // Crop ET

  // Estimate irrigation applied (if known)
  const irrigation = lastIrrigationDate ? 20 : 0; // Default estimate

  // Water balance
  const netBalance = rainfall + irrigation - etc;
  const waterBalance: WaterBalance = {
    rainfall: Math.round(rainfall),
    irrigation,
    evapotranspiration: Math.round(etc),
    deficit: netBalance < 0 ? Math.abs(Math.round(netBalance)) : 0,
    surplus: netBalance > 0 ? Math.round(netBalance) : 0,
  };

  // Estimate soil moisture based on water balance
  const moistureEstimate = estimateSoilMoisture(waterBalance, soil, weather);

  // Generate irrigation recommendation
  const recommendation = generateRecommendation(
    moistureEstimate,
    weather,
    soil,
    areaHectares
  );

  // Generate zone data (simulated based on field position)
  const zones = generateZoneData(moistureEstimate, areaHectares);

  // Generate schedule based on recommendation
  const schedule = generateSchedule(recommendation, zones, weather);

  // Calculate savings
  const savings = calculateSavings(weather, areaHectares);

  return {
    soilMoisture: moistureEstimate,
    waterBalance,
    recommendation,
    zones,
    schedule,
    savings,
  };
}

/**
 * Estimate soil moisture from water balance
 */
function estimateSoilMoisture(
  balance: WaterBalance,
  soil: { fieldCapacity: number; wiltingPoint: number },
  weather: WeatherData
): SoilMoistureData {
  // Calculate available water capacity
  const awc = soil.fieldCapacity - soil.wiltingPoint;

  // Estimate current moisture (simplified model)
  // Start at 70% of field capacity and adjust based on balance
  let currentPercent = 70;

  if (balance.deficit > 0) {
    currentPercent -= (balance.deficit / awc) * 100;
  } else if (balance.surplus > 0) {
    currentPercent += (balance.surplus / awc) * 50; // Less impact for surplus
  }

  // Clamp to realistic range
  currentPercent = Math.max(20, Math.min(100, currentPercent));

  // Adjust for recent high temps
  const avgTempMax = weather.daily.slice(0, 3).reduce((sum, d) => sum + d.tempMax, 0) / 3;
  if (avgTempMax > 35) {
    currentPercent -= 10;
  }

  // Calculate actual values
  const current = Math.round((currentPercent / 100) * soil.fieldCapacity);
  const optimalMin = Math.round(soil.wiltingPoint + (awc * 0.5));
  const optimalMax = Math.round(soil.wiltingPoint + (awc * 0.8));

  // Determine status
  let status: SoilMoistureData['status'];
  if (current > soil.fieldCapacity * 0.95) {
    status = 'waterlogged';
  } else if (current >= optimalMin) {
    status = 'adequate';
  } else if (current >= soil.wiltingPoint + (awc * 0.3)) {
    status = 'moderate_stress';
  } else {
    status = 'severe_stress';
  }

  return {
    current: Math.round((current / soil.fieldCapacity) * 100),
    fieldCapacity: 100,
    wiltingPoint: Math.round((soil.wiltingPoint / soil.fieldCapacity) * 100),
    optimalRange: {
      min: Math.round((optimalMin / soil.fieldCapacity) * 100),
      max: Math.round((optimalMax / soil.fieldCapacity) * 100),
    },
    status,
  };
}

/**
 * Generate irrigation recommendation
 */
function generateRecommendation(
  moisture: SoilMoistureData,
  weather: WeatherData,
  soil: { fieldCapacity: number; wiltingPoint: number },
  areaHectares: number
): IrrigationRecommendation {
  // Check for upcoming rain
  const upcomingRain = weather.daily.slice(0, 3).reduce((sum, d) => sum + d.precipitation, 0);
  const rainProbability = Math.max(...weather.daily.slice(0, 2).map(d => d.precipitationProbability));

  // Skip if significant rain expected
  if (rainProbability > 70 && upcomingRain > 15) {
    return {
      action: 'skip_rain_expected',
      waterNeeded: 0,
      duration: 0,
      optimalTime: '',
      reason: `Rain expected (${Math.round(upcomingRain)}mm) - skip irrigation`,
      priority: 5,
    };
  }

  // Calculate water needed to reach optimal
  const deficitPercent = Math.max(0, moisture.optimalRange.max - moisture.current);
  const waterNeededMm = (deficitPercent / 100) * soil.fieldCapacity;
  const waterNeededLiters = Math.round(waterNeededMm * areaHectares * 10000); // mm to L/ha

  // Determine action based on moisture status
  let action: IrrigationRecommendation['action'];
  let priority: number;
  let reason: string;

  if (moisture.status === 'severe_stress') {
    action = 'irrigate_now';
    priority = 1;
    reason = 'Severe water stress - irrigate immediately to prevent crop damage';
  } else if (moisture.status === 'moderate_stress') {
    action = 'irrigate_soon';
    priority = 2;
    reason = 'Soil moisture below optimal - irrigate within 24 hours';
  } else if (moisture.current < moisture.optimalRange.min + 5) {
    action = 'irrigate_soon';
    priority = 3;
    reason = 'Approaching stress levels - schedule irrigation soon';
  } else {
    action = 'wait';
    priority = 4;
    reason = 'Adequate moisture - continue monitoring';
  }

  // Calculate duration (assuming 10 L/min flow rate per hectare)
  const flowRateLPerMin = 10000; // L/min per hectare for drip
  const duration = Math.round(waterNeededLiters / (flowRateLPerMin * areaHectares));

  return {
    action,
    waterNeeded: waterNeededLiters,
    duration: Math.max(0, duration),
    optimalTime: '06:00', // Early morning
    reason,
    priority,
  };
}

/**
 * Generate zone-wise data
 */
function generateZoneData(moisture: SoilMoistureData, areaHectares: number): ZoneData[] {
  // Simulate 4 zones with varying conditions
  const baseLevel = moisture.current;
  const variations = [+15, +5, -5, -15]; // Variation from base
  const zoneNames = ['North-West', 'North-East', 'South-West', 'South-East'];

  return variations.map((variation, i) => {
    const moistureLevel = Math.max(10, Math.min(100, baseLevel + variation));

    let stressLevel: ZoneData['stressLevel'];
    if (moistureLevel >= 60) stressLevel = 'none';
    else if (moistureLevel >= 45) stressLevel = 'mild';
    else if (moistureLevel >= 30) stressLevel = 'moderate';
    else stressLevel = 'severe';

    const priority = stressLevel === 'severe' ? 1 :
                    stressLevel === 'moderate' ? 2 :
                    stressLevel === 'mild' ? 3 : 4;

    const waterNeeded = stressLevel === 'none' ? 0 :
                       Math.round((70 - moistureLevel) * areaHectares * 250);

    return {
      zoneId: `zone-${i + 1}`,
      zoneName: zoneNames[i],
      moistureLevel,
      stressLevel,
      priority,
      waterNeeded,
    };
  });
}

/**
 * Generate irrigation schedule
 */
function generateSchedule(
  recommendation: IrrigationRecommendation,
  zones: ZoneData[],
  weather: WeatherData
): ScheduleItem[] {
  const schedule: ScheduleItem[] = [];
  const today = new Date();

  // Sort zones by priority
  const sortedZones = [...zones].sort((a, b) => a.priority - b.priority);
  const urgentZones = sortedZones.filter(z => z.priority <= 2).map(z => z.zoneId);
  const regularZones = sortedZones.filter(z => z.priority > 2 && z.priority < 4).map(z => z.zoneId);

  // Generate 4-day schedule
  for (let i = 0; i < 4; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayWeather = weather.daily[i];

    // Skip if rain expected
    if (dayWeather && dayWeather.precipitationProbability > 70 && dayWeather.precipitation > 10) {
      schedule.push({
        date: dateStr,
        time: '',
        zones: [],
        waterAmount: 0,
        duration: 0,
        status: 'skipped',
        skipReason: `Rain expected (${Math.round(dayWeather.precipitation)}mm)`,
      });
      continue;
    }

    // Schedule irrigation
    if (i === 0 && urgentZones.length > 0) {
      schedule.push({
        date: dateStr,
        time: '06:00',
        zones: urgentZones,
        waterAmount: urgentZones.reduce((sum, zId) => {
          const zone = zones.find(z => z.zoneId === zId);
          return sum + (zone?.waterNeeded || 0);
        }, 0),
        duration: Math.round(recommendation.duration * urgentZones.length / zones.length),
        status: 'scheduled',
      });
    } else if (i === 1 && regularZones.length > 0) {
      schedule.push({
        date: dateStr,
        time: '06:00',
        zones: regularZones,
        waterAmount: regularZones.reduce((sum, zId) => {
          const zone = zones.find(z => z.zoneId === zId);
          return sum + (zone?.waterNeeded || 0);
        }, 0),
        duration: 30,
        status: 'scheduled',
      });
    } else if (i >= 2) {
      // Maintenance irrigation
      schedule.push({
        date: dateStr,
        time: '06:00',
        zones: zones.slice(i % 2 === 0 ? 0 : 2, i % 2 === 0 ? 2 : 4).map(z => z.zoneId),
        waterAmount: 15000,
        duration: 25,
        status: 'scheduled',
      });
    }
  }

  return schedule;
}

/**
 * Calculate water savings
 */
function calculateSavings(weather: WeatherData, areaHectares: number): WaterSavings {
  // Traditional irrigation: fixed schedule regardless of weather
  const traditionalDaily = 5000 * areaHectares; // 5000 L/day/hectare
  const traditionalWeekly = traditionalDaily * 7;

  // Smart irrigation: based on actual needs
  const avgET0 = weather.daily.slice(0, 7).reduce((sum, d) => sum + d.et0, 0) / 7;
  const rainfall = weather.daily.slice(0, 7).reduce((sum, d) => sum + d.precipitation, 0);

  // Smart irrigation accounts for rainfall and actual ET
  const smartDaily = Math.max(0, (avgET0 * 1.1 - rainfall / 7) * areaHectares * 1000);
  const smartWeekly = smartDaily * 7;

  const weeklySavings = Math.max(0, traditionalWeekly - smartWeekly);
  const percentageSaved = traditionalWeekly > 0
    ? Math.round((weeklySavings / traditionalWeekly) * 100)
    : 0;

  // Cost: Rs 0.10 per liter (electricity + water)
  const costPerLiter = 0.0001; // Rs 0.10 per 1000L

  return {
    thisWeek: Math.round(weeklySavings),
    thisMonth: Math.round(weeklySavings * 4),
    thisSeason: Math.round(weeklySavings * 16), // 4 months
    percentageVsTraditional: Math.min(50, percentageSaved), // Cap at 50%
    costSavings: Math.round(weeklySavings * costPerLiter * 4), // Monthly
  };
}
