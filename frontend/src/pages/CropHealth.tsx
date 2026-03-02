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

  // Helper: is a record from the simulated processor?
  const isSimulated = (source?: string) =>
    !source || source.toLowerCase() === 'simulated';

  // Filter history to real satellite records only
  const realHistory = (healthData?.history || []).filter(
    (r) => !isSimulated(r.source)
  );

  // Use real history for current values; fall back to null if no real data
  const currentHealth = realHistory[0] ?? null;
  const currentScore = currentHealth?.healthScore ?? 0;
  const currentNdvi = currentHealth?.ndvi ?? 0;
  const trend = healthData?.trend || 'stable';

  // Calculate week-over-week change from real records
  const weekAgoRecord = realHistory.length > 1 ? realHistory[realHistory.length - 1] : null;
  const scoreChange = weekAgoRecord ? currentScore - weekAgoRecord.healthScore : 0;

  // True if we have no real data at all
  const noRealData = !loading && healthData !== null && realHistory.length === 0;

  // Chart data from real history only
  const chartData = useMemo(() => {
    const history = [...realHistory].reverse(); // Oldest first for chart

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

  // Simple trend interpretation for farmers (real records only)
  const trendInterpretation = useMemo(() => {
    if (realHistory.length < 2) return null;

    const history = realHistory;
    const latestRecord = history[0];
    const prevRecord = history[1] || history[0];
    const oldRecord = history[Math.min(6, history.length - 1)] || history[0];

    const latest = latestRecord?.healthScore || 0;
    const twoDaysAgo = prevRecord?.healthScore || latest;
    const weekAgo = oldRecord?.healthScore || latest;

    const shortTermChange = latest - twoDaysAgo;
    const weeklyChange = latest - weekAgo;

    const fmtDate = (d: string) =>
      new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const latestDate = latestRecord?.recordDate ? fmtDate(latestRecord.recordDate) : 'Today';
    const prevDate = prevRecord?.recordDate ? fmtDate(prevRecord.recordDate) : '--';
    const oldDate = oldRecord?.recordDate ? fmtDate(oldRecord.recordDate) : '--';

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
      latestDate,
      prevDate,
      oldDate,
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

  // Get latest real satellite record (exclude simulated)
  const latestSatellite = satelliteData?.data?.find(
    (d) => !isSimulated(d.source)
  ) ?? null;

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

      {/* No real satellite data state */}
      {noRealData && (
        <div className="card mb-6 bg-amber-50 border border-amber-200">
          <div className="flex gap-3">
            <Satellite className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Awaiting Real Satellite Data</h3>
              <p className="text-sm text-amber-700 mt-1">
                No verified Sentinel-2 capture is available for your farm yet. Real data arrives every ~5 days when cloud cover is below 30%. Check back after the next satellite pass.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Score Card */}
      {currentHealth && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex items-center gap-4">
            {/* Score info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Current Health Score</p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-4xl font-bold leading-none ${getScoreColor(currentScore)}`}>
                  {currentScore}
                </span>
                <span className="text-slate-400 text-sm">/100</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${category.color}`}>
                  {category.label}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                {trend === 'improving' || scoreChange > 3 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-green-600 text-sm font-medium">+{Math.abs(scoreChange)} pts this week</span>
                  </>
                ) : trend === 'declining' || scoreChange < -3 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-600 text-sm font-medium">{scoreChange} pts this week</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500 text-sm font-medium">Stable this week</span>
                  </>
                )}
              </div>

              {/* NDVI row */}
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <span>NDVI <span className="font-semibold text-slate-700">{currentNdvi.toFixed(3)}</span></span>
                {healthData?.averageNdvi && (
                  <span>30d avg <span className="font-semibold text-slate-700">{healthData.averageNdvi.toFixed(3)}</span></span>
                )}
              </div>
            </div>

            {/* Compact gauge */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={currentScore >= 60 ? '#22c55e' : currentScore >= 40 ? '#eab308' : '#ef4444'}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${currentScore * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Leaf className={`w-5 h-5 ${getScoreColor(currentScore)}`} />
                <span className="text-[10px] text-slate-500 mt-0.5">NDVI</span>
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

              {/* Simple comparison boxes — dates from actual satellite captures */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-white/60 rounded-lg p-3 text-center">
                  <p className="text-xs opacity-70 truncate">{trendInterpretation.oldDate}</p>
                  <p className="text-xl font-bold">{trendInterpretation.weekAgo}</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 text-center">
                  <p className="text-xs opacity-70 truncate">{trendInterpretation.prevDate}</p>
                  <p className="text-xl font-bold">{trendInterpretation.twoDaysAgo}</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center border-2 border-current">
                  <p className="text-xs opacity-70 truncate">{trendInterpretation.latestDate}</p>
                  <p className="text-2xl font-bold">{trendInterpretation.latest}</p>
                </div>
              </div>

              {/* Change indicators */}
              <div className="mt-3 flex gap-4 text-sm">
                <span>
                  {language === 'hi' ? 'कुल बदलाव:' : 'Overall:'}{' '}
                  <strong className={trendInterpretation.weeklyChange >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {trendInterpretation.weeklyChange >= 0 ? '+' : ''}{trendInterpretation.weeklyChange}
                  </strong>
                </span>
                <span>
                  {language === 'hi' ? 'पिछले से:' : 'From prev:'}{' '}
                  <strong className={trendInterpretation.shortTermChange >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {trendInterpretation.shortTermChange >= 0 ? '+' : ''}{trendInterpretation.shortTermChange}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Single record — not enough to draw a trend */}
      {realHistory.length === 1 && (() => {
        const lastDate = new Date(realHistory[0].recordDate);
        const nextPass = new Date(lastDate);
        nextPass.setDate(nextPass.getDate() + 5);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((nextPass.getTime() - today.getTime()) / 86400000);
        const nextPassLabel = nextPass.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const passNote = daysUntil > 0
          ? `Next pass expected around ${nextPassLabel} (${daysUntil}d).`
          : `Pass was due ${nextPassLabel} — likely delayed by cloud cover.`;
        return (
          <div className="card mb-6 bg-slate-50 border border-slate-200">
            <div className="flex gap-3 items-start">
              <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-700">Only 1 satellite capture so far</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  A trend chart needs at least 2 data points. {passNote}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Health Trend Chart - Simplified */}
      {realHistory.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header mb-0 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              {language === 'hi' ? `${realHistory.length} रिकॉर्ड का रुझान` : `${realHistory.length}-Record Trend`}
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
              <p className="font-semibold text-slate-700 capitalize">
                {latestSatellite.source && latestSatellite.source.toLowerCase() !== 'simulated'
                  ? latestSatellite.source
                  : 'Sentinel-2'}
              </p>
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
