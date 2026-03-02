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
import { usePreferencesStore } from '@/stores/preferencesStore';
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

function daysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SimpleDashboard() {
  const { getCurrentFarm } = useFarmStore();
  const { voiceGuidance, language } = usePreferencesStore();
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

  // Core values
  const healthScore = cropHealth?.current?.healthScore || 0;
  const ndvi = cropHealth?.current?.ndvi || 0;

  const healthStatus = useMemo(() => {
    if (healthScore >= 60) return 'good';
    if (healthScore >= 40) return 'warning';
    return 'danger';
  }, [healthScore]);

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

  // Weekly health change from history
  const weeklyChange = useMemo(() => {
    const history = cropHealth?.history;
    if (!history || history.length < 2) return null;
    const sorted = [...history].sort(
      (a, b) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime()
    );
    return sorted[sorted.length - 1].healthScore - sorted[0].healthScore;
  }, [cropHealth]);

  // Today's specific task — one actionable sentence based on real data
  const todayTask = useMemo(() => {
    if (loading) return null;
    if (alertCount > 0) {
      return language === 'hi'
        ? `${alertCount} चेतावनी देखें — अभी`
        : `Check ${alertCount} farm alert${alertCount > 1 ? 's' : ''} now`;
    }
    if (topDisease && topDisease.risk > 65) {
      return language === 'hi'
        ? `${topDisease.name} का खतरा — पत्तियां जांचें`
        : `Watch for ${topDisease.name} — inspect leaves`;
    }
    if (ndvi > 0 && ndvi < 0.3 && isWet) {
      return language === 'hi'
        ? 'बारिश हो रही है — जल निकासी जांचें'
        : 'Rain falling — check drainage, hold irrigation';
    }
    if (ndvi > 0 && ndvi < 0.3) {
      return language === 'hi'
        ? 'आज पानी दें — मिट्टी सूखी है'
        : 'Water your crops today — soil moisture is low';
    }
    return language === 'hi'
      ? 'फसल ठीक है — इस हफ्ते एक बार जांचें'
      : 'Crops look healthy — do a routine check this week';
  }, [loading, alertCount, topDisease, ndvi, isWet, language]);

  // Priority action — single most urgent thing for the farmer
  const priorityAction = useMemo(() => {
    if (alertCount > 0) {
      return {
        link: '/threats',
        bg: 'bg-red-500',
        textColor: 'text-white',
        icon: AlertTriangle,
        title: language === 'hi' ? `${alertCount} चेतावनी है` : `${alertCount} Alert${alertCount > 1 ? 's' : ''} Need Attention`,
        subtitle: language === 'hi' ? 'अभी देखें' : 'Check now',
      };
    }
    if (topDisease && topDisease.risk > 65) {
      return {
        link: '/scanner',
        bg: 'bg-orange-500',
        textColor: 'text-white',
        icon: Bug,
        title: language === 'hi' ? `${topDisease.name} का खतरा` : `${topDisease.name} Risk`,
        subtitle: language === 'hi' ? `${topDisease.risk}% — निवारक उपाय करें` : `${topDisease.risk}% — take preventive action`,
      };
    }
    if (ndvi > 0 && ndvi < 0.3) {
      if (isWet) {
        return {
          link: '/irrigation',
          bg: 'bg-blue-500',
          textColor: 'text-white',
          icon: CloudRain,
          title: language === 'hi' ? 'बारिश हो रही है' : 'Rain Falling',
          subtitle: language === 'hi' ? 'सिंचाई रोकें — जल निकासी जांचें' : 'Hold irrigation — check drainage',
        };
      }
      return {
        link: '/irrigation',
        bg: 'bg-blue-500',
        textColor: 'text-white',
        icon: Droplets,
        title: language === 'hi' ? 'पानी की जांच करें' : 'Check Water Supply',
        subtitle: language === 'hi' ? 'पौधों में नमी कम है' : 'Plants may need irrigation',
      };
    }
    return {
      link: '/scanner',
      bg: 'bg-green-600',
      textColor: 'text-white',
      icon: Leaf,
      title: language === 'hi' ? 'फसल की जांच करें' : 'Scan Your Crops',
      subtitle: language === 'hi' ? 'फोटो लें, बीमारी पकड़ें' : 'Take a photo to detect diseases early',
    };
  }, [alertCount, topDisease, ndvi, isWet, language]);

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
    healthStatus === 'good' ? 'from-green-500 to-green-700' :
    healthStatus === 'warning' ? 'from-amber-500 to-orange-600' :
    'from-red-500 to-red-700';

  if (!farm) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="text-center">
          <Leaf className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <p className="text-lg text-slate-500 mb-3">
            {language === 'hi' ? 'कोई खेत नहीं चुना' : 'No farm selected'}
          </p>
          <Link to="/farms" className="inline-block px-4 py-2 bg-green-600 text-white rounded-xl font-medium text-sm">
            {language === 'hi' ? 'खेत जोड़ें' : 'Add Farm'}
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
              ? (language === 'hi'
                  ? `अंतिम डेटा: ${dataTimestamp.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}`
                  : `Showing last known data from ${dataTimestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`)
              : (language === 'hi' ? 'डेटा लोड नहीं हो सका' : 'Could not load data — check connection')}
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
              {language === 'hi' ? 'फसल स्वास्थ्य' : 'Farm Health'}
            </p>
            <div className="flex items-end gap-1.5">
              <span className="text-5xl font-black text-white leading-none">
                {loading ? '--' : healthScore}
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
                  ? <><TrendingUp className="w-3.5 h-3.5 text-white/80" /><span className="text-white/80 text-xs">+{weeklyChange} this week</span></>
                  : weeklyChange < 0
                  ? <><TrendingDown className="w-3.5 h-3.5 text-white/80" /><span className="text-white/80 text-xs">{weeklyChange} this week</span></>
                  : <><Minus className="w-3.5 h-3.5 text-white/70" /><span className="text-white/70 text-xs">Stable this week</span></>
                }
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white/25 rounded-full h-2 mb-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${loading ? 0 : healthScore}%` }}
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
            {language === 'hi'
              ? `इस हफ्ते: ${weeklyAlertCount > 0 ? `${weeklyAlertCount} चेतावनी` : 'कोई चेतावनी नहीं'} · स्वास्थ्य ${cropHealth?.trend === 'improving' ? 'सुधर रहा' : cropHealth?.trend === 'declining' ? 'घट रहा' : 'स्थिर'}`
              : `This week: ${weeklyAlertCount > 0 ? `${weeklyAlertCount} alert${weeklyAlertCount > 1 ? 's' : ''}` : 'no alerts'} · health ${cropHealth?.trend ?? 'stable'}`
            }
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
              {language === 'hi' ? 'मौसम' : 'Weather'}
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
                {language === 'hi' ? 'चेतावनी' : 'Alerts'}
              </p>
            </div>
          </Link>

          {/* Disease */}
          <Link to="/scanner">
            <div className={`rounded-t-xl rounded-b-none p-3 border text-center ${topDisease && topDisease.risk > 50 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
              <Bug className={`w-6 h-6 mx-auto mb-1 ${topDisease && topDisease.risk > 50 ? 'text-orange-500' : 'text-green-500'}`} />
              <p className={`text-sm font-bold ${topDisease && topDisease.risk > 50 ? 'text-orange-700' : 'text-green-700'}`}>
                {loading ? '--' : topDisease ? `${topDisease.risk}%` : 'Low'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'hi' ? 'बीमारी' : 'Disease'}
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
              {language === 'hi' ? 'बीमारी जांचें' : 'Disease Scanner'}
            </p>
            <p className="text-xs text-slate-500">
              {lastScanDate
                ? (language === 'hi' ? `अंतिम स्कैन: ${daysAgo(lastScanDate)}` : `Last scan: ${daysAgo(lastScanDate)}`)
                : (language === 'hi' ? 'अभी तक कोई स्कैन नहीं' : 'Never scanned — tap to start')}
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
              {language === 'hi' ? 'सिंचाई योजना' : 'Irrigation Plan'}
            </p>
            <p className="text-xs text-slate-500">
              {isWet
                ? (language === 'hi' ? 'बारिश हो रही है — पानी न दें' : 'Rain falling — no irrigation needed')
                : (language === 'hi' ? 'पानी कब दें' : 'When and how much to water')}
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
                {language === 'hi' ? 'खेत की निगरानी' : 'Farm Security Camera'}
              </p>
              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">AI</span>
            </div>
            <p className="text-xs text-slate-500">
              {language === 'hi' ? 'आग, घुसपैठ, जानवर' : 'Fire · Intruders · Animals'}
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
              {language === 'hi' ? 'पूरी रिपोर्ट' : 'Full Crop Report'}
            </p>
            <p className="text-xs text-slate-500">
              {language === 'hi' ? 'उपग्रह डेटा और चार्ट' : 'Satellite charts & trends'}
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
            {language === 'hi' ? 'किसान हेल्पलाइन' : 'Kisan Helpline'}
          </p>
          <p className="text-xs text-slate-500">1800-180-1551 · {language === 'hi' ? 'निःशुल्क' : 'Toll free'}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </a>

    </div>
  );
}
