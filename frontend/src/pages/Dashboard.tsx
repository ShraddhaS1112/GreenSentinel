/**
 * Green Sentinel - Dashboard Page
 *
 * Investor-grade farm intelligence dashboard showing AI-powered insights,
 * business impact metrics, crop health, threat alerts, and disease forecasts.
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
  Shield,
  Brain,
  Flame,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Zap,
  Eye,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import * as api from '@/services/apiService';
import { ExplainedLabel } from '@/components/common/InfoTooltip';
import { useTranslation } from '@/stores/preferencesStore';

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

interface DashboardData {
  cropHealth: api.CropHealthResponse | null;
  alerts: api.Alert[];
  forecast: api.ForecastResponse | null;
  satellite: api.SatelliteDataResponse | null;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { getCurrentFarm, farms } = useFarmStore();
  const farm = getCurrentFarm();

  const [data, setData] = useState<DashboardData>({
    cropHealth: null,
    alerts: [],
    forecast: null,
    satellite: null,
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [farm?.farmId]);

  const healthStats = useMemo(() => {
    const isSimulated = (source?: string) =>
      !source || source.toLowerCase() === 'simulated';
    const realHistory = (data.cropHealth?.history || []).filter(
      (r) => !isSimulated(r.source)
    );
    const current = realHistory[0] ?? null;
    const currentScore = current?.healthScore ?? 0;
    const oldRecord = realHistory.length > 1 ? realHistory[realHistory.length - 1] : null;
    const change = oldRecord ? currentScore - oldRecord.healthScore : 0;
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (change > 3) trend = 'improving';
    else if (change < -3) trend = 'declining';
    return { currentScore, change, trend, ndvi: current?.ndvi ?? 0, hasRealData: current !== null };
  }, [data.cropHealth]);

  const recentAlerts = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return data.alerts.filter(a => new Date(a.alertTimestamp).getTime() > dayAgo);
  }, [data.alerts]);

  const criticalAlerts = useMemo(
    () => data.alerts.filter(a => a.severity === 'critical' || a.severity === 'high'),
    [data.alerts]
  );

  const highRiskForecasts = useMemo(() => {
    const latest = data.forecast?.latest;
    if (!latest) return { diseases: [], pests: [] };
    return {
      diseases: latest.diseases.filter(d => d.risk > 50),
      pests: latest.pests.filter(p => p.risk > 50),
    };
  }, [data.forecast]);

  // Business metrics — only real, measurable values
  const businessMetrics = useMemo(() => {
    const farmCount = farms?.length || 1;
    const areaHa = farm?.area || 0;
    return { farmCount, areaHa };
  }, [farms, farm]);

  // AI-generated contextual insights from real data
  const aiInsights = useMemo(() => {
    const insights: Array<{ icon: typeof CheckCircle2; color: string; bg: string; text: string }> = [];
    const latest = data.forecast?.latest;

    // Disease risk insight
    const topDisease = latest?.diseases.sort((a, b) => b.risk - a.risk)[0];
    if (topDisease && topDisease.risk > 60) {
      insights.push({
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-50 border-red-200',
        text: t('dashboard.insightDiseaseRisk', { risk: topDisease.risk, name: topDisease.name }),
      });
    }

    // Health trend insight
    if (healthStats.trend === 'declining' && healthStats.change < -5) {
      insights.push({
        icon: TrendingDown,
        color: 'text-amber-600',
        bg: 'bg-amber-50 border-amber-200',
        text: t('dashboard.insightDeclining', { change: Math.abs(healthStats.change) }),
      });
    } else if (healthStats.trend === 'improving') {
      insights.push({
        icon: TrendingUp,
        color: 'text-green-600',
        bg: 'bg-green-50 border-green-200',
        text: t('dashboard.insightImproving', { change: healthStats.change }),
      });
    }

    // NDVI insight
    if (healthStats.ndvi > 0 && healthStats.ndvi < 0.3) {
      insights.push({
        icon: Leaf,
        color: 'text-orange-600',
        bg: 'bg-orange-50 border-orange-200',
        text: t('dashboard.insightLowNdvi', { ndvi: healthStats.ndvi.toFixed(2) }),
      });
    }

    // All clear
    if (insights.length === 0) {
      insights.push({
        icon: CheckCircle2,
        color: 'text-green-600',
        bg: 'bg-green-50 border-green-200',
        text: t('dashboard.insightAllClear'),
      });
      if (latest?.diseases[0]) {
        insights.push({
          icon: Shield,
          color: 'text-blue-600',
          bg: 'bg-blue-50 border-blue-200',
          text: t('dashboard.insightLowDisease', { name: latest.diseases[0].name }),
        });
      }
    }

    return insights.slice(0, 3);
  }, [data.forecast, healthStats, t]);

  const healthColor =
    healthStats.currentScore >= 70 ? 'text-green-600' :
    healthStats.currentScore >= 50 ? 'text-amber-600' : 'text-red-600';

  const healthBg =
    healthStats.currentScore >= 70 ? 'bg-green-100' :
    healthStats.currentScore >= 50 ? 'bg-amber-100' : 'bg-red-100';

  const healthLabel =
    healthStats.currentScore >= 70 ? t('dashboard.labelHealthy') :
    healthStats.currentScore >= 50 ? t('dashboard.labelModerate') : t('dashboard.atRisk');

  if (!farm) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <AlertTriangle className="empty-state-icon" />
          <h2 className="empty-state-title">{t('dashboard.noFarm')}</h2>
          <p className="empty-state-description">
            {t('dashboard.selectFarm')}
          </p>
          <Link to="/farms" className="btn-primary mt-4">
            {t('dashboard.manageFarms')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{farm.name}</h1>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{farm.location.district}, {farm.location.state}</span>
            <span className="text-slate-300">•</span>
            <span className="font-medium text-slate-600">{farm.cropType}</span>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{t('common.refresh')}</span>
        </button>
      </div>

      {/* ── Farm Status Banner ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-4 mb-4 ${healthBg} border-transparent`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hero score */}
            <div className="text-center flex-shrink-0">
              <div className={`text-4xl font-black leading-none ${healthColor}`}>
                {loading ? '--' : healthStats.hasRealData ? healthStats.currentScore : '--'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">/ 100</div>
            </div>
            <div className="w-px h-10 bg-white/60 flex-shrink-0" />
            <div className="min-w-0">
              <p className={`text-base font-bold leading-tight ${healthColor}`}>{loading ? '...' : healthLabel}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {farm.cropType} · {farm.location.district}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {healthStats.trend === 'improving' ? (
                  <><TrendingUp className="w-3 h-3 text-green-500" /><span className="text-xs text-green-600">{t('dashboard.thisWeekChange', { change: healthStats.change })}</span></>
                ) : healthStats.trend === 'declining' ? (
                  <><TrendingDown className="w-3 h-3 text-red-500" /><span className="text-xs text-red-600">{t('dashboard.thisWeekChangeNeg', { change: healthStats.change })}</span></>
                ) : (
                  <><Minus className="w-3 h-3 text-slate-400" /><span className="text-xs text-slate-500">{t('dashboard.stable')}</span></>
                )}
              </div>
            </div>
          </div>
          {/* Live indicator */}
          <div className="flex flex-col items-center gap-1 bg-white rounded-xl px-3 py-2 shadow-sm flex-shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-700">{t('dashboard.live')}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Business Impact KPIs — 2×2 on mobile, 4-col on desktop ──── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KpiChip
          icon={Leaf}
          color="green"
          label={t('dashboard.farms')}
          value={String(businessMetrics.farmCount)}
          sub={t('dashboard.monitored')}
        />
        <KpiChip
          icon={MapPin}
          color="blue"
          label={t('dashboard.coverage')}
          value={businessMetrics.areaHa > 0 ? `${businessMetrics.areaHa} ha` : '--'}
          sub={t('dashboard.farmArea')}
        />
        <KpiChip
          icon={Satellite}
          color="purple"
          label={t('dashboard.ndvi')}
          value={loading ? '--' : healthStats.ndvi > 0 ? healthStats.ndvi.toFixed(2) : '--'}
          sub={t('dashboard.plantHealth')}
        />
        <KpiChip
          icon={Shield}
          color="amber"
          label={t('dashboard.alerts')}
          value={loading ? '--' : String(data.alerts.length)}
          sub={t('dashboard.totalLogged')}
        />
      </div>

      {/* ── Farm Insights Strip ───────────────────────────────────────── */}
      {!loading && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mb-4 space-y-2"
        >
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{t('dashboard.farmInsights')}</h2>
            <span className="ml-auto text-xs text-slate-400">{t('dashboard.satelliteData')}</span>
          </div>
          {aiInsights.map((insight, i) => {
            const Icon = insight.icon;
            return (
              <motion.div
                key={i}
                variants={cardVariants}
                className={`flex items-start gap-3 p-3 rounded-lg border ${insight.bg}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${insight.color}`} />
                <p className="text-sm text-slate-700 leading-snug">{insight.text}</p>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Core Metrics Grid ─────────────────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
      >
        {/* Crop Health */}
        <motion.div variants={cardVariants} className="card !p-3 sm:!p-4">
          <div className="flex items-start justify-between mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${healthBg}`}>
              <Leaf className={`w-4 h-4 ${healthColor}`} />
            </div>
            <Link to="/health" className="text-primary-600 hover:text-primary-700">
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
            <ExplainedLabel term="healthScore" label={t('dashboard.cropHealth')} />
          </p>
          <div className="flex items-end gap-1 mt-1">
            <span className={`text-2xl sm:text-3xl font-bold leading-none ${healthColor}`}>
              {loading ? '--' : healthStats.hasRealData ? healthStats.currentScore : '--'}
            </span>
            <span className="text-slate-400 text-xs mb-0.5">/100</span>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            {healthStats.trend === 'improving' ? (
              <><TrendingUp className="w-3 h-3 text-green-500" /><span className="text-xs text-green-600">+{healthStats.change}</span></>
            ) : healthStats.trend === 'declining' ? (
              <><TrendingDown className="w-3 h-3 text-red-500" /><span className="text-xs text-red-600">{healthStats.change}</span></>
            ) : (
              <><Minus className="w-3 h-3 text-slate-400" /><span className="text-xs text-slate-500">{t('common.stableWeek')}</span></>
            )}
          </div>
        </motion.div>

        {/* Active Alerts */}
        <motion.div variants={cardVariants} className="card !p-3 sm:!p-4">
          <div className="flex items-start justify-between mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${recentAlerts.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <Shield className={`w-4 h-4 ${recentAlerts.length > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <Link to="/threats" className="text-primary-600 hover:text-primary-700">
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{t('dashboard.alerts')}</p>
          <div className="flex items-end gap-1 mt-1">
            <span className={`text-2xl sm:text-3xl font-bold leading-none ${recentAlerts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {loading ? '--' : recentAlerts.length}
            </span>
            <span className="text-slate-400 text-xs mb-0.5">24h</span>
          </div>
          <p className="text-xs text-red-500 mt-1.5">
            {t('dashboard.criticalTotal', { critical: criticalAlerts.length, total: data.alerts.length })}
          </p>
        </motion.div>

        {/* Disease Risk */}
        <motion.div variants={cardVariants} className="card !p-3 sm:!p-4">
          <div className="flex items-start justify-between mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${highRiskForecasts.diseases.length > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>
              <Bug className={`w-4 h-4 ${highRiskForecasts.diseases.length > 0 ? 'text-orange-600' : 'text-green-600'}`} />
            </div>
            <Link to="/scanner" className="text-primary-600 hover:text-primary-700">
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
            <ExplainedLabel term="diseaseRisk" label={t('dashboard.diseaseRisk')} />
          </p>
          <div className="flex items-end gap-1 mt-1">
            <span className={`text-2xl sm:text-3xl font-bold leading-none ${highRiskForecasts.diseases.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {loading ? '--' : highRiskForecasts.diseases.length}
            </span>
            <span className="text-slate-400 text-xs mb-0.5">{t('dashboard.risks')}</span>
          </div>
          {highRiskForecasts.diseases[0] ? (
            <p className="text-xs text-orange-600 mt-1.5 truncate">
              {highRiskForecasts.diseases[0].name} {highRiskForecasts.diseases[0].risk}%
            </p>
          ) : (
            <p className="text-xs text-green-600 mt-1.5">{t('dashboard.lowRisk')}</p>
          )}
        </motion.div>

        {/* NDVI / Satellite */}
        <motion.div variants={cardVariants} className="card !p-3 sm:!p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Satellite className="w-4 h-4 text-blue-600" />
            </div>
            <Link to="/health" className="text-primary-600 hover:text-primary-700">
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
            <ExplainedLabel term="ndvi" label="NDVI" />
          </p>
          <div className="flex items-end gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-bold leading-none text-blue-600">
              {loading ? '--' : healthStats.ndvi.toFixed(2)}
            </span>
            <span className="text-slate-400 text-xs mb-0.5">/1.0</span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 capitalize truncate">
            {(() => {
              const realSat = data.satellite?.data?.find(
                (d) => d.source && d.source.toLowerCase() !== 'simulated'
              );
              return (['excellent', 'good', 'moderate', 'stressed', 'poor'] as string[]).includes(
                realSat?.healthStatus ?? ''
              ) ? realSat?.healthStatus : 'Sentinel-2';
            })()}
          </p>
        </motion.div>
      </motion.div>

      {/* ── Two Column: Alerts + Forecast ─────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6 overflow-hidden">
        {/* Recent Alerts */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" className="card min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="section-header mb-0 flex items-center gap-2 min-w-0 truncate">
              <Flame className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="truncate">{t('dashboard.recentAlerts')}</span>
            </h2>
            <Link to="/threats" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
              {t('dashboard.viewAll')} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : data.alerts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400 opacity-70" />
              <p className="font-medium text-slate-700">{t('dashboard.farmSecure')}</p>
              <p className="text-sm">{t('dashboard.noThreats')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.alerts.slice(0, 5).map(alert => (
                <AlertListItem key={alert.alertId} alert={alert} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Disease & Pest Forecast */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" className="card min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="section-header mb-0 flex items-center gap-2 min-w-0 truncate">
              <Bug className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="truncate">{t('dashboard.diseaseForecast')}</span>
            </h2>
            <Link to="/weather" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
              {t('dashboard.weather')} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : !data.forecast?.latest ? (
            <div className="text-center py-8 text-slate-500">
              <Bug className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>{t('dashboard.forecastUnavailable')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.forecast.latest.diseases.slice(0, 3).map((disease, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${disease.risk > 70 ? 'bg-red-50' : disease.risk > 50 ? 'bg-orange-50' : disease.risk > 30 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-slate-900 truncate">{disease.name}</span>
                      <span className={`text-sm font-bold ml-2 flex-shrink-0 ${disease.risk > 70 ? 'text-red-600' : disease.risk > 50 ? 'text-orange-600' : disease.risk > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {disease.risk}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{disease.affectedCrops.join(', ')}</p>
                  </div>
                </div>
              ))}
              {data.forecast.latest.pests.slice(0, 2).map((pest, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${pest.risk > 70 ? 'bg-red-50' : pest.risk > 50 ? 'bg-orange-50' : 'bg-yellow-50'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-slate-900 truncate">{pest.name}</span>
                      <span className={`text-sm font-bold ml-2 flex-shrink-0 ${pest.risk > 70 ? 'text-red-600' : pest.risk > 50 ? 'text-orange-600' : 'text-yellow-600'}`}>
                        {pest.risk}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" className="card">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="section-header mb-0">{t('dashboard.quickActions')}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/scanner" className="group flex flex-col gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-100">
            <Bug className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800">{t('dashboard.aiDiseaseScan')}</p>
              <p className="text-xs text-green-600 mt-0.5">{t('dashboard.bedrockVision')}</p>
            </div>
          </Link>
          <Link to="/irrigation" className="group flex flex-col gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100">
            <Droplets className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-800">{t('dashboard.irrigationPlan')}</p>
              <p className="text-xs text-blue-600 mt-0.5">{t('dashboard.smartScheduling')}</p>
            </div>
          </Link>
          <Link to="/weather" className="group flex flex-col gap-2 p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-100">
            <Cloud className="w-6 h-6 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">{t('dashboard.weatherForecast')}</p>
              <p className="text-xs text-amber-600 mt-0.5">{t('dashboard.7dayOutlook')}</p>
            </div>
          </Link>
          <Link to="/health" className="group flex flex-col gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-100">
            <Satellite className="w-6 h-6 text-purple-600" />
            <div>
              <p className="text-sm font-semibold text-purple-800">{t('dashboard.satelliteView')}</p>
              <p className="text-xs text-purple-600 mt-0.5">{t('dashboard.sentinelNdvi')}</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* ── Camera / Surveillance CTA ─────────────────────────────────── */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" className="mt-4">
        <Link
          to={`/farms/${farm.farmId}/cameras`}
          className="flex items-center gap-4 p-4 bg-slate-900 rounded-xl text-white hover:bg-slate-800 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t('dashboard.aiSecurity')}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.aiSecurityDesc')}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
        </Link>
      </motion.div>

      {lastRefresh && (
        <p className="text-xs text-slate-400 text-center mt-4">
          {t('dashboard.updatedAt', { time: lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) })}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function KpiChip({
  icon: Icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'blue' | 'purple' | 'amber';
  label: string;
  value: string;
  sub: string;
}) {
  const colorMap = {
    green:  { bg: 'bg-green-50 border-green-200',   icon: 'bg-green-100 text-green-600',  val: 'text-green-700' },
    blue:   { bg: 'bg-blue-50 border-blue-200',     icon: 'bg-blue-100 text-blue-600',    val: 'text-blue-700' },
    purple: { bg: 'bg-purple-50 border-purple-200', icon: 'bg-purple-100 text-purple-600', val: 'text-purple-700' },
    amber:  { bg: 'bg-amber-50 border-amber-200',   icon: 'bg-amber-100 text-amber-600',  val: 'text-amber-700' },
  };
  const c = colorMap[color];
  return (
    <div className={`flex flex-col gap-2 p-3 rounded-xl border ${c.bg}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.icon}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-slate-500 leading-none">{label}</p>
        <p className={`text-lg font-bold leading-tight mt-0.5 ${c.val}`}>{value}</p>
        <p className="text-xs text-slate-400 leading-none mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function AlertListItem({ alert }: { alert: api.Alert }) {
  const { t } = useTranslation();
  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };
  const timeAgo = getRelativeTime(new Date(alert.alertTimestamp), t);
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors overflow-hidden">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${severityColors[alert.severity] || 'bg-slate-100 text-slate-600'}`}>
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{alert.title}</p>
        <p className="text-xs text-slate-500 truncate">{alert.alertType} · {timeAgo}</p>
      </div>
      <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${severityColors[alert.severity] || 'bg-slate-100 text-slate-600'}`}>
        {alert.severity}
      </span>
    </div>
  );
}

function getRelativeTime(date: Date, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return t('common.justNow');
  if (diffMins < 60) return t('common.minsAgo', { mins: diffMins });
  if (diffHours < 24) return t('common.hoursAgo', { hours: diffHours });
  return t('common.dAgo', { days: diffDays });
}
