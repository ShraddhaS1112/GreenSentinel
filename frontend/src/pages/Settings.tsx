/**
 * Green Sentinel - Settings Page
 *
 * User preferences, language settings, and notification configuration.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Bell,
  Globe,
  Shield,
  LogOut,
  Volume2,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Leaf,
  ChevronDown,
  Save,
  Info,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useFarmStore } from '@/stores/farmStore';
import { usePreferencesStore, useTranslation, type UIMode, type Language } from '@/stores/preferencesStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import * as api from '@/services/apiService';
import toast from 'react-hot-toast';

const languages: { code: Language; name: string; native: string }[] = [
  { code: 'en' as Language, name: 'English', native: 'English' },
  { code: 'hi' as Language, name: 'Hindi', native: 'हिन्दी' },
  { code: 'mr' as Language, name: 'Marathi', native: 'मराठी' },
  { code: 'ta' as Language, name: 'Tamil', native: 'தமிழ்' },
  { code: 'te' as Language, name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn' as Language, name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'bn' as Language, name: 'Bengali', native: 'বাংলা' },
];

export default function Settings() {
  const { user, updateLanguage, logout } = useAuthStore();
  const { getCurrentFarm, updateFarm: updateFarmInStore } = useFarmStore();
  const { uiMode, setUIMode, setLanguage: setPrefLanguage } = usePreferencesStore();
  const { t } = useTranslation();
  const farm = getCurrentFarm();
  const isMobile = useIsMobile();

  const [voiceEnabled, setVoiceEnabled] = useState(
    user?.alertPreferences?.voiceEnabled ?? true
  );
  const [textEnabled, setTextEnabled] = useState(
    user?.alertPreferences?.textEnabled ?? true
  );

  // Editable alert thresholds
  const [localThresholds, setLocalThresholds] = useState({
    fire: farm?.alertThresholds?.fire ?? 80,
    human: farm?.alertThresholds?.human ?? 80,
    animal: farm?.alertThresholds?.animal ?? 75,
  });
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [showScoreBasis, setShowScoreBasis] = useState(false);

  const handleModeChange = (mode: UIMode) => {
    setUIMode(mode);
    toast.success(mode === 'simple' ? t('settings.simpleMode') : t('settings.expertMode'));
  };

  const handleLanguageChange = (language: Language) => {
    updateLanguage(language);
    // Also update preferences store
    setPrefLanguage(language);
    toast.success('Language preference updated');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
      toast.success('Logged out successfully');
    }
  };

  const handleSaveThresholds = async () => {
    if (!farm?.farmId) return;
    setSavingThresholds(true);
    try {
      await api.updateFarm(farm.farmId, { alertThresholds: localThresholds } as any);
      updateFarmInStore(farm.farmId, { alertThresholds: localThresholds } as any);
      toast.success('Alert thresholds saved');
    } catch {
      toast.error('Failed to save thresholds');
    } finally {
      setSavingThresholds(false);
    }
  };

  return (
    <div className="page-container max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-4"
      >
        <h2 className="section-header flex items-center gap-2">
          <User className="w-5 h-5 text-slate-400" />
          Profile
        </h2>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {user?.name || 'Demo User'}
            </h3>
            <p className="text-slate-500">+91 {user?.phoneNumber || '9876543210'}</p>
            {user?.email && (
              <p className="text-slate-500 text-sm">{user.email}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* UI Mode Section - Only shown on mobile devices */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card mb-4"
        >
          <h2 className="section-header flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-slate-400" />
            {t('settings.title')} Mode
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Choose how you want to view information
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Simple Mode */}
            <button
              onClick={() => handleModeChange('simple')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                uiMode === 'simple'
                  ? 'border-green-500 bg-green-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  uiMode === 'simple' ? 'bg-green-500' : 'bg-slate-200'
                }`}>
                  <Leaf className={`w-6 h-6 ${uiMode === 'simple' ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className={`font-semibold ${uiMode === 'simple' ? 'text-green-700' : 'text-slate-700'}`}>
                    {t('settings.simpleMode')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('settings.simpleModeDesc')}
                  </p>
                </div>
              </div>
              {uiMode === 'simple' && (
                <div className="mt-3 text-xs text-green-600 font-medium">
                  ✓ Active
                </div>
              )}
            </button>

            {/* Expert Mode */}
            <button
              onClick={() => handleModeChange('expert')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                uiMode === 'expert'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  uiMode === 'expert' ? 'bg-blue-500' : 'bg-slate-200'
                }`}>
                  <Sparkles className={`w-6 h-6 ${uiMode === 'expert' ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className={`font-semibold ${uiMode === 'expert' ? 'text-blue-700' : 'text-slate-700'}`}>
                    {t('settings.expertMode')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('settings.expertModeDesc')}
                  </p>
                </div>
              </div>
              {uiMode === 'expert' && (
                <div className="mt-3 text-xs text-blue-600 font-medium">
                  ✓ Active
                </div>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Language Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mb-4"
      >
        <h2 className="section-header flex items-center gap-2">
          <Globe className="w-5 h-5 text-slate-400" />
          Language
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Choose your preferred language for alerts
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`p-3 rounded-lg border text-left transition-all ${
                user?.language === lang.code
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-medium">{lang.native}</p>
              <p className="text-xs text-slate-500">{lang.name}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card mb-4"
      >
        <h2 className="section-header flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-400" />
          Notifications
        </h2>

        <div className="space-y-4">
          <SettingToggle
            icon={MessageSquare}
            title="Text Alerts"
            description="Receive WhatsApp text messages for threats"
            enabled={textEnabled}
            onChange={setTextEnabled}
          />

          <SettingToggle
            icon={Volume2}
            title="Voice Alerts"
            description="Receive voice messages in your language"
            enabled={voiceEnabled}
            onChange={setVoiceEnabled}
          />
        </div>
      </motion.div>

      {/* Alert Thresholds */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card mb-4"
      >
        <h2 className="section-header flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-slate-400" />
          Alert Thresholds
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Minimum AI confidence required to trigger an alert
        </p>

        <div className="space-y-5">
          <ThresholdSlider
            label="🔥 Fire Detection"
            value={localThresholds.fire}
            color="red"
            onChange={v => setLocalThresholds(t => ({ ...t, fire: v }))}
          />
          <ThresholdSlider
            label="👤 Human Intrusion"
            value={localThresholds.human}
            color="orange"
            onChange={v => setLocalThresholds(t => ({ ...t, human: v }))}
          />
          <ThresholdSlider
            label="🐗 Animal Intrusion"
            value={localThresholds.animal}
            color="yellow"
            onChange={v => setLocalThresholds(t => ({ ...t, animal: v }))}
          />
        </div>

        <button
          onClick={handleSaveThresholds}
          disabled={savingThresholds}
          className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          {savingThresholds ? 'Saving...' : 'Save Thresholds'}
        </button>

        {/* Score calculation basis */}
        <button
          onClick={() => setShowScoreBasis(!showScoreBasis)}
          className="mt-4 w-full flex items-center justify-between text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-4 h-4" />
            How are AI scores calculated?
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showScoreBasis ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showScoreBasis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-4 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-3">
                <div>
                  <p className="font-semibold text-slate-800 mb-1">NDVI (Vegetation Index)</p>
                  <p className="font-mono bg-white px-2 py-1 rounded text-slate-700 mb-1">NDVI = (NIR − Red) / (NIR + Red)</p>
                  <p>Derived from Sentinel-2 satellite Band 8 (NIR) and Band 4 (Red). Range: −1 to +1.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Crop Health Score (0–100)</p>
                  <div className="space-y-0.5">
                    <p>NDVI ≥ 0.6 → <span className="text-green-600 font-medium">Excellent (95)</span></p>
                    <p>NDVI ≥ 0.45 → <span className="text-lime-600 font-medium">Good (80)</span></p>
                    <p>NDVI ≥ 0.3 → <span className="text-yellow-600 font-medium">Moderate (60)</span></p>
                    <p>NDVI ≥ 0.15 → <span className="text-orange-600 font-medium">Stressed (40)</span></p>
                    <p>NDVI &lt; 0.15 → <span className="text-red-600 font-medium">Poor (20)</span></p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Disease Risk Score</p>
                  <p>Weighted weather model: Humidity (35%) + Temperature match (30%) + Precipitation (25%) + Wind (10%)</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">AI Threat Detection</p>
                  <p>Bedrock Claude Vision model analyzes each camera frame. Score = model confidence (0–100%). Your threshold controls when an alert fires.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card mb-4"
      >
        <h2 className="section-header flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-400" />
          Security
        </h2>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
          <Lock className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-slate-900">Login Phone Number</p>
            <p className="text-sm text-slate-500">+91 {user?.phoneNumber || '—'} · Contact support to change</p>
          </div>
        </div>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </motion.div>

      {/* Version info */}
      <p className="text-center text-slate-400 text-sm mt-8">
        Green Sentinel v1.0.0 • Made with ❤️ for Indian Farmers
      </p>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function SettingToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <label className="ml-3 flex-shrink-0 relative inline-block cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-slate-300 peer-checked:bg-primary-600 rounded-full transition-colors duration-200" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
      </label>
    </div>
  );
}

function ThresholdSlider({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: number;
  color: 'red' | 'orange' | 'yellow';
  onChange: (value: number) => void;
}) {
  const colorClasses = {
    red: 'accent-red-500',
    orange: 'accent-orange-500',
    yellow: 'accent-yellow-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{value}%</span>
      </div>
      <input
        type="range"
        min={50}
        max={99}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full h-2 rounded-full cursor-pointer ${colorClasses[color]}`}
      />
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>50% (sensitive)</span>
        <span>99% (strict)</span>
      </div>
    </div>
  );
}
