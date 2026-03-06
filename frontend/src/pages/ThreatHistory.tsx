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
  Camera,
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
import { useTranslation } from '@/stores/preferencesStore';

type AlertType = 'disease' | 'pest' | 'weather' | 'irrigation' | 'satellite' | 'camera';

const alertIcons: Record<AlertType, typeof Bug> = {
  disease: Bug,
  pest: Bug,
  weather: Cloud,
  irrigation: Droplets,
  satellite: Satellite,
  camera: Camera,
};

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
  low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
};

const defaultColors = { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' };

export default function ThreatHistory() {
  const { t } = useTranslation();
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
    // Deduplicate by alertId (API may return the same alert more than once)
    const seen = new Set<string>();
    let filtered = alerts.filter(a => {
      if (seen.has(a.alertId)) return false;
      seen.add(a.alertId);
      return true;
    });

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
          <h1 className="text-2xl font-bold text-slate-900">{t('threats.title')}</h1>
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
              <option value="all">{t('threats.allTime')}</option>
              <option value="24h">{t('threats.last24h')}</option>
              <option value="7d">{t('threats.last7d')}</option>
              <option value="30d">{t('threats.last30d')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
            <Filter className="w-4 h-4" />
            {t('threats.filterByType')}
          </span>

          {(['disease', 'pest', 'weather', 'irrigation', 'satellite', 'camera'] as AlertType[]).map((type) => {
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
              {t('threats.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="card text-center py-12">
          <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-4 animate-spin" />
          <p className="text-slate-500">{t('threats.loading')}</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            {t('threats.noAlerts')}
          </h3>
          <p className="text-slate-500">
            {selectedTypes.length > 0
              ? t('threats.adjustFilters')
              : t('threats.farmSecure')}
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
 * Parse alert description JSON to extract prediction data
 */
interface PredictionDetails {
  type: 'disease' | 'pest' | 'weather' | 'diagnosis' | 'general';
  name?: string;
  localName?: string;
  riskScore?: number;
  probability?: number;
  riskLevel?: string;
  confidence?: number;
  severity?: string;
  symptoms?: string[];
  triggers?: string[];
  causes?: string[];
  treatment?: string[];
  prevention?: string[];
  preventiveActions?: string[];
  curativeActions?: string[];
  controlMeasures?: { type: string; description: string; effectiveness?: number }[];
  identificationTips?: string[];
  economicThreshold?: string;
  summary?: string;
  detected?: boolean;
  affectedCrops?: string[];
  weather?: {
    temp?: number;
    humidity?: number;
    precipitation?: number;
    windSpeed?: number;
  };
  rawData?: Record<string, unknown>;
}

function parsePredictionData(description: string): PredictionDetails | null {
  if (!description) return null;

  const trimmed = description.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }

  try {
    const data = JSON.parse(trimmed);

    // Bedrock AI diagnosis data (from disease scanner)
    if (data.detected !== undefined || (data.disease && data.treatment) || (data.confidence !== undefined && data.summary)) {
      return {
        type: 'diagnosis',
        name: data.disease,
        localName: data.hindiName,
        confidence: data.confidence,
        severity: data.severity,
        detected: data.detected,
        symptoms: data.symptoms,
        causes: data.causes,
        treatment: data.treatment,
        prevention: data.prevention,
        affectedCrops: data.affectedCrops,
        summary: data.summary,
        rawData: data,
      };
    }

    // Disease risk data (from forecast)
    if (data.diseaseId || (data.disease && !data.treatment) || data.preventiveActions) {
      return {
        type: 'disease',
        name: data.name || data.disease,
        localName: data.localName,
        riskScore: data.riskScore,
        probability: data.probability,
        riskLevel: data.riskLevel,
        symptoms: data.symptoms,
        triggers: data.triggers,
        preventiveActions: data.preventiveActions,
        curativeActions: data.curativeActions,
        rawData: data,
      };
    }

    // Pest risk data
    if (data.pestId || data.pest || data.controlMeasures || data.identificationTips) {
      return {
        type: 'pest',
        name: data.name || data.pest,
        localName: data.localName,
        riskScore: data.riskScore,
        riskLevel: data.riskLevel,
        identificationTips: data.identificationTips,
        controlMeasures: data.controlMeasures,
        economicThreshold: data.economicThreshold,
        triggers: data.triggers,
        rawData: data,
      };
    }

    // Weather data
    if (data.weather || data.temp !== undefined || data.temperature !== undefined) {
      const w = data.weather || data;
      return {
        type: 'weather',
        weather: {
          temp: w.temp ?? w.temperature,
          humidity: w.humidity,
          precipitation: w.precipitation,
          windSpeed: w.windSpeed,
        },
        rawData: data,
      };
    }

    // General data with risk info
    if (data.risk !== undefined || data.riskScore !== undefined || data.confidence !== undefined) {
      return {
        type: 'general',
        name: data.name || data.title,
        riskScore: data.riskScore ?? data.risk ?? data.confidence,
        riskLevel: data.riskLevel ?? data.severity,
        rawData: data,
      };
    }

    return { type: 'general', rawData: data };
  } catch {
    return null;
  }
}

/**
 * Format description - handles raw JSON data that might be in alert descriptions
 */
function formatDescription(description: string): string {
  if (!description) return 'No description available';

  const prediction = parsePredictionData(description);
  if (prediction) {
    // AI Diagnosis from Bedrock
    if (prediction.type === 'diagnosis') {
      if (prediction.detected) {
        const conf = prediction.confidence ? ` (${prediction.confidence}% confidence)` : '';
        return `${prediction.name || 'Disease detected'}${conf} - tap for diagnosis details`;
      }
      return 'Healthy plant - tap for details';
    }

    // Weather data
    if (prediction.type === 'weather' && prediction.weather) {
      const w = prediction.weather;
      const parts = [];
      if (w.temp !== undefined) parts.push(`Temperature: ${w.temp}°C`);
      if (w.humidity !== undefined) parts.push(`Humidity: ${w.humidity}%`);
      if (w.precipitation !== undefined) parts.push(`Precipitation: ${w.precipitation}mm`);
      if (w.windSpeed !== undefined) parts.push(`Wind: ${w.windSpeed} km/h`);
      return parts.length > 0 ? parts.join(', ') : 'Weather alert';
    }

    // Disease/Pest forecast
    if (prediction.name) {
      const riskPart = prediction.riskScore ? ` (${prediction.riskScore}% risk)` : '';
      return `${prediction.name}${riskPart} - tap for details`;
    }

    return 'Prediction available - tap for details';
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
  const { t } = useTranslation();
  const Icon = alertIcons[alert.alertType as AlertType] || AlertTriangle;
  const colors = severityColors[alert.severity] || defaultColors;
  const date = new Date(alert.alertTimestamp);

  // Parse prediction details from description
  const prediction = parsePredictionData(alert.description);

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
          {/* AI Diagnosis Details (from Bedrock disease scanner) */}
          {prediction && prediction.type === 'diagnosis' && (
            <>
              {/* Detection Status */}
              <div className={`p-4 rounded-xl ${prediction.detected ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center gap-3">
                  {prediction.detected ? (
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold ${prediction.detected ? 'text-red-900' : 'text-green-900'}`}>
                      {prediction.detected ? (prediction.name || 'Disease Detected') : 'Healthy Plant'}
                    </h3>
                    {prediction.localName && (
                      <p className="text-sm text-slate-600">{prediction.localName}</p>
                    )}
                  </div>
                  {prediction.confidence !== undefined && prediction.confidence > 0 && (
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                      prediction.confidence >= 80 ? 'bg-green-100 text-green-700' :
                      prediction.confidence >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {prediction.confidence}% confidence
                    </span>
                  )}
                </div>
              </div>

              {/* Summary */}
              {prediction.summary && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-700">{prediction.summary}</p>
                </div>
              )}

              {prediction.detected && (
                <>
                  {/* Symptoms */}
                  {prediction.symptoms && prediction.symptoms.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-2 font-medium">🔍 Symptoms Identified</p>
                      <ul className="space-y-1">
                        {prediction.symptoms.map((symptom, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-yellow-500 mt-0.5">•</span>
                            {symptom}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Causes */}
                  {prediction.causes && prediction.causes.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-2 font-medium">❓ Possible Causes</p>
                      <ul className="space-y-1">
                        {prediction.causes.map((cause, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-orange-500 mt-0.5">•</span>
                            {cause}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Treatment */}
                  {prediction.treatment && prediction.treatment.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700 uppercase mb-2 font-medium">💊 Recommended Treatment</p>
                      <ul className="space-y-1">
                        {prediction.treatment.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Prevention */}
                  {prediction.prevention && prediction.prevention.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-700 uppercase mb-2 font-medium">🛡️ Prevention Tips</p>
                      <ul className="space-y-1">
                        {prediction.prevention.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                            <span className="text-green-500 mt-0.5">→</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Affected Crops */}
                  {prediction.affectedCrops && prediction.affectedCrops.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-2 font-medium">🌾 Crops at Risk</p>
                      <div className="flex flex-wrap gap-2">
                        {prediction.affectedCrops.map((crop, i) => (
                          <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-200 capitalize">
                            {crop}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Prediction Details Section (disease/pest forecast) */}
          {prediction && (prediction.type === 'disease' || prediction.type === 'pest') && (
            <>
              {/* Risk Score */}
              {(prediction.riskScore !== undefined || prediction.probability !== undefined) && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">
                      {prediction.name || alert.title}
                      {prediction.localName && (
                        <span className="text-slate-500 ml-2">({prediction.localName})</span>
                      )}
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (prediction.riskScore || 0) >= 70 ? 'bg-red-100 text-red-700' :
                      (prediction.riskScore || 0) >= 50 ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {prediction.riskLevel || `${prediction.riskScore}% risk`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        (prediction.riskScore || 0) >= 70 ? 'bg-red-500' :
                        (prediction.riskScore || 0) >= 50 ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(100, prediction.riskScore || prediction.probability || 0)}%` }}
                    />
                  </div>
                  {prediction.probability !== undefined && prediction.probability !== prediction.riskScore && (
                    <p className="text-xs text-slate-500 mt-1">
                      {prediction.probability}% probability of occurrence
                    </p>
                  )}
                </div>
              )}

              {/* Triggers */}
              {prediction.triggers && prediction.triggers.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-2 font-medium">🎯 Triggers</p>
                  <div className="flex flex-wrap gap-2">
                    {prediction.triggers.map((trigger, i) => (
                      <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-200">
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Symptoms (Disease) */}
              {prediction.symptoms && prediction.symptoms.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-2 font-medium">🔍 Symptoms to Look For</p>
                  <ul className="space-y-1">
                    {prediction.symptoms.map((symptom, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-red-500 mt-0.5">•</span>
                        {symptom}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Identification Tips (Pest) */}
              {prediction.identificationTips && prediction.identificationTips.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-2 font-medium">🔍 How to Identify</p>
                  <ul className="space-y-1">
                    {prediction.identificationTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-orange-500 mt-0.5">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preventive Actions */}
              {prediction.preventiveActions && prediction.preventiveActions.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 uppercase mb-2 font-medium">🛡️ Prevention</p>
                  <ul className="space-y-1">
                    {prediction.preventiveActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Curative Actions */}
              {prediction.curativeActions && prediction.curativeActions.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 uppercase mb-2 font-medium">💊 Treatment</p>
                  <ul className="space-y-1">
                    {prediction.curativeActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                        <span className="text-blue-500 mt-0.5">→</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Control Measures (Pest) */}
              {prediction.controlMeasures && prediction.controlMeasures.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-700 uppercase mb-2 font-medium">🎯 Control Measures</p>
                  <ul className="space-y-2">
                    {prediction.controlMeasures.map((measure, i) => (
                      <li key={i} className="text-sm text-purple-800">
                        <span className="font-medium capitalize">{measure.type}:</span> {measure.description}
                        {measure.effectiveness && (
                          <span className="ml-2 text-xs text-purple-600">({measure.effectiveness}% effective)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Economic Threshold */}
              {prediction.economicThreshold && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-700 uppercase mb-1 font-medium">📊 Action Threshold</p>
                  <p className="text-sm text-amber-800">{prediction.economicThreshold}</p>
                </div>
              )}
            </>
          )}

          {/* Weather Details */}
          {prediction && prediction.type === 'weather' && prediction.weather && (
            <div className="grid grid-cols-2 gap-3">
              {prediction.weather.temp !== undefined && (
                <div className="p-3 bg-orange-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{prediction.weather.temp}°C</p>
                  <p className="text-xs text-orange-500">Temperature</p>
                </div>
              )}
              {prediction.weather.humidity !== undefined && (
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{prediction.weather.humidity}%</p>
                  <p className="text-xs text-blue-500">Humidity</p>
                </div>
              )}
              {prediction.weather.precipitation !== undefined && (
                <div className="p-3 bg-sky-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-sky-600">{prediction.weather.precipitation}mm</p>
                  <p className="text-xs text-sky-500">Precipitation</p>
                </div>
              )}
              {prediction.weather.windSpeed !== undefined && (
                <div className="p-3 bg-slate-100 rounded-lg text-center">
                  <p className="text-2xl font-bold text-slate-600">{prediction.weather.windSpeed}</p>
                  <p className="text-xs text-slate-500">Wind (km/h)</p>
                </div>
              )}
            </div>
          )}

          {/* Fallback description for non-prediction alerts */}
          {!prediction && (
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Description</p>
              <p className="text-slate-700">{alert.description || 'No description available'}</p>
            </div>
          )}

          {/* Advisory */}
          {alert.advisory && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 uppercase mb-1 font-medium">📋 Advisory</p>
              <p className="text-blue-800">{alert.advisory}</p>
            </div>
          )}

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-500 uppercase">Type</p>
              <p className="font-medium text-slate-900 capitalize">{alert.alertType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Status</p>
              <p className="font-medium text-slate-900">
                {alert.isRead ? t('threats.read') : t('threats.unread')}
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
            {t('threats.close')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
