/**
 * Green Sentinel - Notification Panel Component
 */

import { X, Flame, User, PawPrint } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ThreatDetection, ThreatType } from '@green-sentinel/shared';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '@/stores/preferencesStore';

interface NotificationPanelProps {
  threats: ThreatDetection[];
  onClose: () => void;
}

const threatIcons: Record<ThreatType, typeof Flame> = {
  fire: Flame,
  human: User,
  animal: PawPrint,
};

const threatColors: Record<ThreatType, string> = {
  fire: 'bg-red-100 text-red-600',
  human: 'bg-orange-100 text-orange-600',
  animal: 'bg-yellow-100 text-yellow-600',
};

export default function NotificationPanel({
  threats,
  onClose,
}: NotificationPanelProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full right-0 mt-2 w-80 max-h-96 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">{t('common.recentAlerts')}</h3>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notifications list */}
      <div className="max-h-72 overflow-y-auto">
        {threats.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-sm">{t('common.noRecentAlerts')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {threats.map((threat) => {
              const Icon = threatIcons[threat.threatType];
              const colorClass = threatColors[threat.threatType];

              return (
                <div
                  key={threat.threatId}
                  className="flex items-start gap-3 p-4 hover:bg-slate-50 cursor-pointer"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 capitalize">
                      {threat.threatType} {t('common.detected')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {threat.confidenceScore}% {t('common.confidence')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(threat.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {threats.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <a
            href="/threats"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('common.viewAllAlerts')}
          </a>
        </div>
      )}
    </motion.div>
  );
}
