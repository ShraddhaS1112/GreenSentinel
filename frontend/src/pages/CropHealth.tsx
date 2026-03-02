/**
 * Green Sentinel - Crop Health Page
 *
 * Displays NDVI-based crop health data from satellite imagery with trends.
 * Fetches real data from AWS backend.
 */

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  Leaf,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  MapPin,
  Info,
  RefreshCw,
  Satellite,
  AlertTriangle,
  Map,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import { Line } from 'react-chartjs-2';

// Lazy load the map component
const SatelliteMap = lazy(() => import('@/components/SatelliteMap'));
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import * as api from '@/services/apiService';
import { ExplainedLabel } from '@/components/common/InfoTooltip';
import { getHealthAdvice, getNdviExplanation } from '@/utils/farmerFriendly';
import { usePreferencesStore } from '@/stores/preferencesStore';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function CropHealth() {
  const { getCurrentFarm } = useFarmStore();
  const { language } = usePreferencesStore();
  const farm = getCurrentFarm();

  const [healthData, setHealthData] = useState<api.CropHealthResponse | null>(null);
  const [satelliteData, setSatelliteData] = useState<api.SatelliteDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch crop health data from API
  const fetchData = async () => {
    if (!farm?.farmId) return;

    setLoading(true);
    setError(null);

    try {
      const [healthResponse, satResponse] = await Promise.all([
        api.getCropHealth(farm.farmId, 30),
        api.getSatelliteData(farm.farmId, 30),
      ]);

      if (healthResponse.error) {
        setError(healthResponse.error);
      } else {
        setHealthData(healthResponse.data);
      }

      if (satResponse.data) {
        setSatelliteData(satResponse.data);
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [farm?.farmId]);

  // Get current values from API data
  const currentHealth = healthData?.current;
  const currentScore = currentHealth?.healthScore || 0;
  const currentNdvi = currentHealth?.ndvi || 0;
  const trend = healthData?.trend || 'stable';

  // Calculate week-over-week change
  const historyItems = healthData?.history || [];
  const weekAgoScore = historyItems.length > 7 ? historyItems[7]?.healthScore || currentScore : currentScore;
  const scoreChange = currentScore - weekAgoScore;

  // Chart data from API history - simplified to just health score
  const chartData = useMemo(() => {
    const history = [...(healthData?.history || [])].reverse(); // Oldest first for chart

    return {
      labels: history.map((d) => {
        const date = new Date(d.recordDate);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }),
      datasets: [
        {
          label: language === 'hi' ? 'फसल स्वास्थ्य' : 'Crop Health',
          data: history.map((d) => d.healthScore),
          fill: true,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#16a34a',
        },
      ],
    };
  }, [healthData, language]);

  // Simple trend interpretation for farmers
  const trendInterpretation = useMemo(() => {
    if (!healthData?.history || healthData.history.length < 2) return null;

    const history = healthData.history;
    const latest = history[0]?.healthScore || 0;
    const twoDaysAgo = history[1]?.healthScore || latest;
    const weekAgo = history[6]?.healthScore || latest;

    const shortTermChange = latest - twoDaysAgo;
    const weeklyChange = latest - weekAgo;

    // Determine trend message
    let trendMessage = '';
    let trendColor = '';
    let trendIcon = '';
    let actionAdvice = '';

    if (language === 'hi') {
      if (weeklyChange > 5) {
        trendMessage = 'फसल में सुधार हो रहा है';
        trendColor = 'text-green-700 bg-green-50 border-green-200';
        trendIcon = '📈';
        actionAdvice = 'बहुत अच्छा! जो कर रहे हैं वो जारी रखें।';
      } else if (weeklyChange < -5) {
        trendMessage = 'फसल की हालत बिगड़ रही है';
        trendColor = 'text-red-700 bg-red-50 border-red-200';
        trendIcon = '📉';
        actionAdvice = 'ध्यान दें! पानी, कीट या बीमारी की जांच करें।';
      } else if (shortTermChange > 3) {
        trendMessage = 'पिछले 2 दिनों में थोड़ा सुधार';
        trendColor = 'text-green-600 bg-green-50 border-green-200';
        trendIcon = '↗️';
        actionAdvice = 'अच्छी प्रगति। देखभाल जारी रखें।';
      } else if (shortTermChange < -3) {
        trendMessage = 'पिछले 2 दिनों में थोड़ी गिरावट';
        trendColor = 'text-orange-700 bg-orange-50 border-orange-200';
        trendIcon = '↘️';
        actionAdvice = 'फसल की जांच करें - पानी या कीट की समस्या हो सकती है।';
      } else {
        trendMessage = 'फसल स्थिर है';
        trendColor = 'text-blue-700 bg-blue-50 border-blue-200';
        trendIcon = '➡️';
        actionAdvice = 'सब ठीक है। नियमित देखभाल जारी रखें।';
      }
    } else {
      if (weeklyChange > 5) {
        trendMessage = 'Crops are improving';
        trendColor = 'text-green-700 bg-green-50 border-green-200';
        trendIcon = '📈';
        actionAdvice = 'Great progress! Keep doing what you\'re doing.';
      } else if (weeklyChange < -5) {
        trendMessage = 'Crops are declining';
        trendColor = 'text-red-700 bg-red-50 border-red-200';
        trendIcon = '📉';
        actionAdvice = 'Attention needed! Check water, pests, or disease.';
      } else if (shortTermChange > 3) {
        trendMessage = 'Slight improvement in last 2 days';
        trendColor = 'text-green-600 bg-green-50 border-green-200';
        trendIcon = '↗️';
        actionAdvice = 'Good progress. Continue current care.';
      } else if (shortTermChange < -3) {
        trendMessage = 'Slight decline in last 2 days';
        trendColor = 'text-orange-700 bg-orange-50 border-orange-200';
        trendIcon = '↘️';
        actionAdvice = 'Check your crops - may need water or pest treatment.';
      } else {
        trendMessage = 'Crops are stable';
        trendColor = 'text-blue-700 bg-blue-50 border-blue-200';
        trendIcon = '➡️';
        actionAdvice = 'Everything normal. Continue regular care.';
      }
    }

    return {
      message: trendMessage,
      color: trendColor,
      icon: trendIcon,
      advice: actionAdvice,
      latest,
      twoDaysAgo,
      weekAgo,
      shortTermChange,
      weeklyChange,
    };
  }, [healthData, language]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 7, color: '#94a3b8' },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: '#f1f5f9' },
        ticks: { color: '#94a3b8', stepSize: 25 },
      },
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-lime-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreCategory = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-100 text-green-700' };
    if (score >= 60) return { label: 'Good', color: 'bg-lime-100 text-lime-700' };
    if (score >= 40) return { label: 'Moderate', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Poor', color: 'bg-red-100 text-red-700' };
  };

  const category = getScoreCategory(currentScore);

  // Get latest satellite info
  const latestSatellite = satelliteData?.data?.[0];

  if (!farm) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <Leaf className="empty-state-icon" />
          <h2 className="empty-state-title">No Farm Selected</h2>
          <p className="empty-state-description">
            Please select a farm to view crop health data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Crop Health</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {farm.name} • {farm.cropType}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="card mb-6 bg-red-50 border border-red-200">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-900">Error loading data</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !healthData && (
        <div className="card mb-6 flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-green-600" />
          <span className="ml-3 text-slate-600">Loading satellite data...</span>
        </div>
      )}

      {/* Current Score Card */}
      {healthData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Current Health Score</p>
              <div className="flex items-end gap-3">
                <span className={`text-5xl font-bold ${getScoreColor(currentScore)}`}>
                  {currentScore}
                </span>
                <span className="text-slate-400 text-lg mb-2">/100</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                  {category.label}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {trend === 'improving' || scoreChange > 3 ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 font-medium">
                      +{Math.abs(scoreChange)} points this week
                    </span>
                  </>
                ) : trend === 'declining' || scoreChange < -3 ? (
                  <>
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    <span className="text-red-600 font-medium">
                      {scoreChange} points this week
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-500 font-medium">Stable this week</span>
                  </>
                )}
              </div>

              {/* NDVI Value */}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div>
                  <span className="text-slate-500">NDVI:</span>
                  <span className="ml-2 font-semibold text-slate-700">{currentNdvi.toFixed(3)}</span>
                </div>
                {healthData.averageNdvi && (
                  <div>
                    <span className="text-slate-500">30-day avg:</span>
                    <span className="ml-2 font-semibold text-slate-700">
                      {healthData.averageNdvi.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Score gauge visualization */}
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={currentScore >= 60 ? '#22c55e' : currentScore >= 40 ? '#eab308' : '#ef4444'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${currentScore * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Leaf className={`w-6 h-6 ${getScoreColor(currentScore)}`} />
                <span className="text-xs text-slate-500 mt-1">NDVI</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Trend Interpretation Card - Simple farmer-friendly summary */}
      {trendInterpretation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl p-5 mb-6 border-2 ${trendInterpretation.color}`}
        >
          <div className="flex items-start gap-4">
            <span className="text-4xl">{trendInterpretation.icon}</span>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{trendInterpretation.message}</h3>
              <p className="mt-2 opacity-90">{trendInterpretation.advice}</p>

              {/* Simple comparison boxes */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-white/60 rounded-lg p-3 text-center">
                  <p className="text-xs opacity-70">
                    {language === 'hi' ? '7 दिन पहले' : '7 days ago'}
                  </p>
                  <p className="text-xl font-bold">{trendInterpretation.weekAgo}</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 text-center">
                  <p className="text-xs opacity-70">
                    {language === 'hi' ? '2 दिन पहले' : '2 days ago'}
                  </p>
                  <p className="text-xl font-bold">{trendInterpretation.twoDaysAgo}</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center border-2 border-current">
                  <p className="text-xs opacity-70">
                    {language === 'hi' ? 'आज' : 'Today'}
                  </p>
                  <p className="text-2xl font-bold">{trendInterpretation.latest}</p>
                </div>
              </div>

              {/* Change indicators */}
              <div className="mt-3 flex gap-4 text-sm">
                <span>
                  {language === 'hi' ? 'इस हफ्ते:' : 'This week:'}{' '}
                  <strong className={trendInterpretation.weeklyChange >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {trendInterpretation.weeklyChange >= 0 ? '+' : ''}{trendInterpretation.weeklyChange}
                  </strong>
                </span>
                <span>
                  {language === 'hi' ? '2 दिन में:' : 'Last 2 days:'}{' '}
                  <strong className={trendInterpretation.shortTermChange >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {trendInterpretation.shortTermChange >= 0 ? '+' : ''}{trendInterpretation.shortTermChange}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Health Trend Chart - Simplified */}
      {healthData && healthData.history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header mb-0 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              {language === 'hi' ? `${healthData.count} दिन का रुझान` : `${healthData.count}-Day Trend`}
            </h2>
          </div>

          {/* Chart explanation */}
          <p className="text-sm text-slate-500 mb-4">
            {language === 'hi'
              ? '📊 यह चार्ट दिखाता है कि आपकी फसल का स्वास्थ्य समय के साथ कैसे बदल रहा है। ऊपर जाना = अच्छा, नीचे जाना = ध्यान दें।'
              : '📊 This chart shows how your crop health changed over time. Going up = good, going down = needs attention.'}
          </p>

          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Simple legend explanation */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <span className="w-4 h-1 bg-green-500 rounded"></span>
              {language === 'hi'
                ? 'हरी रेखा = फसल का स्वास्थ्य स्कोर (0-100)। 60 से ऊपर अच्छा है।'
                : 'Green line = Crop health score (0-100). Above 60 is good.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Satellite Data Info */}
      {latestSatellite && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card mb-6"
        >
          <h2 className="section-header flex items-center gap-2">
            <Satellite className="w-5 h-5 text-slate-400" />
            Latest Satellite Data
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Capture Date</p>
              <p className="font-semibold text-slate-700">
                {new Date(latestSatellite.captureDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">
                <ExplainedLabel term="ndvi" label="NDVI Index" />
              </p>
              <p className="font-semibold text-green-600">{latestSatellite.ndvi.toFixed(3)}</p>
              <p className="text-xs text-green-700 mt-1">{getNdviExplanation(latestSatellite.ndvi, language).replace(/[🌿🌱🌾🍂⚠️]/g, '').trim()}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">
                <ExplainedLabel term="ndwi" label="NDWI (Water)" />
              </p>
              <p className="font-semibold text-blue-600">{latestSatellite.ndwi.toFixed(3)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Cloud Cover</p>
              <p className="font-semibold text-slate-700">{latestSatellite.cloudCover}%</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">
                <ExplainedLabel term="lai" label="LAI (Leaf Area)" />
              </p>
              <p className="font-semibold text-slate-700">{latestSatellite.lai.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Data Source</p>
              <p className="font-semibold text-slate-700 capitalize">{latestSatellite.source}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg col-span-2">
              <p className="text-xs text-slate-500">
                <ExplainedLabel term="healthScore" label="Health Status" />
              </p>
              <p className={`font-semibold capitalize ${getScoreColor(latestSatellite.healthScore)}`}>
                {latestSatellite.healthStatus} ({latestSatellite.healthScore}/100)
              </p>
              <p className={`text-xs mt-1 ${getHealthAdvice(latestSatellite.healthScore, language).color}`}>
                {getHealthAdvice(latestSatellite.healthScore, language).action}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Satellite Map View */}
      {farm?.location?.latitude && farm?.location?.longitude && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="card mb-6"
        >
          <h2 className="section-header flex items-center gap-2">
            <Map className="w-5 h-5 text-slate-400" />
            Satellite View of Your Farm
          </h2>
          <Suspense
            fallback={
              <div className="h-[400px] bg-slate-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-500">Loading map...</span>
              </div>
            }
          >
            <SatelliteMap
              latitude={farm.location.latitude}
              longitude={farm.location.longitude}
              farmName={farm.name}
              bbox={latestSatellite?.bbox as number[] | undefined}
              ndvi={latestSatellite?.ndvi}
              healthStatus={latestSatellite?.healthStatus}
            />
          </Suspense>
          <p className="text-xs text-slate-500 mt-3 text-center">
            Use layer buttons to switch between satellite, terrain, and street views.
            Click "NDVI View" for detailed vegetation analysis.
          </p>
        </motion.div>
      )}

      {/* Recommendations */}
      {currentHealth?.recommendations && currentHealth.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card mb-6"
        >
          <h2 className="section-header flex items-center gap-2">
            <Leaf className="w-5 h-5 text-slate-400" />
            Recommendations
          </h2>
          <ul className="space-y-2">
            {currentHealth.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span className="text-slate-700">{rec}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Score Calculation Basis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card bg-blue-50 border border-blue-200"
      >
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-blue-900">How Health Score is Calculated</h3>
            <p className="text-sm text-blue-700 mt-1">
              Derived from Sentinel-2 satellite imagery (ESA Copernicus programme) processed daily at 6 AM IST.
            </p>

            {/* NDVI Formula */}
            <div className="mt-3 p-3 bg-white rounded-lg border border-blue-100">
              <p className="text-xs font-semibold text-slate-700 mb-1">NDVI Formula</p>
              <p className="font-mono text-sm text-blue-800 font-bold">NDVI = (NIR − Red) / (NIR + Red)</p>
              <p className="text-xs text-slate-500 mt-1">
                NIR = Band 8 (842nm) · Red = Band 4 (665nm) · Range: −1.0 to +1.0
              </p>
            </div>

            {/* Score bands */}
            <div className="mt-3 grid grid-cols-1 gap-1">
              <p className="text-xs font-semibold text-slate-700 mb-1">Score Bands</p>
              {[
                { range: 'NDVI ≥ 0.60', label: 'Excellent', score: '95', color: 'text-green-700 bg-green-50' },
                { range: 'NDVI ≥ 0.45', label: 'Good',      score: '80', color: 'text-lime-700 bg-lime-50' },
                { range: 'NDVI ≥ 0.30', label: 'Moderate',  score: '60', color: 'text-yellow-700 bg-yellow-50' },
                { range: 'NDVI ≥ 0.15', label: 'Stressed',  score: '40', color: 'text-orange-700 bg-orange-50' },
                { range: 'NDVI < 0.15', label: 'Poor',      score: '20', color: 'text-red-700 bg-red-50' },
              ].map(row => (
                <div key={row.label} className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs ${row.color}`}>
                  <span className="font-mono">{row.range}</span>
                  <span className="font-medium">{row.label} · Score {row.score}</span>
                </div>
              ))}
            </div>

            {lastRefresh && (
              <p className="text-xs text-blue-600 mt-3">
                Data updated: {lastRefresh.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
