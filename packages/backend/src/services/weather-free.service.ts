/**
 * Green Sentinel - Free Weather Service
 *
 * Uses Open-Meteo API for completely FREE weather data.
 * No API key required, 10,000 requests/day limit.
 */

import {
  WeatherData,
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  AgriculturalMetrics,
  WeatherAlert,
  WeatherAlertType,
  WeatherCode,
  GeoLocation,
  SprayWindow,
} from '@green-sentinel/shared';
import { WEATHER_CONFIG } from '@green-sentinel/shared';

// =============================================================================
// OPEN-METEO API CLIENT (FREE)
// =============================================================================

const FORECAST_URL = WEATHER_CONFIG.OPEN_METEO.FORECAST_URL;
const HISTORICAL_URL = WEATHER_CONFIG.OPEN_METEO.HISTORICAL_URL;

/**
 * Fetch current weather and forecast from Open-Meteo
 */
export async function getWeather(
  farmId: string,
  location: GeoLocation
): Promise<WeatherData> {
  const { latitude, longitude } = location;

  const url = new URL(FORECAST_URL);
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set('timezone', WEATHER_CONFIG.TIMEZONE);

  // Current weather parameters
  url.searchParams.set('current', [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'precipitation',
    'rain',
    'weather_code',
    'cloud_cover',
    'wind_speed_10m',
    'wind_direction_10m',
    'surface_pressure',
    'uv_index',
    'is_day',
  ].join(','));

  // Daily forecast parameters
  url.searchParams.set('daily', [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'uv_index_max',
    'sunrise',
    'sunset',
    'et0_fao_evapotranspiration',
  ].join(','));

  // Hourly forecast parameters
  url.searchParams.set('hourly', [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation',
    'precipitation_probability',
    'weather_code',
    'cloud_cover',
    'wind_speed_10m',
  ].join(','));

  url.searchParams.set('forecast_days', WEATHER_CONFIG.FORECAST_DAYS.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  // Parse current weather
  const current: CurrentWeather = {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    precipitation: data.current.precipitation,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    cloudCover: data.current.cloud_cover,
    uvIndex: data.current.uv_index || 0,
    visibility: 10000, // Not provided by Open-Meteo free tier
    pressure: data.current.surface_pressure,
    weatherCode: data.current.weather_code as WeatherCode,
    weatherDescription: getWeatherDescription(data.current.weather_code),
    isDay: data.current.is_day === 1,
    updatedAt: new Date().toISOString(),
  };

  // Parse daily forecast
  const daily: DailyForecast[] = data.daily.time.map((date: string, i: number) => ({
    date,
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    precipitation: data.daily.precipitation_sum[i],
    precipitationProbability: data.daily.precipitation_probability_max[i],
    windSpeedMax: data.daily.wind_speed_10m_max[i],
    uvIndexMax: data.daily.uv_index_max[i],
    weatherCode: data.daily.weather_code[i] as WeatherCode,
    sunrise: data.daily.sunrise[i],
    sunset: data.daily.sunset[i],
  }));

  // Parse hourly forecast (next 48 hours)
  const hourly: HourlyForecast[] = data.hourly.time
    .slice(0, WEATHER_CONFIG.HOURLY_HOURS)
    .map((time: string, i: number) => ({
      time,
      temperature: data.hourly.temperature_2m[i],
      humidity: data.hourly.relative_humidity_2m[i],
      precipitation: data.hourly.precipitation[i],
      precipitationProbability: data.hourly.precipitation_probability[i],
      windSpeed: data.hourly.wind_speed_10m[i],
      cloudCover: data.hourly.cloud_cover[i],
      weatherCode: data.hourly.weather_code[i] as WeatherCode,
    }));

  // Calculate agricultural metrics
  const agricultural = calculateAgriculturalMetrics(data, daily, hourly);

  // Generate weather alerts
  const alerts = generateWeatherAlerts(daily, hourly, current);

  return {
    farmId,
    location,
    current,
    daily,
    hourly,
    agricultural,
    alerts,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Get weather description from code
 */
function getWeatherDescription(code: number): string {
  return WEATHER_CONFIG.WEATHER_DESCRIPTIONS[code as keyof typeof WEATHER_CONFIG.WEATHER_DESCRIPTIONS] || 'Unknown';
}

// =============================================================================
// AGRICULTURAL METRICS
// =============================================================================

/**
 * Calculate agriculture-specific weather metrics
 */
function calculateAgriculturalMetrics(
  rawData: any,
  daily: DailyForecast[],
  hourly: HourlyForecast[]
): AgriculturalMetrics {
  // Growing Degree Days (GDD)
  const gdd = calculateGDD(daily);

  // Reference Evapotranspiration (from Open-Meteo if available)
  const et0 = rawData.daily?.et0_fao_evapotranspiration?.[0] || WEATHER_CONFIG.AGRICULTURE.ET0_DEFAULT;

  // Chill hours (for fruit crops)
  const chillHours = calculateChillHours(hourly);

  // Heat units
  const heatUnits = calculateHeatUnits(daily);

  // Frost risk
  const frostRisk = checkFrostRisk(daily, hourly);

  // Optimal spray window
  const sprayWindow = findSprayWindow(hourly);

  // Irrigation advisory
  const irrigationAdvisory = generateIrrigationAdvisory(daily, et0);

  return {
    gdd,
    et0,
    chillHours,
    heatUnits,
    frostRisk,
    sprayWindow,
    irrigationAdvisory,
  };
}

/**
 * Calculate Growing Degree Days
 */
function calculateGDD(daily: DailyForecast[]): number {
  const baseTemp = WEATHER_CONFIG.AGRICULTURE.GDD_BASE_TEMP;
  let gdd = 0;

  for (const day of daily.slice(0, 7)) {
    const avgTemp = (day.tempMax + day.tempMin) / 2;
    if (avgTemp > baseTemp) {
      gdd += avgTemp - baseTemp;
    }
  }

  return Math.round(gdd);
}

/**
 * Calculate chill hours (for fruit crops)
 */
function calculateChillHours(hourly: HourlyForecast[]): number {
  const { CHILL_HOURS_MIN, CHILL_HOURS_MAX } = WEATHER_CONFIG.AGRICULTURE;
  let chillHours = 0;

  for (const hour of hourly) {
    if (hour.temperature >= CHILL_HOURS_MIN && hour.temperature <= CHILL_HOURS_MAX) {
      chillHours++;
    }
  }

  return chillHours;
}

/**
 * Calculate heat units
 */
function calculateHeatUnits(daily: DailyForecast[]): number {
  let heatUnits = 0;

  for (const day of daily.slice(0, 7)) {
    if (day.tempMax > 30) {
      heatUnits += day.tempMax - 30;
    }
  }

  return Math.round(heatUnits);
}

/**
 * Check frost risk in next 48 hours
 */
function checkFrostRisk(daily: DailyForecast[], hourly: HourlyForecast[]): boolean {
  const threshold = WEATHER_CONFIG.ALERTS.FROST.tempThreshold;

  // Check hourly forecast
  for (const hour of hourly) {
    if (hour.temperature < threshold) {
      return true;
    }
  }

  // Check daily minimums
  for (const day of daily.slice(0, 3)) {
    if (day.tempMin < threshold) {
      return true;
    }
  }

  return false;
}

/**
 * Find optimal spray window
 */
function findSprayWindow(hourly: HourlyForecast[]): SprayWindow | null {
  // Optimal conditions: no rain, low wind, moderate humidity
  const windows: { start: string; end: string; score: number }[] = [];

  let windowStart: string | null = null;
  let windowScore = 0;

  for (let i = 0; i < hourly.length; i++) {
    const hour = hourly[i];
    if (!hour) continue;

    const isOptimal =
      hour.precipitation === 0 &&
      hour.precipitationProbability < 30 &&
      hour.windSpeed < 15 &&
      hour.humidity >= 40 &&
      hour.humidity <= 80;

    if (isOptimal) {
      if (!windowStart) {
        windowStart = hour.time;
        windowScore = 0;
      }
      windowScore += 100 - hour.precipitationProbability - hour.windSpeed;
    } else if (windowStart) {
      windows.push({
        start: windowStart,
        end: hourly[i - 1]?.time || hour.time,
        score: windowScore,
      });
      windowStart = null;
    }
  }

  // Find best window (at least 2 hours long)
  const bestWindow = windows
    .filter(w => {
      const duration = new Date(w.end).getTime() - new Date(w.start).getTime();
      return duration >= 2 * 60 * 60 * 1000; // 2 hours
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!bestWindow) return null;

  return {
    start: bestWindow.start,
    end: bestWindow.end,
    conditions: 'No rain expected, low wind, suitable humidity',
    confidence: Math.min(95, Math.round(bestWindow.score / 10)),
  };
}

/**
 * Generate irrigation advisory
 */
function generateIrrigationAdvisory(daily: DailyForecast[], et0: number): string {
  const nextDayRain = daily[0]?.precipitation || 0;
  const threeDayRain = daily.slice(0, 3).reduce((sum, d) => sum + d.precipitation, 0);
  const rainProbability = daily[0]?.precipitationProbability || 0;

  if (rainProbability > 70 && nextDayRain > 10) {
    return 'Skip irrigation - significant rain expected';
  }

  if (threeDayRain > 20) {
    return 'Reduce irrigation - rain expected in coming days';
  }

  if (et0 > 6) {
    return 'Increase irrigation - high evapotranspiration expected';
  }

  if (et0 < 3) {
    return 'Normal irrigation - low water demand';
  }

  return 'Maintain regular irrigation schedule';
}

// =============================================================================
// WEATHER ALERTS
// =============================================================================

/**
 * Generate weather alerts based on forecasts
 */
function generateWeatherAlerts(
  daily: DailyForecast[],
  hourly: HourlyForecast[],
  current: CurrentWeather
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const now = new Date().toISOString();

  // Frost alert
  for (const day of daily.slice(0, 3)) {
    if (day.tempMin < WEATHER_CONFIG.ALERTS.FROST.tempThreshold) {
      alerts.push({
        alertId: `frost-${day.date}`,
        type: WeatherAlertType.FROST,
        severity: day.tempMin < 0 ? 'critical' : 'high',
        title: 'Frost Warning',
        description: `Temperature expected to drop to ${day.tempMin}°C`,
        startTime: day.date + 'T00:00:00',
        endTime: day.date + 'T08:00:00',
        advisory: 'Cover sensitive crops, avoid irrigation at night',
        affectedCrops: ['vegetables', 'fruits', 'flowers'],
      });
      break; // Only one frost alert
    }
  }

  // Heat wave alert
  const hotDays = daily.filter(d => d.tempMax >= WEATHER_CONFIG.ALERTS.HEAT_WAVE.tempThreshold);
  if (hotDays.length >= WEATHER_CONFIG.ALERTS.HEAT_WAVE.consecutiveDays) {
    alerts.push({
      alertId: `heatwave-${now}`,
      type: WeatherAlertType.HEAT_WAVE,
      severity: 'high',
      title: 'Heat Wave Warning',
      description: `Temperatures above 40°C expected for ${hotDays.length} days`,
      startTime: hotDays[0]?.date || now,
      endTime: hotDays[hotDays.length - 1]?.date || now,
      advisory: 'Increase irrigation frequency, apply mulch, provide shade',
      affectedCrops: ['all crops'],
    });
  }

  // Heavy rain alert
  for (const day of daily.slice(0, 3)) {
    if (day.precipitation >= WEATHER_CONFIG.ALERTS.HEAVY_RAIN.precipitationThreshold) {
      alerts.push({
        alertId: `rain-${day.date}`,
        type: WeatherAlertType.HEAVY_RAIN,
        severity: day.precipitation > 100 ? 'critical' : 'high',
        title: 'Heavy Rain Alert',
        description: `${day.precipitation}mm rainfall expected`,
        startTime: day.date + 'T00:00:00',
        endTime: day.date + 'T23:59:59',
        advisory: 'Ensure drainage, avoid spraying, postpone harvesting',
        affectedCrops: ['all crops'],
      });
    }
  }

  // Strong wind alert
  for (const day of daily.slice(0, 3)) {
    if (day.windSpeedMax >= WEATHER_CONFIG.ALERTS.STRONG_WIND.windSpeedThreshold) {
      alerts.push({
        alertId: `wind-${day.date}`,
        type: WeatherAlertType.STRONG_WIND,
        severity: day.windSpeedMax > 70 ? 'high' : 'medium',
        title: 'Strong Wind Warning',
        description: `Wind speeds up to ${day.windSpeedMax} km/h expected`,
        startTime: day.date + 'T00:00:00',
        endTime: day.date + 'T23:59:59',
        advisory: 'Secure structures, avoid spraying, support tall crops',
        affectedCrops: ['banana', 'sugarcane', 'maize'],
      });
    }
  }

  // Drought risk (no rain for extended period)
  const noRainDays = daily.filter(d => d.precipitation < 1).length;
  if (noRainDays >= WEATHER_CONFIG.ALERTS.DROUGHT.noRainDays) {
    alerts.push({
      alertId: `drought-${now}`,
      type: WeatherAlertType.DROUGHT,
      severity: 'medium',
      title: 'Dry Spell Advisory',
      description: `No significant rain expected for ${noRainDays} days`,
      startTime: now,
      endTime: daily[noRainDays - 1]?.date || now,
      advisory: 'Optimize irrigation, consider mulching, monitor soil moisture',
      affectedCrops: ['all crops'],
    });
  }

  // Hail alert (from weather codes)
  const hailCodes: number[] = [...WEATHER_CONFIG.ALERTS.HAIL.weatherCodes];
  for (const hour of hourly.slice(0, 24)) {
    if (hailCodes.includes(hour.weatherCode)) {
      alerts.push({
        alertId: `hail-${hour.time}`,
        type: WeatherAlertType.HAIL,
        severity: 'critical',
        title: 'Hail Warning',
        description: 'Thunderstorm with hail expected',
        startTime: hour.time,
        endTime: hour.time,
        advisory: 'Protect crops with netting if possible, harvest ripe produce',
        affectedCrops: ['fruits', 'vegetables', 'flowers'],
      });
      break;
    }
  }

  return alerts;
}

// =============================================================================
// HISTORICAL WEATHER
// =============================================================================

/**
 * Get historical weather data
 */
export async function getHistoricalWeather(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<{
  daily: {
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
    et0: number;
  }[];
}> {
  const url = new URL(HISTORICAL_URL);
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('timezone', WEATHER_CONFIG.TIMEZONE);
  url.searchParams.set('daily', [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'et0_fao_evapotranspiration',
  ].join(','));

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Historical weather API error: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    daily: data.daily.time.map((date: string, i: number) => ({
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_sum[i],
      et0: data.daily.et0_fao_evapotranspiration[i],
    })),
  };
}

/**
 * Calculate seasonal rainfall statistics
 */
export async function getSeasonalRainfall(
  latitude: number,
  longitude: number,
  years: number = 5
): Promise<{
  yearly: { year: number; total: number; monsoon: number }[];
  average: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}> {
  const currentYear = new Date().getFullYear();
  const results: { year: number; total: number; monsoon: number }[] = [];

  for (let year = currentYear - years; year < currentYear; year++) {
    const data = await getHistoricalWeather(
      latitude,
      longitude,
      `${year}-01-01`,
      `${year}-12-31`
    );

    const totalRainfall = data.daily.reduce((sum, d) => sum + d.precipitation, 0);

    // Monsoon (June-September)
    const monsoonDays = data.daily.filter(d => {
      const month = new Date(d.date).getMonth();
      return month >= 5 && month <= 8;
    });
    const monsoonRainfall = monsoonDays.reduce((sum, d) => sum + d.precipitation, 0);

    results.push({
      year,
      total: Math.round(totalRainfall),
      monsoon: Math.round(monsoonRainfall),
    });
  }

  const average = results.reduce((sum, r) => sum + r.total, 0) / results.length;

  // Calculate trend
  const firstHalf = results.slice(0, Math.floor(results.length / 2));
  const secondHalf = results.slice(Math.floor(results.length / 2));
  const firstAvg = firstHalf.reduce((sum, r) => sum + r.total, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, r) => sum + r.total, 0) / secondHalf.length;

  let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (secondAvg > firstAvg * 1.1) trend = 'increasing';
  if (secondAvg < firstAvg * 0.9) trend = 'decreasing';

  return {
    yearly: results,
    average: Math.round(average),
    trend,
  };
}
