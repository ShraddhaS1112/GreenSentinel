/**
 * Green Sentinel - Loading Screen Component
 */

import { Shield } from 'lucide-react';
import { useTranslation } from '@/stores/preferencesStore';

export default function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
        <Shield className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-xl font-semibold text-white mb-2">{t('common.appName')}</h1>
      <p className="text-primary-200 text-sm mb-8">{t('common.loadingFarmData')}</p>
      <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}
