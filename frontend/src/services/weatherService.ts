/**
 * Green Sentinel - Frontend Weather Service
 *
 * Calls Open-Meteo API directly from the browser (FREE, no API key needed)
 */

// Types
export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  uvIndex: number;
  pressure: number;
  weatherCode: number;
  weatherDescription: string;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeedMax: number;
  uvIndexMax: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
  et0: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  cloudCover: number;
  weatherCode: number;
}

export interface AgriculturalMetrics {
  gdd: number;
  et0: number;
  chillHours: number;
  heatUnits: number;
  frostRisk: boolean;
  sprayWindow: SprayWindow | null;
  irrigationAdvisory: string;
}

export interface SprayWindow {
  start: string;
  end: string;
  conditions: string;
  confidence: number;
}

export interface WeatherAlert {
  alertId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  advisory: string;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  agricultural: AgriculturalMetrics;
  alerts: WeatherAlert[];
  fetchedAt: string;
}

// Weather code descriptions
const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

/**
 * Fetch weather data from Open-Meteo API
 */
export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set('timezone', 'Asia/Kolkata');

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

  url.searchParams.set('forecast_days', '14');

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
    pressure: data.current.surface_pressure,
    weatherCode: data.current.weather_code,
    weatherDescription: WEATHER_DESCRIPTIONS[data.current.weather_code] || 'Unknown',
    isDay: data.current.is_day === 1,
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
    weatherCode: data.daily.weather_code[i],
    sunrise: data.daily.sunrise[i],
    sunset: data.daily.sunset[i],
    et0: data.daily.et0_fao_evapotranspiration[i],
  }));

  // Parse hourly forecast (next 48 hours)
  const hourly: HourlyForecast[] = data.hourly.time
    .slice(0, 48)
    .map((time: string, i: number) => ({
      time,
      temperature: data.hourly.temperature_2m[i],
      humidity: data.hourly.relative_humidity_2m[i],
      precipitation: data.hourly.precipitation[i],
      precipitationProbability: data.hourly.precipitation_probability[i],
      windSpeed: data.hourly.wind_speed_10m[i],
      cloudCover: data.hourly.cloud_cover[i],
      weatherCode: data.hourly.weather_code[i],
    }));

  // Calculate agricultural metrics
  const agricultural = calculateAgriculturalMetrics(daily, hourly, data.daily?.et0_fao_evapotranspiration?.[0]);

  // Generate weather alerts
  const alerts = generateWeatherAlerts(daily, hourly, current);

  return {
    current,
    daily,
    hourly,
    agricultural,
    alerts,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Calculate agriculture-specific metrics
 */
function calculateAgriculturalMetrics(
  daily: DailyForecast[],
  hourly: HourlyForecast[],
  et0Raw: number | undefined
): AgriculturalMetrics {
  // Growing Degree Days (GDD) - base 10°C
  const baseTemp = 10;
  let gdd = 0;
  for (const day of daily.slice(0, 7)) {
    const avgTemp = (day.tempMax + day.tempMin) / 2;
    if (avgTemp > baseTemp) {
      gdd += avgTemp - baseTemp;
    }
  }

  // ET0 from API or default
  const et0 = et0Raw || 4.5;

  // Chill hours (0-7°C range)
  let chillHours = 0;
  for (const hour of hourly) {
    if (hour.temperature >= 0 && hour.temperature <= 7) {
      chillHours++;
    }
  }

  // Heat units (temps above 30°C)
  let heatUnits = 0;
  for (const day of daily.slice(0, 7)) {
    if (day.tempMax > 30) {
      heatUnits += day.tempMax - 30;
    }
  }

  // Frost risk check
  const frostRisk = hourly.some(h => h.temperature < 4) ||
                    daily.slice(0, 3).some(d => d.tempMin < 4);

  // Find spray window
  const sprayWindow = findSprayWindow(hourly);

  // Irrigation advisory
  const irrigationAdvisory = generateIrrigationAdvisory(daily, et0);

  return {
    gdd: Math.round(gdd),
    et0: Math.round(et0 * 10) / 10,
    chillHours,
    heatUnits: Math.round(heatUnits),
    frostRisk,
    sprayWindow,
    irrigationAdvisory,
  };
}

/**
 * Find optimal spray window
 */
function findSprayWindow(hourly: HourlyForecast[]): SprayWindow | null {
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

  // Find best window (at least 2 hours)
  const bestWindow = windows
    .filter(w => {
      const duration = new Date(w.end).getTime() - new Date(w.start).getTime();
      return duration >= 2 * 60 * 60 * 1000;
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!bestWindow) return null;

  return {
    start: bestWindow.start,
    end: bestWindow.end,
    conditions: 'No rain, low wind, suitable humidity',
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

/**
 * Generate weather alerts
 */
function generateWeatherAlerts(
  daily: DailyForecast[],
  hourly: HourlyForecast[],
  _current: CurrentWeather
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // Frost alert
  for (const day of daily.slice(0, 3)) {
    if (day.tempMin < 4) {
      alerts.push({
        alertId: `frost-${day.date}`,
        type: 'frost',
        severity: day.tempMin < 0 ? 'critical' : 'high',
        title: 'Frost Warning',
        description: `Temperature expected to drop to ${day.tempMin}°C`,
        advisory: 'Cover sensitive crops, avoid irrigation at night',
      });
      break;
    }
  }

  // Heat wave alert
  const hotDays = daily.filter(d => d.tempMax >= 40);
  if (hotDays.length >= 3) {
    alerts.push({
      alertId: `heatwave-${Date.now()}`,
      type: 'heat_wave',
      severity: 'high',
      title: 'Heat Wave Warning',
      description: `Temperatures above 40°C expected for ${hotDays.length} days`,
      advisory: 'Increase irrigation frequency, apply mulch, provide shade',
    });
  }

  // Heavy rain alert
  for (const day of daily.slice(0, 3)) {
    if (day.precipitation >= 50) {
      alerts.push({
        alertId: `rain-${day.date}`,
        type: 'heavy_rain',
        severity: day.precipitation > 100 ? 'critical' : 'high',
        title: 'Heavy Rain Alert',
        description: `${day.precipitation}mm rainfall expected`,
        advisory: 'Ensure drainage, avoid spraying, postpone harvesting',
      });
    }
  }

  // Strong wind alert
  for (const day of daily.slice(0, 3)) {
    if (day.windSpeedMax >= 50) {
      alerts.push({
        alertId: `wind-${day.date}`,
        type: 'strong_wind',
        severity: day.windSpeedMax > 70 ? 'high' : 'medium',
        title: 'Strong Wind Warning',
        description: `Wind speeds up to ${day.windSpeedMax} km/h expected`,
        advisory: 'Secure structures, avoid spraying, support tall crops',
      });
    }
  }

  // Hail alert
  const hailCodes = [96, 99];
  for (const hour of hourly.slice(0, 24)) {
    if (hailCodes.includes(hour.weatherCode)) {
      alerts.push({
        alertId: `hail-${hour.time}`,
        type: 'hail',
        severity: 'critical',
        title: 'Hail Warning',
        description: 'Thunderstorm with hail expected',
        advisory: 'Protect crops with netting if possible, harvest ripe produce',
      });
      break;
    }
  }

  return alerts;
}

/**
 * Get weather icon based on code
 */
export function getWeatherIcon(code: number, isDay: boolean = true): string {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 3) return isDay ? '⛅' : '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌧️';
  if (code <= 65) return '🌧️';
  if (code <= 67) return '🌨️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '☁️';
}
