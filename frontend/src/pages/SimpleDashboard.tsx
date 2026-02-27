/**
 * Green Sentinel - Simple Dashboard
 *
 * Ultra-simple dashboard for local farmers:
 * - Traffic light system (Green/Yellow/Red) for crop health
 * - Minimal text, maximum visual clarity
 * - Large touch-friendly buttons
 * - Voice announcements in local language
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Leaf,
  AlertTriangle,
  Droplets,
  Camera,
  Phone,
  Volume2,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import { usePreferencesStore, useTranslation } from '@/stores/preferencesStore';
import * as api from '@/services/apiService';

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
  const { t } = useTranslation();
  const farm = getCurrentFarm();

  const [cropHealth, setCropHealth] = useState<api.CropHealthResponse | null>(null);
  const [alerts, setAlerts] = useState<api.Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!farm?.farmId) return;
    setLoading(true);
    try {
      const [healthRes, alertsRes] = await Promise.all([
        api.getCropHealth(farm.farmId, 7),
        api.getAlerts(farm.farmId),
      ]);
      setCropHealth(healthRes.data);
      setAlerts(alertsRes.data || []);
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
  const healthStatus = useMemo(() => {
    if (healthScore >= 60) return 'good';
    if (healthScore >= 40) return 'warning';
    return 'danger';
  }, [healthScore]);

  // Alert count
  const alertCount = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return alerts.filter(a => new Date(a.alertTimestamp).getTime() > dayAgo).length;
  }, [alerts]);

  // Voice announcement
  const announce = useCallback(() => {
    if (!voiceGuidance) return;
    setSpeaking(true);
    const msg = healthStatus === 'good'
      ? t('voice.cropHealthy')
      : t('voice.needsWater');
    speakMessage(msg, language);
    setTimeout(() => setSpeaking(false), 4000);
  }, [voiceGuidance, healthStatus, t, language]);

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

      {/* MAIN HEALTH INDICATOR - Traffic Light Style */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`rounded-3xl p-8 mb-6 text-center shadow-lg ${
          healthStatus === 'good'
            ? 'bg-gradient-to-br from-green-400 to-green-600'
            : healthStatus === 'warning'
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
            : 'bg-gradient-to-br from-red-400 to-red-600'
        }`}
      >
        {/* Status Icon */}
        <div className="mb-4">
          {healthStatus === 'good' ? (
            <CheckCircle className="w-24 h-24 mx-auto text-white drop-shadow-lg" />
          ) : healthStatus === 'warning' ? (
            <AlertTriangle className="w-24 h-24 mx-auto text-white drop-shadow-lg" />
          ) : (
            <XCircle className="w-24 h-24 mx-auto text-white drop-shadow-lg" />
          )}
        </div>

        {/* Status Text */}
        <h2 className="text-3xl font-bold text-white mb-2">
          {healthStatus === 'good'
            ? (language === 'hi' ? 'फसल अच्छी है' : language === 'kn' ? 'ಬೆಳೆ ಚೆನ್ನಾಗಿದೆ' : 'Crops Healthy')
            : healthStatus === 'warning'
            ? (language === 'hi' ? 'ध्यान दें' : language === 'kn' ? 'ಗಮನಿಸಿ' : 'Needs Attention')
            : (language === 'hi' ? 'खतरा!' : language === 'kn' ? 'ಅಪಾಯ!' : 'Danger!')}
        </h2>

        {/* Score */}
        <p className="text-white/90 text-lg">
          {language === 'hi' ? 'स्वास्थ्य स्कोर' : 'Health Score'}: <span className="font-bold text-2xl">{healthScore}</span>/100
        </p>
      </motion.div>

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

      {/* Action Buttons - Large & Simple */}
      <div className="grid grid-cols-2 gap-4">
        {/* Scan Disease */}
        <Link to="/scanner">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-2xl p-6 shadow-md border-2 border-green-200 hover:border-green-400 transition-colors"
          >
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Camera className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-center font-semibold text-slate-700">
              {language === 'hi' ? 'फोटो लें' : language === 'kn' ? 'ಫೋಟೋ ತೆಗೆಯಿರಿ' : 'Take Photo'}
            </p>
          </motion.div>
        </Link>

        {/* Irrigation */}
        <Link to="/irrigation">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-2xl p-6 shadow-md border-2 border-blue-200 hover:border-blue-400 transition-colors"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Droplets className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-center font-semibold text-slate-700">
              {language === 'hi' ? 'सिंचाई' : language === 'kn' ? 'ನೀರಾವರಿ' : 'Irrigation'}
            </p>
          </motion.div>
        </Link>

        {/* View Details */}
        <Link to="/health">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-2xl p-6 shadow-md border-2 border-purple-200 hover:border-purple-400 transition-colors"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Leaf className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-center font-semibold text-slate-700">
              {language === 'hi' ? 'विवरण' : language === 'kn' ? 'ವಿವರಗಳು' : 'Details'}
            </p>
          </motion.div>
        </Link>

        {/* Call Expert */}
        <a href="tel:1800-180-1551">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-2xl p-6 shadow-md border-2 border-orange-200 hover:border-orange-400 transition-colors"
          >
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-center font-semibold text-slate-700">
              {language === 'hi' ? 'मदद' : language === 'kn' ? 'ಸಹಾಯ' : 'Get Help'}
            </p>
          </motion.div>
        </a>
      </div>

      {/* Tip */}
      <p className="text-center text-slate-400 text-sm mt-8">
        {language === 'hi'
          ? '💡 टिप: रोज़ फसल की जांच करें'
          : '💡 Tip: Check crops daily'}
      </p>
    </div>
  );
}
