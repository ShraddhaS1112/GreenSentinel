/**
 * Green Sentinel - Simple Dashboard
 *
 * Farmer-first dashboard:
 * - Offline-aware with last-known-data banner
 * - Today's specific task derived from real data
 * - Rain-aware irrigation advice
 * - Weekly summary (trend + alert count)
 * - Auto-voice on first load
 * - Last scan date on Disease Scanner link
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Leaf,
  AlertTriangle,
  Volume2,
  RefreshCw,
  ArrowRight,
  Sun,
  CloudRain,
  Camera,
  Bug,
  Shield,
  Droplets,
  FileText,
  Phone,
  TrendingUp,
  TrendingDown,
  Minus,
  WifiOff,
  Clock,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import { useTranslation, usePreferencesStore } from '@/stores/preferencesStore';
import * as api from '@/services/apiService';
import { getHealthAdvice } from '@/utils/farmerFriendly';

// =============================================================================
// HELPERS
// =============================================================================

const speakMessage = (message: string, language: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    const langMap: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN',
      ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', bn: 'bn-IN',
    };
    utterance.lang = langMap[language] || 'en-IN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

function daysAgo(dateStr: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return t('common.today');
  if (days === 1) return t('common.yesterday');
  return t('simple.daysAgo', { days });
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SimpleDashboard() {
  const { t, language } = useTranslation();
  const { voiceGuidance } = usePreferencesStore();
  const { getCurrentFarm } = useFarmStore();
  const farm = getCurrentFarm();

  const [cropHealth, setCropHealth] = useState<api.CropHealthResponse | null>(null);
  const [alerts, setAlerts] = useState<api.Alert[]>([]);
  const [forecast, setForecast] = useState<api.ForecastResponse | null>(null);
  const [lastScanDate, setLastScanDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [dataTimestamp, setDataTimestamp] = useState<Date | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const hasSpokenRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!farm?.farmId) return;
    setLoading(true);
    setFetchError(false);
    try {
      const [healthRes, alertsRes, forecastRes, scanRes] = await Promise.all([
        api.getCropHealth(farm.farmId, 7),
        api.getAlerts(farm.farmId),
        api.getForecast(farm.farmId),
        api.getDiseaseScanHistory(farm.farmId),
      ]);
      setCropHealth(healthRes.data);
      setAlerts(alertsRes.data || []);
      setForecast(forecastRes.data);
      const scans = scanRes.data?.scans;
      if (scans && scans.length > 0) {
        const latest = [...scans].sort(
          (a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime()
        )[0];
        setLastScanDate(latest.scanDate);
      } else {
        setLastScanDate(null);
      }
      setDataTimestamp(new Date());
    } catch (err) {
      console.error('SimpleDashboard fetch error:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [farm?.farmId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Core values — real satellite data only (exclude simulated records)
  const isSimulated = (source?: string) => !source || source.toLowerCase() === 'simulated';
  const realHistory = (cropHealth?.history || []).filter((r) => !isSimulated(r.source));
  const currentReal = realHistory[0] ?? null;
  const healthScore = currentReal?.healthScore ?? 0;
  const ndvi = currentReal?.ndvi ?? 0;
  const hasRealData = currentReal !== null;

  const healthStatus = useMemo(() => {
    if (!hasRealData) return 'none';
    if (healthScore >= 60) return 'good';
    if (healthScore >= 40) return 'warning';
    return 'danger';
  }, [healthScore, hasRealData]);

  const healthAdvice = useMemo(() => getHealthAdvice(healthScore, language), [healthScore, language]);

  // Alerts (last 24h)
  const alertCount = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return alerts.filter(a => new Date(a.alertTimestamp).getTime() > dayAgo).length;
  }, [alerts]);

  // Alerts this week
  const weeklyAlertCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return alerts.filter(a => new Date(a.alertTimestamp).getTime() > weekAgo).length;
  }, [alerts]);

  // Top disease risk
  const topDisease = useMemo(() => {
    const diseases = forecast?.latest?.diseases;
    if (!diseases?.length) return null;
    return [...diseases].sort((a, b) => b.risk - a.risk)[0] ?? null;
  }, [forecast]);

  // Weather
  const weather = forecast?.latest?.weather;

  // Rain currently or recent wet conditions
  const isWet = (weather?.precipitation ?? 0) > 0 || (weather?.consecutiveWetDays ?? 0) > 0;

  // Weekly health change from real satellite history only
  const weeklyChange = useMemo(() => {
    if (realHistory.length < 2) return null;
    const sorted = [...realHistory].sort(
      (a, b) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime()
    );
    return sorted[sorted.length - 1].healthScore - sorted[0].healthScore;
  }, [realHistory]);

  // Today's specific task — one actionable sentence based on real data
  const todayTask = useMemo(() => {
    if (loading) return null;
    if (alertCount > 0) {
      return t(alertCount > 1 ? 'simple.taskAlertsPlural' : 'simple.taskAlerts', { count: alertCount });
    }
    if (topDisease && topDisease.risk > 65) {
      return t('simple.taskDisease', { name: topDisease.name });
    }
    if (ndvi > 0 && ndvi < 0.3 && isWet) {
      return t('simple.taskRainDrain');
    }
    if (ndvi > 0 && ndvi < 0.3) {
      return t('simple.taskWater');
    }
    return t('simple.taskNormal');
  }, [loading, alertCount, topDisease, ndvi, isWet, t]);

  // Priority action — single most urgent thing for the farmer
  const priorityAction = useMemo(() => {
    if (alertCount > 0) {
      return {
        link: '/threats',
        bg: 'bg-red-500',
        textColor: 'text-white',
        icon: AlertTriangle,
        title: t(alertCount > 1 ? 'simple.priorityAlertsTitlePlural' : 'simple.priorityAlertsTitle', { count: alertCount }),
        subtitle: t('simple.checkNow'),
      };
    }
    if (topDisease && topDisease.risk > 65) {
      return {
        link: '/scanner',
        bg: 'bg-orange-500',
        textColor: 'text-white',
        icon: Bug,
        title: t('simple.priorityDiseaseTitle', { name: topDisease.name }),
        subtitle: t('simple.preventiveAction', { risk: topDisease.risk }),
      };
    }
    if (ndvi > 0 && ndvi < 0.3) {
      if (isWet) {
        return {
          link: '/irrigation',
          bg: 'bg-blue-500',
          textColor: 'text-white',
          icon: CloudRain,
          title: t('simple.rainFallingTitle'),
          subtitle: t('simple.holdIrrigation'),
        };
      }
      return {
        link: '/irrigation',
        bg: 'bg-blue-500',
        textColor: 'text-white',
        icon: Droplets,
        title: t('simple.checkWaterTitle'),
        subtitle: t('simple.plantsMayNeed'),
      };
    }
    return {
      link: '/scanner',
      bg: 'bg-green-600',
      textColor: 'text-white',
      icon: Leaf,
      title: t('simple.scanCropsTitle'),
      subtitle: t('simple.takePhotoDetect'),
    };
  }, [alertCount, topDisease, ndvi, isWet, t]);

  // Auto-voice priority action on first successful load
  useEffect(() => {
    if (!loading && !fetchError && voiceGuidance && !hasSpokenRef.current && healthScore > 0) {
      hasSpokenRef.current = true;
      setSpeaking(true);
      speakMessage(`${priorityAction.title}. ${priorityAction.subtitle}`, language);
      setTimeout(() => setSpeaking(false), 4000);
    }
  }, [loading, fetchError, voiceGuidance, healthScore, priorityAction, language]);

  // Manual voice announcement
  const announce = useCallback(() => {
    if (!voiceGuidance) return;
    setSpeaking(true);
    speakMessage(`${priorityAction.title}. ${priorityAction.subtitle}`, language);
    setTimeout(() => setSpeaking(false), 4000);
  }, [voiceGuidance, priorityAction, language]);

  // Gradient by health
  const cardGradient =
    healthStatus === 'none' ? 'from-slate-500 to-slate-700' :
    healthStatus === 'good' ? 'from-green-500 to-green-700' :
    healthStatus === 'warning' ? 'from-amber-500 to-orange-600' :
    'from-red-500 to-red-700';

  if (!farm) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="text-center">
          <Leaf className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <p className="text-lg text-slate-500 mb-3">
            {t('simple.noFarm')}
          </p>
          <Link to="/farms" className="inline-block px-4 py-2 bg-green-600 text-white rounded-xl font-medium text-sm">
            {t('simple.addFarm')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

      {/* ── Offline Banner ─────────────────────────────────────────────── */}
      {fetchError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            {dataTimestamp
              ? t('simple.lastData', { time: dataTimestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) })
              : t('simple.couldNotLoad')}
          </p>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 truncate">{farm.name}</h1>
          <p className="text-sm text-slate-500 truncate">{farm.cropType} · {farm.location.district}</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0 ml-3">
          {voiceGuidance && (
            <button
              onClick={announce}
              disabled={speaking}
              className={`p-2.5 rounded-xl transition-all ${
                speaking ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Volume2 className={`w-5 h-5 ${speaking ? 'animate-pulse' : ''}`} />
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Farm Health Card ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl bg-gradient-to-br ${cardGradient} p-5 shadow-md`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">
              {t('simple.farmHealth')}
            </p>
            <div className="flex items-end gap-1.5">
              <span className="text-5xl font-black text-white leading-none">
                {loading ? '--' : hasRealData ? healthScore : '--'}
              </span>
              <span className="text-white/60 text-sm mb-1">/100</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white text-lg font-bold">{healthAdvice.title}</p>
            {/* Weekly change from real history data */}
            {!loading && weeklyChange !== null && (
              <div className="flex items-center justify-end gap-1 mt-1">
                {weeklyChange > 0
                  ? <><TrendingUp className="w-3.5 h-3.5 text-white/80" /><span className="text-white/80 text-xs">{t('simple.thisWeekChange', { change: weeklyChange })}</span></>
                  : weeklyChange < 0
                  ? <><TrendingDown className="w-3.5 h-3.5 text-white/80" /><span className="text-white/80 text-xs">{t('simple.thisWeekChangeNeg', { change: weeklyChange })}</span></>
                  : <><Minus className="w-3.5 h-3.5 text-white/70" /><span className="text-white/70 text-xs">{t('common.stableWeek')}</span></>
                }
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white/25 rounded-full h-2 mb-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${loading || !hasRealData ? 0 : healthScore}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="bg-white rounded-full h-2"
          />
        </div>

        {/* Today's specific task + NDVI */}
        <div className="flex items-center justify-between">
          <p className="text-white/90 text-sm font-medium">
            → {todayTask || healthAdvice.action}
          </p>
          {ndvi > 0 && (
            <p className="text-white/60 text-xs font-mono flex-shrink-0 ml-2">
              NDVI {ndvi.toFixed(2)}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Weekly Summary ─────────────────────────────────────────────── */}
      {!loading && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>
            {t('simple.thisWeek')}{' '}
            {weeklyAlertCount > 0
              ? (weeklyAlertCount > 1 ? t('simple.weekAlertsPlural', { count: weeklyAlertCount }) : t('simple.weekAlerts', { count: weeklyAlertCount }))
              : t('simple.weekAlertsNone')
            }
            {' '}{t('simple.weekHealthTrend', { trend: t(`simple.${cropHealth?.trend ?? 'stable'}`) })}
          </span>
        </div>
      )}

      {/* ── Status Row + Priority Action — flush, no gap ──────────────── */}
      <div className="flex flex-col gap-0">
        <div className="grid grid-cols-3 gap-2 mb-0">
          {/* Weather */}
          <div className="bg-white rounded-t-xl rounded-b-none p-3 border border-slate-200 text-center">
            {weather && weather.precipitation > 0 ? (
              <CloudRain className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            ) : (
              <Sun className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
            )}
            <p className="text-sm font-bold text-slate-800">
              {weather ? `${Math.round(weather.temp)}°C` : '--'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('simple.weather')}
            </p>
          </div>

          {/* Alerts */}
          <Link to="/threats">
            <div className={`rounded-t-xl rounded-b-none p-3 border text-center ${alertCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
              <Shield className={`w-6 h-6 mx-auto mb-1 ${alertCount > 0 ? 'text-red-500' : 'text-green-500'}`} />
              <p className={`text-sm font-bold ${alertCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {loading ? '--' : alertCount}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('dashboard.alerts')}
              </p>
            </div>
          </Link>

          {/* Disease */}
          <Link to="/scanner">
            <div className={`rounded-t-xl rounded-b-none p-3 border text-center ${topDisease && topDisease.risk > 50 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
              <Bug className={`w-6 h-6 mx-auto mb-1 ${topDisease && topDisease.risk > 50 ? 'text-orange-500' : 'text-green-500'}`} />
              <p className={`text-sm font-bold ${topDisease && topDisease.risk > 50 ? 'text-orange-700' : 'text-green-700'}`}>
                {loading ? '--' : topDisease ? `${topDisease.risk}%` : t('simple.diseaseRiskLow')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('simple.disease')}
              </p>
            </div>
          </Link>
        </div>

        {/* Priority Action */}
        <Link to={priorityAction.link}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileTap={{ scale: 0.98 }}
            className={`rounded-t-none rounded-b-2xl p-4 flex items-center gap-4 shadow-sm ${priorityAction.bg}`}
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <priorityAction.icon className={`w-6 h-6 ${priorityAction.textColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-base ${priorityAction.textColor}`}>{priorityAction.title}</p>
              <p className={`text-sm opacity-80 ${priorityAction.textColor}`}>{priorityAction.subtitle}</p>
            </div>
            <ArrowRight className={`w-5 h-5 flex-shrink-0 opacity-80 ${priorityAction.textColor}`} />
          </motion.div>
        </Link>
      </div>

      {/* ── Quick Links ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

        <Link to="/scanner" className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bug className="w-5 h-5 text-green-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">
              {t('simple.diseaseScanner')}
            </p>
            <p className="text-xs text-slate-500">
              {lastScanDate
                ? t('simple.lastScan', { when: daysAgo(lastScanDate, t) })
                : t('simple.neverScanned')}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </Link>

        <Link to="/irrigation" className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Droplets className="w-5 h-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">
              {t('simple.irrigationPlan')}
            </p>
            <p className="text-xs text-slate-500">
              {isWet ? t('simple.rainFalling') : t('simple.whenToWater')}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </Link>

        <Link to={`/farms/${farm.farmId}/cameras`} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-slate-800 text-sm">
                {t('simple.farmSecurity')}
              </p>
              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">AI</span>
            </div>
            <p className="text-xs text-slate-500">
              {t('simple.fireIntruderAnimals')}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </Link>

        <Link to="/health" className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">
              {t('simple.fullReport')}
            </p>
            <p className="text-xs text-slate-500">
              {t('simple.satelliteCharts')}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </Link>
      </div>

      {/* ── Help ──────────────────────────────────────────────────────── */}
      <a href="tel:1800-180-1551" className="flex items-center gap-3 p-3.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
        <Phone className="w-5 h-5 text-slate-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700">
            {t('simple.kisanHelpline')}
          </p>
          <p className="text-xs text-slate-500">1800-180-1551 · {t('simple.tollFree')}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </a>

    </div>
  );
}
