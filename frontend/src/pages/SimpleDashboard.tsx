/**
 * Green Sentinel - Simple Dashboard
 *
 * Ultra-simple dashboard for local farmers:
 * - Traffic light system (Green/Yellow/Red) for crop health
 * - Minimal text, maximum visual clarity
 * - Large touch-friendly buttons
 * - Voice announcements in local language
 * - Actionable advice instead of technical metrics
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Leaf,
  AlertTriangle,
  Volume2,
  RefreshCw,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sun,
  CloudRain,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import * as api from '@/services/apiService';
import { getHealthAdvice, getActionCards, getNdviExplanation } from '@/utils/farmerFriendly';

// =============================================================================
// VOICE SYNTHESIS
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
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!farm?.farmId) return;
    setLoading(true);
    try {
      const [healthRes, alertsRes, forecastRes] = await Promise.all([
        api.getCropHealth(farm.farmId, 7),
        api.getAlerts(farm.farmId),
        api.getForecast(farm.farmId),
      ]);
      setCropHealth(healthRes.data);
      setAlerts(alertsRes.data || []);
      setForecast(forecastRes.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [farm?.farmId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Health calculation
  const healthScore = cropHealth?.current?.healthScore || 0;
  const ndvi = cropHealth?.current?.ndvi || 0;
  const healthStatus = useMemo(() => {
    if (healthScore >= 60) return 'good';
    if (healthScore >= 40) return 'warning';
    return 'danger';
  }, [healthScore]);

  // Get farmer-friendly advice
  const healthAdvice = useMemo(() => {
    return getHealthAdvice(healthScore, language);
  }, [healthScore, language]);

  // NDVI explanation in simple terms
  const ndviExplanation = useMemo(() => {
    return getNdviExplanation(ndvi, language);
  }, [ndvi, language]);

  // Alert count
  const alertCount = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return alerts.filter(a => new Date(a.alertTimestamp).getTime() > dayAgo).length;
  }, [alerts]);

  // Soil moisture estimate (use satellite data if available)
  const soilMoisture = cropHealth?.current?.ndvi ? Math.round(cropHealth.current.ndvi * 100) : 50;

  // Action cards based on current situation
  const actionCards = useMemo(() => {
    return getActionCards(healthScore, alertCount, soilMoisture, language);
  }, [healthScore, alertCount, soilMoisture, language]);

  // Voice announcement - now uses farmer-friendly advice
  const announce = useCallback(() => {
    if (!voiceGuidance) return;
    setSpeaking(true);
    const msg = `${healthAdvice.title}. ${healthAdvice.message}`;
    speakMessage(msg, language);
    setTimeout(() => setSpeaking(false), 4000);
  }, [voiceGuidance, healthAdvice, language]);

  // No farm selected
  if (!farm) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8">
          <Leaf className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-xl text-slate-500">
            {language === 'hi' ? 'कोई खेत नहीं चुना' : 'No farm selected'}
          </p>
          <Link to="/farms" className="text-green-600 underline mt-2 inline-block">
            {language === 'hi' ? 'खेत जोड़ें' : 'Add Farm'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Farm Name & Voice Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{farm.name}</h1>
          <p className="text-slate-500">{farm.cropType}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={announce}
            disabled={speaking}
            className={`p-3 rounded-full transition-all ${
              speaking ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Volume2 className={`w-6 h-6 ${speaking ? 'animate-pulse' : ''}`} />
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-3 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* MAIN HEALTH INDICATOR - Actionable Advice Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`rounded-3xl p-6 mb-6 shadow-lg ${
          healthStatus === 'good'
            ? 'bg-gradient-to-br from-green-400 to-green-600'
            : healthStatus === 'warning'
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
            : 'bg-gradient-to-br from-red-400 to-red-600'
        }`}
      >
        {/* Status Icon */}
        <div className="flex items-center justify-center mb-3">
          {healthStatus === 'good' ? (
            <CheckCircle className="w-20 h-20 text-white drop-shadow-lg" />
          ) : healthStatus === 'warning' ? (
            <AlertTriangle className="w-20 h-20 text-white drop-shadow-lg" />
          ) : (
            <XCircle className="w-20 h-20 text-white drop-shadow-lg" />
          )}
        </div>

        {/* Farmer-Friendly Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {healthAdvice.title}
        </h2>

        {/* Simple Message */}
        <p className="text-white/90 text-center text-lg mb-3">
          {healthAdvice.message}
        </p>

        {/* Recommended Action */}
        {healthAdvice.action && (
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-white font-semibold flex items-center justify-center gap-2">
              <ArrowRight className="w-5 h-5" />
              {healthAdvice.action}
            </p>
          </div>
        )}

        {/* Plant greenness explanation */}
        <p className="text-white/80 text-sm text-center mt-3">
          {ndviExplanation}
        </p>
      </motion.div>

      {/* Weather Quick Info */}
      {forecast?.latest?.weather && (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {forecast.latest.weather.precipitation > 0 ? (
              <CloudRain className="w-8 h-8 text-blue-500" />
            ) : (
              <Sun className="w-8 h-8 text-yellow-500" />
            )}
            <div>
              <p className="font-semibold text-slate-800">{Math.round(forecast.latest.weather.temp)}°C</p>
              <p className="text-sm text-slate-500">
                {language === 'hi' ? 'आज का मौसम' : 'Today\'s Weather'}
              </p>
            </div>
          </div>
          <Link to="/weather" className="text-green-600 text-sm font-medium">
            {language === 'hi' ? 'विवरण' : 'Details'} →
          </Link>
        </div>
      )}

      {/* Alert Banner (only if alerts exist) */}
      {alertCount > 0 && (
        <Link to="/threats">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-red-500 text-white rounded-2xl p-4 mb-6 flex items-center gap-4 shadow-lg"
          >
            <div className="bg-white/20 p-2 rounded-full">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <span className="text-2xl font-bold">{alertCount}</span>
              <span className="ml-2 text-lg">
                {language === 'hi' ? 'चेतावनी' : 'Alerts'}
              </span>
            </div>
            <span className="text-2xl">&rarr;</span>
          </motion.div>
        </Link>
      )}

      {/* Action Cards - Situation-Aware */}
      <div className="grid grid-cols-2 gap-3">
        {actionCards.map((card, index) => {
          const isExternal = card.link.startsWith('tel:');
          const CardWrapper = isExternal ? 'a' : Link;
          const linkProps = isExternal ? { href: card.link } : { to: card.link };

          return (
            <CardWrapper key={card.id} {...linkProps as any}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.95 }}
                className={`rounded-2xl p-5 shadow-md border-2 ${card.bgColor} ${
                  card.urgent ? 'ring-2 ring-offset-2 ring-red-400' : ''
                } transition-all hover:shadow-lg`}
              >
                <div className="text-center">
                  <span className="text-4xl mb-2 block">{card.icon}</span>
                  <p className={`font-bold text-lg ${card.color}`}>{card.title}</p>
                  <p className="text-slate-500 text-sm mt-1">{card.subtitle}</p>
                </div>
                {card.urgent && (
                  <div className="mt-2 text-center">
                    <span className="inline-block bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                      {language === 'hi' ? 'तुरंत!' : 'Urgent!'}
                    </span>
                  </div>
                )}
              </motion.div>
            </CardWrapper>
          );
        })}
      </div>

      {/* Quick Health Details Link */}
      <Link to="/health">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 p-4 bg-slate-100 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Leaf className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-slate-700">
                {language === 'hi' ? 'विस्तृत जानकारी देखें' : 'View Detailed Report'}
              </p>
              <p className="text-sm text-slate-500">
                {language === 'hi' ? 'उपग्रह डेटा और चार्ट' : 'Satellite data & charts'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400" />
        </motion.div>
      </Link>

      {/* Helpful Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-800 text-center font-medium">
          💡 {language === 'hi'
            ? 'टिप: रोज़ सुबह फसल की जांच करें। समस्या जल्दी पकड़ने से नुकसान कम होता है।'
            : language === 'kn'
            ? 'ಸಲಹೆ: ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ಬೆಳೆ ಪರಿಶೀಲಿಸಿ.'
            : 'Tip: Check crops every morning. Catching problems early reduces damage.'}
        </p>
      </div>
    </div>
  );
}
