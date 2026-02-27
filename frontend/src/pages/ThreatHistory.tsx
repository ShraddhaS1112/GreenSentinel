/**
 * Green Sentinel - Alert History Page
 *
 * Displays historical alerts with filtering and search.
 * Fetches data from API (same source as Dashboard).
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Filter,
  Bug,
  Cloud,
  Droplets,
  Satellite,
  Calendar,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import * as api from '@/services/apiService';
import { format } from 'date-fns';

type AlertType = 'disease' | 'pest' | 'weather' | 'irrigation' | 'satellite';

const alertIcons: Record<AlertType, typeof Bug> = {
  disease: Bug,
  pest: Bug,
  weather: Cloud,
  irrigation: Droplets,
  satellite: Satellite,
};

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
  low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
};

const defaultColors = { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' };

export default function ThreatHistory() {
  const { getCurrentFarm } = useFarmStore();
  const farm = getCurrentFarm();

  const [alerts, setAlerts] = useState<api.Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<AlertType[]>([]);
  const [dateRange, setDateRange] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [selectedAlert, setSelectedAlert] = useState<api.Alert | null>(null);

  // Fetch alerts from API
  const fetchAlerts = async () => {
    if (!farm?.farmId) return;

    setLoading(true);
    try {
      const response = await api.getAlerts(farm.farmId);
      if (response.data) {
        setAlerts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [farm?.farmId]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];

    // Filter by type
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((a) => selectedTypes.includes(a.alertType as AlertType));
    }

    // Filter by date range
    const now = Date.now();
    if (dateRange !== 'all') {
      const ranges = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[dateRange];
      filtered = filtered.filter(
        (a) => new Date(a.alertTimestamp).getTime() > cutoff
      );
    }

    // Sort by date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.alertTimestamp).getTime() - new Date(a.alertTimestamp).getTime()
    );

    return filtered;
  }, [alerts, selectedTypes, dateRange]);

  const toggleType = (type: AlertType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alert History</h1>
          <p className="text-slate-500 mt-1">
            {filteredAlerts.length} alerts for {farm?.name || 'your farm'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All time</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
            <Filter className="w-4 h-4" />
            Filter by type:
          </span>

          {(['disease', 'pest', 'weather', 'irrigation', 'satellite'] as AlertType[]).map((type) => {
            const Icon = alertIcons[type];
            const isSelected = selectedTypes.includes(type);

            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="capitalize">{type}</span>
              </button>
            );
          })}

          {selectedTypes.length > 0 && (
            <button
              onClick={() => setSelectedTypes([])}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="card text-center py-12">
          <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-4 animate-spin" />
          <p className="text-slate-500">Loading alerts...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            No alerts found
          </h3>
          <p className="text-slate-500">
            {selectedTypes.length > 0
              ? 'Try adjusting your filters'
              : 'Your farm has been secure during this period'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert, index) => (
            <motion.div
              key={alert.alertId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <AlertCard
                alert={alert}
                onClick={() => setSelectedAlert(alert)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Alert detail modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Format description - handles raw JSON data that might be in alert descriptions
 */
function formatDescription(description: string): string {
  if (!description) return 'No description available';

  // Check if the description looks like JSON
  const trimmed = description.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      // If it's weather data, format it nicely
      if (data.weather || data.temp !== undefined) {
        const w = data.weather || data;
        const parts = [];
        if (w.temp !== undefined) parts.push(`Temperature: ${w.temp}°C`);
        if (w.humidity !== undefined) parts.push(`Humidity: ${w.humidity}%`);
        if (w.precipitation !== undefined) parts.push(`Precipitation: ${w.precipitation}mm`);
        if (w.windSpeed !== undefined) parts.push(`Wind: ${w.windSpeed} km/h`);
        return parts.length > 0 ? parts.join(', ') : 'Weather data received';
      }
      // For other JSON, just return a summary
      return 'Data received - click for details';
    } catch {
      // Not valid JSON, return as-is
      return description;
    }
  }
  return description;
}

// =============================================================================
// Sub-components
// =============================================================================

function AlertCard({
  alert,
  onClick,
}: {
  alert: api.Alert;
  onClick: () => void;
}) {
  const Icon = alertIcons[alert.alertType as AlertType] || AlertTriangle;
  const colors = severityColors[alert.severity] || defaultColors;
  const date = new Date(alert.alertTimestamp);

  return (
    <button
      onClick={onClick}
      className={`w-full card ${colors.bg} border-l-4 ${colors.border} hover:shadow-md transition-shadow text-left`}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}
        >
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold ${colors.text}`}>
              {alert.title}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${colors.bg} ${colors.text} border ${colors.border}`}
            >
              {alert.severity}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1 line-clamp-1">
            {formatDescription(alert.description)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {format(date, 'MMM d, yyyy')} at {format(date, 'h:mm a')}
          </p>
        </div>

        <ChevronRight className="w-5 h-5 text-slate-400" />
      </div>
    </button>
  );
}

function AlertDetailModal({
  alert,
  onClose,
}: {
  alert: api.Alert;
  onClose: () => void;
}) {
  const Icon = alertIcons[alert.alertType as AlertType] || AlertTriangle;
  const colors = severityColors[alert.severity] || defaultColors;
  const date = new Date(alert.alertTimestamp);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className={`${colors.bg} p-4 rounded-t-2xl border-b ${colors.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center bg-white ${colors.text}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`font-semibold ${colors.text}`}>
                  {alert.title}
                </h2>
                <p className="text-sm text-slate-500">
                  {format(date, 'MMMM d, yyyy')} at {format(date, 'h:mm:ss a')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <span
            className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium uppercase ${colors.bg} ${colors.text} border ${colors.border}`}
          >
            {alert.severity}
          </span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-slate-500 uppercase mb-1">Description</p>
            <p className="text-slate-700">{formatDescription(alert.description)}</p>
          </div>

          {alert.advisory && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 uppercase mb-1">Advisory</p>
              <p className="text-blue-800">{alert.advisory}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase">Type</p>
              <p className="font-medium text-slate-900 capitalize">{alert.alertType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Status</p>
              <p className="font-medium text-slate-900">
                {alert.isRead ? 'Read' : 'Unread'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
