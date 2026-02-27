/**
 * Green Sentinel - Irrigation Planner Page
 *
 * Smart irrigation recommendations based on REAL weather data.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Droplets,
  Calendar,
  Clock,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  MapPin,
  BarChart3,
  Leaf,
  CloudRain,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import { fetchWeather, WeatherData } from '@/services/weatherService';
import {
  calculateIrrigation,
  IrrigationData,
} from '@/services/irrigationService';

const stressColors: Record<string, string> = {
  none: 'bg-green-100 text-green-800',
  mild: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800',
  adequate: 'bg-green-100 text-green-800',
  moderate_stress: 'bg-orange-100 text-orange-800',
  severe_stress: 'bg-red-100 text-red-800',
  waterlogged: 'bg-blue-100 text-blue-800',
};

const stressLabels: Record<string, string> = {
  none: 'No Stress',
  mild: 'Mild Stress',
  moderate: 'Moderate Stress',
  severe: 'Severe Stress',
  adequate: 'Adequate',
  moderate_stress: 'Moderate Stress',
  severe_stress: 'Severe Stress',
  waterlogged: 'Waterlogged',
};

export default function IrrigationPlanner() {
  const { getCurrentFarm } = useFarmStore();
  const farm = getCurrentFarm();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [irrigationData, setIrrigationData] = useState<IrrigationData | null>(null);

  // Settings
  const [cropType, setCropType] = useState('vegetables');
  const [soilType, setSoilType] = useState('loamy');
  const [areaHectares, setAreaHectares] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Get farm coordinates or use default
  const latitude = farm?.location?.latitude || 12.9716;
  const longitude = farm?.location?.longitude || 77.5946;

  // Load data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const weatherData = await fetchWeather(latitude, longitude);
      setWeather(weatherData);

      const irrigation = calculateIrrigation(
        weatherData,
        cropType,
        soilType,
        areaHectares
      );
      setIrrigationData(irrigation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [latitude, longitude, cropType, soilType, areaHectares]);

  if (loading && !irrigationData) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="mt-4 text-slate-600">Calculating irrigation needs...</p>
          <p className="text-sm text-slate-400 mt-1">
            Analyzing weather data and soil conditions
          </p>
        </div>
      </div>
    );
  }

  if (error && !irrigationData) {
    return (
      <div className="page-container">
        <div className="card bg-red-50 border-l-4 border-red-500">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Failed to load irrigation data</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button
                onClick={loadData}
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

  if (!irrigationData || !weather) return null;

  const data = irrigationData;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Irrigation Planner</h1>
          <p className="text-slate-500 mt-1">
            Smart irrigation recommendations for {farm?.name || 'your farm'}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Live Data Badge */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Based on Live Weather Data
        </span>
        <span className="text-xs text-slate-500">
          {cropType.charAt(0).toUpperCase() + cropType.slice(1)} • {soilType.charAt(0).toUpperCase() + soilType.slice(1)} soil • {areaHectares} ha
        </span>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="card mb-6 bg-slate-50"
        >
          <h3 className="font-semibold text-slate-900 mb-4">Irrigation Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Crop Type</label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500"
              >
                <option value="rice">Rice</option>
                <option value="wheat">Wheat</option>
                <option value="cotton">Cotton</option>
                <option value="sugarcane">Sugarcane</option>
                <option value="maize">Maize</option>
                <option value="potato">Potato</option>
                <option value="tomato">Tomato</option>
                <option value="onion">Onion</option>
                <option value="vegetables">Vegetables</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Soil Type</label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500"
              >
                <option value="sandy">Sandy</option>
                <option value="loamy">Loamy</option>
                <option value="clay">Clay</option>
                <option value="silty">Silty</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Area (hectares)</label>
              <input
                type="number"
                value={areaHectares}
                onChange={(e) => setAreaHectares(Math.max(0.1, parseFloat(e.target.value) || 1))}
                min="0.1"
                step="0.5"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Recommendation Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`card mb-6 ${
          data.recommendation.action === 'irrigate_now'
            ? 'bg-red-50 border-l-4 border-red-500'
            : data.recommendation.action === 'irrigate_soon'
            ? 'bg-amber-50 border-l-4 border-amber-500'
            : data.recommendation.action === 'skip_rain_expected'
            ? 'bg-blue-50 border-l-4 border-blue-500'
            : 'bg-green-50 border-l-4 border-green-500'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {data.recommendation.action === 'irrigate_now' ? (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            ) : data.recommendation.action === 'skip_rain_expected' ? (
              <CloudRain className="w-6 h-6 text-blue-600 flex-shrink-0" />
            ) : data.recommendation.action === 'wait' ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <Droplets className="w-6 h-6 text-amber-600 flex-shrink-0" />
            )}
            <div>
              <h3 className={`font-semibold ${
                data.recommendation.action === 'irrigate_now' ? 'text-red-800' :
                data.recommendation.action === 'skip_rain_expected' ? 'text-blue-800' :
                data.recommendation.action === 'wait' ? 'text-green-800' :
                'text-amber-800'
              }`}>
                {data.recommendation.action === 'irrigate_now' ? 'Immediate Irrigation Needed' :
                 data.recommendation.action === 'irrigate_soon' ? 'Irrigation Recommended Soon' :
                 data.recommendation.action === 'skip_rain_expected' ? 'Skip Irrigation - Rain Expected' :
                 'Adequate Moisture'}
              </h3>
              <p className="text-slate-600 mt-1">{data.recommendation.reason}</p>
            </div>
          </div>

          {data.recommendation.waterNeeded > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">
                {(data.recommendation.waterNeeded / 1000).toFixed(0)}K L
              </p>
              <p className="text-slate-500 text-sm">Water Needed</p>
            </div>
          )}
        </div>

        {data.recommendation.waterNeeded > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">
                Best time: <strong>{data.recommendation.optimalTime}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">
                Duration: <strong>{data.recommendation.duration} minutes</strong>
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Soil Moisture & Water Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <h2 className="section-header flex items-center gap-2">
            <Droplets className="w-5 h-5 text-slate-400" />
            Estimated Soil Moisture
          </h2>

          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-600">Current Level</span>
              <span className={`text-sm font-medium ${
                data.soilMoisture.status === 'adequate' ? 'text-green-600' :
                data.soilMoisture.status === 'moderate_stress' ? 'text-amber-600' :
                'text-red-600'
              }`}>
                {data.soilMoisture.current}%
              </span>
            </div>

            {/* Moisture Bar */}
            <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden">
              {/* Optimal range indicator */}
              <div
                className="absolute h-full bg-green-200"
                style={{
                  left: `${data.soilMoisture.optimalRange.min}%`,
                  width: `${data.soilMoisture.optimalRange.max - data.soilMoisture.optimalRange.min}%`,
                }}
              />
              {/* Current level */}
              <div
                className={`h-full rounded-full transition-all ${
                  data.soilMoisture.status === 'adequate' ? 'bg-green-500' :
                  data.soilMoisture.status === 'moderate_stress' ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${data.soilMoisture.current}%` }}
              />
            </div>

            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>Wilting ({data.soilMoisture.wiltingPoint}%)</span>
              <span>Optimal</span>
              <span>Field Cap. ({data.soilMoisture.fieldCapacity}%)</span>
            </div>
          </div>

          <div className={`rounded-lg p-3 ${stressColors[data.soilMoisture.status]}`}>
            <p className="font-medium">{stressLabels[data.soilMoisture.status]}</p>
            <p className="text-xs mt-1 opacity-75">Estimated from weather and ET₀</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="section-header flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            Water Balance (7 days)
          </h2>

          <div className="space-y-3">
            <BalanceRow
              label="Rainfall"
              value={data.waterBalance.rainfall}
              color="bg-blue-500"
              icon={CloudRain}
            />
            <BalanceRow
              label="Irrigation"
              value={data.waterBalance.irrigation}
              color="bg-cyan-500"
              icon={Droplets}
            />
            <BalanceRow
              label="Evapotranspiration"
              value={-data.waterBalance.evapotranspiration}
              color="bg-orange-500"
              icon={TrendingDown}
            />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-600">Net Balance</span>
              <span className={`font-bold ${
                data.waterBalance.deficit > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {data.waterBalance.deficit > 0 ? `-${data.waterBalance.deficit}` : `+${data.waterBalance.surplus}`} mm
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Zone Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card mb-6"
      >
        <h2 className="section-header flex items-center gap-2">
          <MapPin className="w-5 h-5 text-slate-400" />
          Zone-wise Status (Estimated)
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.zones
            .sort((a, b) => a.priority - b.priority)
            .map((zone) => (
              <button
                key={zone.zoneId}
                onClick={() => setSelectedZone(zone.zoneId === selectedZone ? null : zone.zoneId)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedZone === zone.zoneId
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">{zone.zoneName}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${stressColors[zone.stressLevel]}`}>
                    P{zone.priority}
                  </span>
                </div>

                {/* Moisture gauge */}
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all ${
                      zone.stressLevel === 'severe' ? 'bg-red-500' :
                      zone.stressLevel === 'moderate' ? 'bg-orange-500' :
                      zone.stressLevel === 'mild' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${zone.moistureLevel}%` }}
                  />
                </div>

                <p className="text-sm text-slate-600">
                  Moisture: <strong>{zone.moistureLevel}%</strong>
                </p>

                {zone.waterNeeded > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Needs {(zone.waterNeeded / 1000).toFixed(0)}K L
                  </p>
                )}
              </button>
            ))}
        </div>
      </motion.div>

      {/* Weekly Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card mb-6"
      >
        <h2 className="section-header flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          Recommended Schedule
        </h2>

        <div className="space-y-3">
          {data.schedule.map((item, index) => {
            const date = new Date(item.date);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  item.status === 'skipped'
                    ? 'bg-slate-100'
                    : isToday
                    ? 'bg-primary-50 border border-primary-200'
                    : 'bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : item.status === 'skipped' ? (
                    <CloudRain className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-primary-500" />
                  )}

                  <div>
                    <p className="font-medium text-slate-900">
                      {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {item.time && ` at ${item.time}`}
                    </p>
                    {item.status === 'skipped' ? (
                      <p className="text-sm text-slate-500">{item.skipReason}</p>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Zones: {item.zones.map(z => data.zones.find(zone => zone.zoneId === z)?.zoneName).join(', ') || 'All'}
                      </p>
                    )}
                  </div>
                </div>

                {item.waterAmount > 0 && (
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {(item.waterAmount / 1000).toFixed(0)}K L
                    </p>
                    <p className="text-xs text-slate-500">{item.duration} min</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Water Savings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card bg-gradient-to-br from-green-500 to-green-600 text-white"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Leaf className="w-5 h-5" />
          Estimated Water Savings with Smart Irrigation
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-3xl font-bold">{data.savings.percentageVsTraditional}%</p>
            <p className="text-green-200 text-sm">vs Traditional</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{(data.savings.thisWeek / 1000).toFixed(0)}K</p>
            <p className="text-green-200 text-sm">Liters this week</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{(data.savings.thisSeason / 1000).toFixed(0)}K</p>
            <p className="text-green-200 text-sm">Liters this season</p>
          </div>
          <div>
            <p className="text-3xl font-bold">₹{data.savings.costSavings}</p>
            <p className="text-green-200 text-sm">Cost saved/month</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function BalanceRow({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: typeof Droplets;
}) {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const maxValue = 50;

  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-4 h-4 ${isNegative ? 'text-orange-500' : 'text-blue-500'}`} />
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-slate-600">{label}</span>
          <span className="text-sm font-medium text-slate-900">
            {isNegative ? '-' : '+'}{absValue} mm
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${Math.min(100, (absValue / maxValue) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
