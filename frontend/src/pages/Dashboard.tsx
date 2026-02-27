/**
 * Green Sentinel - Dashboard Page
 *
 * Main dashboard showing farm overview, crop health, weather alerts,
 * and disease forecasts from real API data.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Leaf,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Cloud,
  Droplets,
  Bug,
  RefreshCw,
  Satellite,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import * as api from '@/services/apiService';

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

interface DashboardData {
  cropHealth: api.CropHealthResponse | null;
  alerts: api.Alert[];
  forecast: api.ForecastResponse | null;
  satellite: api.SatelliteDataResponse | null;
}

export default function Dashboard() {
  const { getCurrentFarm } = useFarmStore();
  const farm = getCurrentFarm();

  const [data, setData] = useState<DashboardData>({
    cropHealth: null,
    alerts: [],
    forecast: null,
    satellite: null,
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch dashboard data
  const fetchData = async () => {
    if (!farm?.farmId) return;

    setLoading(true);
    try {
      const [healthRes, alertsRes, forecastRes, satRes] = await Promise.all([
        api.getCropHealth(farm.farmId, 7),
        api.getAlerts(farm.farmId),
        api.getForecast(farm.farmId),
        api.getSatelliteData(farm.farmId, 7),
      ]);

      setData({
        cropHealth: healthRes.data,
        alerts: alertsRes.data || [],
        forecast: forecastRes.data,
        satellite: satRes.data,
      });
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [farm?.farmId]);

  // Calculate health score stats
  const healthStats = useMemo(() => {
    const current = data.cropHealth?.current;
    const history = data.cropHealth?.history || [];

    const currentScore = current?.healthScore || 0;
    const weekAgoScore = history.length > 6 ? history[6]?.healthScore || currentScore : currentScore;
    const change = currentScore - weekAgoScore;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (change > 3) trend = 'improving';
    else if (change < -3) trend = 'declining';

    return { currentScore, change, trend, ndvi: current?.ndvi || 0 };
  }, [data.cropHealth]);

  // Get recent alerts (last 24 hours)
  const recentAlerts = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return data.alerts.filter(
      (a) => new Date(a.alertTimestamp).getTime() > dayAgo
    );
  }, [data.alerts]);

  // Get high-risk forecasts
  const highRiskForecasts = useMemo(() => {
    const latest = data.forecast?.latest;
    if (!latest) return { diseases: [], pests: [] };

    return {
      diseases: latest.diseases.filter((d) => d.risk > 50),
      pests: latest.pests.filter((p) => p.risk > 50),
    };
  }, [data.forecast]);

  if (!farm) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <AlertTriangle className="empty-state-icon" />
          <h2 className="empty-state-title">No Farm Selected</h2>
          <p className="empty-state-description">
            Please select a farm from the sidebar or create a new one.
          </p>
          <Link to="/farms" className="btn-primary mt-4">
            Manage Farms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{farm.name}</h1>
          <p className="text-slate-500 mt-1">
            {farm.location.district}, {farm.location.state} • {farm.cropType}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {/* Crop Health Card */}
        <motion.div variants={cardVariants} className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Crop Health</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-900">
                  {loading ? '--' : healthStats.currentScore}
                </span>
                <span className="text-slate-400 text-sm mb-1">/100</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {healthStats.trend === 'improving' ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">
                      +{healthStats.change} this week
                    </span>
                  </>
                ) : healthStats.trend === 'declining' ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">
                      {healthStats.change} this week
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">Stable</span>
                  </>
                )}
              </div>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                healthStats.currentScore >= 70
                  ? 'bg-green-100'
                  : healthStats.currentScore >= 50
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
              }`}
            >
              <Leaf
                className={`w-6 h-6 ${
                  healthStats.currentScore >= 70
                    ? 'text-green-600'
                    : healthStats.currentScore >= 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              />
            </div>
          </div>
          <Link
            to="/health"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4"
          >
            View details <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Active Alerts Card */}
        <motion.div variants={cardVariants} className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Alerts</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-900">
                  {loading ? '--' : recentAlerts.length}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                {data.alerts.length} total alerts
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                recentAlerts.length > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 ${
                  recentAlerts.length > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              />
            </div>
          </div>
          <Link
            to="/threats"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4"
          >
            View history <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Disease Risk Card */}
        <motion.div variants={cardVariants} className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Disease Risk</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-900">
                  {loading ? '--' : highRiskForecasts.diseases.length}
                </span>
                <span className="text-slate-400 text-sm mb-1">high risk</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                {highRiskForecasts.pests.length} pest warnings
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                highRiskForecasts.diseases.length > 0 ? 'bg-orange-100' : 'bg-green-100'
              }`}
            >
              <Bug
                className={`w-6 h-6 ${
                  highRiskForecasts.diseases.length > 0 ? 'text-orange-600' : 'text-green-600'
                }`}
              />
            </div>
          </div>
          <Link
            to="/scanner"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4"
          >
            Scan for disease <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* NDVI/Satellite Card */}
        <motion.div variants={cardVariants} className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">NDVI Index</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-900">
                  {loading ? '--' : healthStats.ndvi.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                {data.satellite?.data?.[0]?.healthStatus || 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Satellite className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <Link
            to="/health"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4"
          >
            View satellite data <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </motion.div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header mb-0 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-slate-400" />
              Recent Alerts
            </h2>
            <Link
              to="/threats"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : data.alerts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No recent alerts</p>
              <p className="text-sm">Your farm is secure</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.alerts.slice(0, 5).map((alert) => (
                <AlertListItem key={alert.alertId} alert={alert} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Disease & Pest Forecast */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header mb-0 flex items-center gap-2">
              <Bug className="w-5 h-5 text-slate-400" />
              Disease & Pest Forecast
            </h2>
            <Link
              to="/weather"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Weather details
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : !data.forecast?.latest ? (
            <div className="text-center py-8 text-slate-500">
              <Bug className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No forecast data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.forecast.latest.diseases.slice(0, 3).map((disease, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    disease.risk > 70 ? 'bg-red-50' :
                    disease.risk > 50 ? 'bg-orange-50' :
                    disease.risk > 30 ? 'bg-yellow-50' : 'bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{disease.name}</span>
                    <span className={`text-sm font-medium ${
                      disease.risk > 70 ? 'text-red-600' :
                      disease.risk > 50 ? 'text-orange-600' :
                      disease.risk > 30 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {disease.risk}% risk
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Affects: {disease.affectedCrops.join(', ')}
                  </p>
                </div>
              ))}

              {data.forecast.latest.pests.slice(0, 2).map((pest, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    pest.risk > 70 ? 'bg-red-50' :
                    pest.risk > 50 ? 'bg-orange-50' : 'bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{pest.name}</span>
                    <span className={`text-sm font-medium ${
                      pest.risk > 70 ? 'text-red-600' :
                      pest.risk > 50 ? 'text-orange-600' : 'text-yellow-600'
                    }`}>
                      {pest.risk}% risk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="card mt-6"
      >
        <h2 className="section-header">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/scanner"
            className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Bug className="w-6 h-6 text-green-600" />
            <span className="text-sm font-medium text-green-700">Scan Disease</span>
          </Link>
          <Link
            to="/irrigation"
            className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Droplets className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Irrigation</span>
          </Link>
          <Link
            to="/weather"
            className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Cloud className="w-6 h-6 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">Weather</span>
          </Link>
          <Link
            to="/health"
            className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Satellite className="w-6 h-6 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Satellite View</span>
          </Link>
        </div>
      </motion.div>

      {/* Last update time */}
      {lastRefresh && (
        <p className="text-xs text-slate-400 text-center mt-4">
          Last updated: {lastRefresh.toLocaleString('en-IN')}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function AlertListItem({ alert }: { alert: api.Alert }) {
  const severityColors = {
    critical: 'bg-red-100 text-red-600',
    high: 'bg-orange-100 text-orange-600',
    medium: 'bg-yellow-100 text-yellow-600',
    low: 'bg-green-100 text-green-600',
  };

  const timeAgo = getRelativeTime(new Date(alert.alertTimestamp));

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          severityColors[alert.severity]
        }`}
      >
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">
          {alert.title}
        </p>
        <p className="text-xs text-slate-500">
          {alert.alertType} • {timeAgo}
        </p>
      </div>
      <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[alert.severity]}`}>
        {alert.severity}
      </span>
    </div>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
