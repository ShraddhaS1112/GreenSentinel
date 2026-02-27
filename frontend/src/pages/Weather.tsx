/**
 * Green Sentinel - Weather Dashboard Page
 *
 * Displays REAL weather forecasts from Open-Meteo API,
 * agricultural metrics, and weather alerts.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  Leaf,
  Calendar,
  Clock,
  TrendingUp,
  Umbrella,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import {
  fetchWeather,
  getWeatherIcon,
  WeatherData,
} from '@/services/weatherService';

const weatherIcons: Record<number, typeof Sun> = {
  0: Sun,
  1: Sun,
  2: Cloud,
  3: Cloud,
  45: Cloud,
  48: Cloud,
  51: CloudRain,
  53: CloudRain,
  55: CloudRain,
  61: CloudRain,
  63: CloudRain,
  65: CloudRain,
  80: CloudRain,
  81: CloudRain,
  82: CloudRain,
  95: CloudRain,
  96: CloudRain,
  99: CloudRain,
};

export default function Weather() {
  const { getCurrentFarm } = useFarmStore();
  const farm = getCurrentFarm();
  const [selectedDay, setSelectedDay] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get farm coordinates or use default (Bangalore)
  const latitude = farm?.location?.latitude || 12.9716;
  const longitude = farm?.location?.longitude || 77.5946;

  // Fetch weather data
  const loadWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(latitude, longitude);
      setWeather(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
    // Refresh every 30 minutes
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  const selectedForecast = weather?.daily[selectedDay];

  if (loading && !weather) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="mt-4 text-slate-600">Loading weather data...</p>
          <p className="text-sm text-slate-400 mt-1">
            Fetching from Open-Meteo API
          </p>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="page-container">
        <div className="card bg-red-50 border-l-4 border-red-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Failed to load weather</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button
                onClick={loadWeather}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weather Intelligence</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {farm?.name || 'Your location'} ({latitude.toFixed(2)}°N, {longitude.toFixed(2)}°E)
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={loadWeather}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {lastUpdated && (
            <p className="text-xs text-slate-400 mt-1">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Live Data Badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live Data from Open-Meteo
        </span>
      </div>

      {/* Current Weather Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-100 text-sm">Current Weather</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-5xl font-bold">{Math.round(weather.current.temperature)}°</span>
              <div>
                <p className="text-lg font-medium">{weather.current.weatherDescription}</p>
                <p className="text-blue-200 text-sm">Feels like {Math.round(weather.current.feelsLike)}°</p>
              </div>
            </div>
          </div>
          <div className="text-5xl">
            {getWeatherIcon(weather.current.weatherCode, weather.current.isDay)}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-blue-400/30">
          <WeatherStat icon={Droplets} label="Humidity" value={`${weather.current.humidity}%`} />
          <WeatherStat icon={Wind} label="Wind" value={`${Math.round(weather.current.windSpeed)} km/h`} />
          <WeatherStat icon={Cloud} label="Cloud" value={`${weather.current.cloudCover}%`} />
          <WeatherStat icon={Sun} label="UV Index" value={Math.round(weather.current.uvIndex).toString()} />
        </div>
      </motion.div>

      {/* Weather Alerts */}
      {weather.alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-3"
        >
          {weather.alerts.map((alert, index) => (
            <div
              key={index}
              className={`card border-l-4 ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                'bg-amber-50 border-amber-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  alert.severity === 'critical' ? 'text-red-600' :
                  alert.severity === 'high' ? 'text-orange-600' :
                  'text-amber-600'
                }`} />
                <div>
                  <h3 className={`font-semibold ${
                    alert.severity === 'critical' ? 'text-red-800' :
                    alert.severity === 'high' ? 'text-orange-800' :
                    'text-amber-800'
                  }`}>{alert.title}</h3>
                  <p className={`text-sm mt-1 ${
                    alert.severity === 'critical' ? 'text-red-700' :
                    alert.severity === 'high' ? 'text-orange-700' :
                    'text-amber-700'
                  }`}>{alert.description}</p>
                  <p className={`text-sm mt-2 ${
                    alert.severity === 'critical' ? 'text-red-600' :
                    alert.severity === 'high' ? 'text-orange-600' :
                    'text-amber-600'
                  }`}>
                    <strong>Advisory:</strong> {alert.advisory}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* 7-Day Forecast */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card mb-6"
      >
        <h2 className="section-header flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          7-Day Forecast
        </h2>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {weather.daily.slice(0, 7).map((day, index) => {
            const WeatherIcon = weatherIcons[day.weatherCode] || Cloud;
            const date = new Date(day.date);
            const isSelected = index === selectedDay;

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDay(index)}
                className={`flex-shrink-0 p-3 rounded-xl text-center transition-all min-w-[80px] ${
                  isSelected
                    ? 'bg-primary-100 border-2 border-primary-500'
                    : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                }`}
              >
                <p className={`text-xs font-medium ${isSelected ? 'text-primary-700' : 'text-slate-500'}`}>
                  {index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <WeatherIcon className={`w-8 h-8 mx-auto my-2 ${
                  day.weatherCode >= 51 ? 'text-blue-500' : 'text-yellow-500'
                }`} />
                <p className={`font-bold ${isSelected ? 'text-primary-900' : 'text-slate-900'}`}>
                  {Math.round(day.tempMax)}°
                </p>
                <p className="text-xs text-slate-500">{Math.round(day.tempMin)}°</p>
                {day.precipitationProbability > 30 && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Droplets className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-600">{day.precipitationProbability}%</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Details */}
        {selectedForecast && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Temperature Range</p>
                <p className="font-semibold text-slate-900">
                  {Math.round(selectedForecast.tempMin)}° - {Math.round(selectedForecast.tempMax)}°
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Rain Chance</p>
                <p className="font-semibold text-slate-900">
                  {selectedForecast.precipitationProbability}%
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Expected Rain</p>
                <p className="font-semibold text-slate-900">
                  {selectedForecast.precipitation.toFixed(1)} mm
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">ET₀ (Evapotranspiration)</p>
                <p className="font-semibold text-slate-900">
                  {selectedForecast.et0.toFixed(1)} mm
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Agricultural Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card mb-6"
      >
        <h2 className="section-header flex items-center gap-2">
          <Leaf className="w-5 h-5 text-slate-400" />
          Agricultural Metrics
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            icon={Thermometer}
            label="Growing Degree Days"
            value={weather.agricultural.gdd.toString()}
            sublabel="This week"
            color="text-orange-500"
          />
          <MetricCard
            icon={Droplets}
            label="Evapotranspiration"
            value={`${weather.agricultural.et0} mm`}
            sublabel="Daily ET₀"
            color="text-blue-500"
          />
          <MetricCard
            icon={TrendingUp}
            label="Heat Units"
            value={weather.agricultural.heatUnits.toString()}
            sublabel="This week"
            color="text-red-500"
          />
          <MetricCard
            icon={Clock}
            label="Chill Hours"
            value={weather.agricultural.chillHours.toString()}
            sublabel="48-hour forecast"
            color="text-cyan-500"
          />
        </div>
      </motion.div>

      {/* Spray Window & Irrigation Advisory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h2 className="section-header flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Optimal Spray Window
          </h2>

          {weather.agricultural.sprayWindow ? (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-800 font-semibold">
                    {new Date(weather.agricultural.sprayWindow.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(weather.agricultural.sprayWindow.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    Best time for spraying
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-700">
                    {weather.agricultural.sprayWindow.confidence}%
                  </p>
                  <p className="text-green-600 text-xs">Confidence</p>
                </div>
              </div>
              <p className="text-green-700 text-sm mt-3">
                {weather.agricultural.sprayWindow.conditions}
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-amber-800 font-medium">No suitable spray window found</p>
              <p className="text-amber-600 text-sm mt-1">
                Check forecast for better conditions
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h2 className="section-header flex items-center gap-2">
            <Umbrella className="w-5 h-5 text-slate-400" />
            Irrigation Advisory
          </h2>

          <div className={`rounded-lg p-4 ${
            weather.agricultural.irrigationAdvisory.includes('Reduce')
              ? 'bg-blue-50'
              : weather.agricultural.irrigationAdvisory.includes('Skip')
              ? 'bg-amber-50'
              : weather.agricultural.irrigationAdvisory.includes('Increase')
              ? 'bg-orange-50'
              : 'bg-green-50'
          }`}>
            <p className={`font-medium ${
              weather.agricultural.irrigationAdvisory.includes('Reduce')
                ? 'text-blue-800'
                : weather.agricultural.irrigationAdvisory.includes('Skip')
                ? 'text-amber-800'
                : weather.agricultural.irrigationAdvisory.includes('Increase')
                ? 'text-orange-800'
                : 'text-green-800'
            }`}>
              {weather.agricultural.irrigationAdvisory}
            </p>
            <p className="text-slate-600 text-sm mt-2">
              Based on real-time weather forecast and ET₀ calculations
            </p>
          </div>

          {weather.agricultural.frostRisk && (
            <div className="mt-3 bg-red-50 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 font-medium">Frost risk detected in forecast</span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function WeatherStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center">
      <Icon className="w-5 h-5 mx-auto text-blue-200" />
      <p className="text-lg font-semibold mt-1">{value}</p>
      <p className="text-xs text-blue-200">{label}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  sublabel: string;
  color: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
    </div>
  );
}
