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

  // Chart data from API history
  const chartData = useMemo(() => {
    const history = [...(healthData?.history || [])].reverse(); // Oldest first for chart

    return {
      labels: history.map((d) => {
        const date = new Date(d.recordDate);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }),
      datasets: [
        {
          label: 'Health Score',
          data: history.map((d) => d.healthScore),
          fill: true,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#16a34a',
        },
        {
          label: 'NDVI × 100',
          data: history.map((d) => Math.round(d.ndvi * 100)),
          fill: false,
          borderColor: '#3b82f6',
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [healthData]);

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

      {/* Health Trend Chart */}
      {healthData && healthData.history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header mb-0 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              {healthData.count}-Day Health Trend
            </h2>
          </div>

          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
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

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card bg-blue-50 border border-blue-200"
      >
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">About NDVI Health Score</h3>
            <p className="text-sm text-blue-700 mt-1">
              The health score is calculated from Normalized Difference Vegetation Index
              (NDVI) using Sentinel-2 satellite imagery. NDVI measures vegetation health
              using near-infrared and visible light reflectance. Scores above 60 indicate
              healthy crops, while scores below 40 may require intervention. Data is
              updated daily at 6 AM IST.
            </p>
            {lastRefresh && (
              <p className="text-xs text-blue-600 mt-2">
                Last updated: {lastRefresh.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
