/**
 * Green Sentinel - Settings Page
 *
 * User preferences, language settings, and notification configuration.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Globe,
  Shield,
  LogOut,
  ChevronRight,
  Volume2,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Leaf,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useFarmStore } from '@/stores/farmStore';
import { usePreferencesStore, useTranslation, type UIMode, type Language } from '@/stores/preferencesStore';
import { useIsMobile } from '@/hooks/useIsMobile';
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
  const { getCurrentFarm } = useFarmStore();
  const { uiMode, setUIMode, setLanguage: setPrefLanguage } = usePreferencesStore();
  const { t } = useTranslation();
  const farm = getCurrentFarm();
  const isMobile = useIsMobile(); // Mode toggle only shown on mobile

  const [voiceEnabled, setVoiceEnabled] = useState(
    user?.alertPreferences?.voiceEnabled ?? true
  );
  const [textEnabled, setTextEnabled] = useState(
    user?.alertPreferences?.textEnabled ?? true
  );

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
          Minimum confidence required to trigger alerts
        </p>

        <div className="space-y-4">
          <ThresholdSlider
            label="Fire Detection"
            value={farm?.alertThresholds.fire || 80}
            color="red"
          />
          <ThresholdSlider
            label="Human Detection"
            value={farm?.alertThresholds.human || 80}
            color="orange"
          />
          <ThresholdSlider
            label="Animal Detection"
            value={farm?.alertThresholds.animal || 75}
            color="yellow"
          />
        </div>
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

        <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
          <div>
            <p className="font-medium text-slate-900">Change Phone Number</p>
            <p className="text-sm text-slate-500">Update your login number</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
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
}: {
  label: string;
  value: number;
  color: 'red' | 'orange' | 'yellow';
}) {
  const colorClasses = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{value}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
