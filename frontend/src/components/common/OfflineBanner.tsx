/**
 * Green Sentinel - Offline Banner Component
 */

import { WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/stores/preferencesStore';

export default function OfflineBanner() {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="offline-banner flex items-center justify-center gap-2"
    >
      <WifiOff className="w-4 h-4" />
      <span>{t('common.offline')}</span>
    </motion.div>
  );
}
