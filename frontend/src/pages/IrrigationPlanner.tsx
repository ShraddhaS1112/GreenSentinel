/**
 * Green Sentinel - Irrigation Planner Page
 *
 * SIMPLIFIED version with honest data representation.
 * Shows weather-based irrigation advice without fake precision.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Droplets,
  Calendar,
  AlertCircle,
  CheckCircle,
  CloudRain,
  RefreshCw,
  Settings,
  Sun,
  Thermometer,
  Wind,
  Info,
  ArrowRight,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import { useTranslation } from '@/stores/preferencesStore';
import { fetchWeather, WeatherData } from '@/services/weatherService';

// Crop water needs (mm/day in peak season)
const CROP_WATER_NEEDS: Record<string, { low: number; high: number; name: string }> = {
  rice: { low: 6, high: 10, name: 'Rice' },
  wheat: { low: 3, high: 5, name: 'Wheat' },
  cotton: { low: 4, high: 7, name: 'Cotton' },
  sugarcane: { low: 5, high: 8, name: 'Sugarcane' },
  maize: { low: 4, high: 6, name: 'Maize' },
  vegetables: { low: 3, high: 5, name: 'Vegetables' },
  potato: { low: 3, high: 5, name: 'Potato' },
  tomato: { low: 4, high: 6, name: 'Tomato' },
};

interface SimpleAdvice {
  action: 'water_now' | 'water_soon' | 'wait' | 'skip_rain';
  title: string;
  message: string;
  color: string;
  bgColor: string;
  icon: 'alert' | 'droplet' | 'check' | 'rain';
}

export default function IrrigationPlanner() {
  const { t, language } = useTranslation();
  const { getCurrentFarm } = useFarmStore();
  const farm = getCurrentFarm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings
  const [cropType, setCropType] = useState(farm?.cropType?.toLowerCase() || 'vegetables');
  const [lastWateredDays, setLastWateredDays] = useState(2);

  const latitude = farm?.location?.latitude || 12.9716;
  const longitude = farm?.location?.longitude || 77.5946;

  // Load weather data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const weatherData = await fetchWeather(latitude, longitude);
      setWeather(weatherData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weather');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [latitude, longitude]);

  // Calculate simple advice based on weather
  const advice = useMemo((): SimpleAdvice | null => {
    if (!weather) return null;

    const today = weather.daily[0];
    const tomorrow = weather.daily[1];
    const crop = CROP_WATER_NEEDS[cropType] || CROP_WATER_NEEDS.vegetables;

    // Check for rain
    const rainToday = today.precipitation > 5;
    const rainTomorrow = tomorrow?.precipitation > 10 || tomorrow?.precipitationProbability > 70;
    const recentRain = weather.daily.slice(0, 3).reduce((sum, d) => sum + d.precipitation, 0) > 20;

    // Check temperature
    const isHot = today.tempMax > 35;
    const isVeryHot = today.tempMax > 40;

    // Simple decision logic
    if (rainToday || rainTomorrow) {
      return {
        action: 'skip_rain',
        title: t('irrigation.rainExpected'),
        message: t(rainToday ? 'irrigation.msgRainToday' : 'irrigation.msgRainTomorrow'),
        color: 'text-blue-700',
        bgColor: 'bg-blue-50 border-blue-200',
        icon: 'rain',
      };
    }

    if (recentRain && lastWateredDays < 2) {
      return {
        action: 'wait',
        title: t('irrigation.soilWet'),
        message: t('irrigation.msgSoilWet'),
        color: 'text-green-700',
        bgColor: 'bg-green-50 border-green-200',
        icon: 'check',
      };
    }

    if (isVeryHot || (isHot && lastWateredDays >= 2)) {
      return {
        action: 'water_now',
        title: t('irrigation.waterNow'),
        message: t('irrigation.msgWaterNow', { temp: today.tempMax }),
        color: 'text-red-700',
        bgColor: 'bg-red-50 border-red-200',
        icon: 'alert',
      };
    }

    if (lastWateredDays >= 3 || (lastWateredDays >= 2 && today.et0 > crop.high)) {
      return {
        action: 'water_soon',
        title: t('irrigation.waterToday'),
        message: t('irrigation.msgWaterSoon', { days: lastWateredDays }),
        color: 'text-orange-700',
        bgColor: 'bg-orange-50 border-orange-200',
        icon: 'droplet',
      };
    }

    return {
      action: 'wait',
      title: t('irrigation.noWaterNeeded'),
      message: t('irrigation.msgNoWater'),
      color: 'text-green-700',
      bgColor: 'bg-green-50 border-green-200',
      icon: 'check',
    };
  }, [weather, cropType, lastWateredDays, t]);

  // Weather summary
  const weatherSummary = useMemo(() => {
    if (!weather) return null;
    const today = weather.daily[0];
    const rainDays = weather.daily.slice(0, 5).filter(d => d.precipitation > 5).length;

    return {
      temp: Math.round(today.tempMax),
      humidity: Math.round(weather.current.humidity),
      windSpeed: Math.round(weather.current.windSpeed),
      rainDays,
      et0: today.et0.toFixed(1),
    };
  }, [weather]);

  if (loading && !weather) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="mt-4 text-slate-600">
            {t('irrigation.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card bg-red-50 border-l-4 border-red-500">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">
                {t('irrigation.failed')}
              </h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button
                onClick={loadData}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                {t('irrigation.retry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('irrigation.title')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('irrigation.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
        >
          <Settings className="w-4 h-4" />
          {t('irrigation.settings')}
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="card mb-6 bg-slate-50"
        >
          <h3 className="font-semibold text-slate-900 mb-4">
            {t('irrigation.tellFarm')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                {t('irrigation.cropType')}
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500"
              >
                {Object.entries(CROP_WATER_NEEDS).map(([key, val]) => (
                  <option key={key} value={key}>{val.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                {t('irrigation.lastWatered')}
              </label>
              <select
                value={lastWateredDays}
                onChange={(e) => setLastWateredDays(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500"
              >
                <option value={0}>{t('irrigation.today')}</option>
                <option value={1}>{t('irrigation.yesterday')}</option>
                <option value={2}>{t('irrigation.2daysAgo')}</option>
                <option value={3}>{t('irrigation.3daysAgo')}</option>
                <option value={4}>{t('irrigation.4plusDaysAgo')}</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* MAIN ADVICE CARD */}
      {advice && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-2xl p-6 mb-6 border-2 ${advice.bgColor}`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${advice.action === 'water_now' ? 'bg-red-200' : advice.action === 'skip_rain' ? 'bg-blue-200' : advice.action === 'water_soon' ? 'bg-orange-200' : 'bg-green-200'}`}>
              {advice.icon === 'alert' && <AlertCircle className="w-8 h-8 text-red-600" />}
              {advice.icon === 'droplet' && <Droplets className="w-8 h-8 text-orange-600" />}
              {advice.icon === 'check' && <CheckCircle className="w-8 h-8 text-green-600" />}
              {advice.icon === 'rain' && <CloudRain className="w-8 h-8 text-blue-600" />}
            </div>
            <div className="flex-1">
              <h2 className={`text-2xl font-bold ${advice.color}`}>{advice.title}</h2>
              <p className="text-slate-600 mt-2 text-lg">{advice.message}</p>
            </div>
          </div>

          {/* Best time to water */}
          {(advice.action === 'water_now' || advice.action === 'water_soon') && (
            <div className="mt-4 p-3 bg-white/60 rounded-xl">
              <p className="text-slate-700 font-medium">
                {t('irrigation.bestTime')}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {t('irrigation.avoidNoon')}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Weather Info Cards */}
      {weatherSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 text-center">
            <Thermometer className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{weatherSummary.temp}°C</p>
            <p className="text-sm text-slate-500">{t('irrigation.todayTemp')}</p>
          </div>
          <div className="card p-4 text-center">
            <Droplets className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{weatherSummary.humidity}%</p>
            <p className="text-sm text-slate-500">{t('weather.humidity')}</p>
          </div>
          <div className="card p-4 text-center">
            <Wind className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{weatherSummary.windSpeed}</p>
            <p className="text-sm text-slate-500">{t('irrigation.windSpeed')}</p>
          </div>
          <div className="card p-4 text-center">
            <CloudRain className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{weatherSummary.rainDays}</p>
            <p className="text-sm text-slate-500">{t('irrigation.rainDays')}</p>
          </div>
        </div>
      )}

      {/* 5-Day Forecast */}
      {weather && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <h2 className="section-header flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            {t('irrigation.5dayWeather')}
          </h2>

          <div className="space-y-3">
            {weather.daily.slice(0, 5).map((day, index) => {
              const date = new Date();
              date.setDate(date.getDate() + index);
              const isToday = index === 0;
              const hasRain = day.precipitation > 5 || day.precipitationProbability > 70;
              const isHot = day.tempMax > 35;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isToday ? 'bg-green-50 border border-green-200' : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {hasRain ? (
                      <CloudRain className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Sun className="w-6 h-6 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">
                        {isToday
                          ? t('irrigation.today')
                          : date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
                              weekday: 'short',
                              day: 'numeric',
                            })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {Math.round(day.tempMin)}° - {Math.round(day.tempMax)}°
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {hasRain ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        <CloudRain className="w-4 h-4" />
                        {Math.round(day.precipitation)}mm
                      </span>
                    ) : isHot ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                        {t('irrigation.hot')}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">
                        {t('irrigation.clear')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Water Saving Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-blue-50 border border-blue-200"
      >
        <h2 className="section-header flex items-center gap-2 text-blue-800">
          <Info className="w-5 h-5 text-blue-600" />
          {t('irrigation.waterTips')}
        </h2>

        <ul className="space-y-2 text-blue-700">
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
            <span>{t('irrigation.tip1')}</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
            <span>{t('irrigation.tip2')}</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
            <span>{t('irrigation.tip3')}</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
            <span>{t('irrigation.tip4')}</span>
          </li>
        </ul>
      </motion.div>

      {/* Honest Disclaimer */}
      <p className="text-xs text-slate-400 text-center mt-6">
        {t('irrigation.disclaimer')}
      </p>
    </div>
  );
}
