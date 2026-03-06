/**
 * Green Sentinel - Header Component
 */

import { Menu, Bell, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useFarmStore } from '@/stores/farmStore';
import { useState } from 'react';
import NotificationPanel from '../notifications/NotificationPanel';
import { useTranslation } from '@/stores/preferencesStore';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const { getCurrentFarm, threats } = useFarmStore();
  const currentFarm = getCurrentFarm();
  const [showNotifications, setShowNotifications] = useState(false);

  // Count unread threats (last 24 hours)
  const recentThreats = threats.filter((t) => {
    const threatTime = new Date(t.createdAt).getTime();
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return threatTime > dayAgo;
  });

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Menu button (mobile only) */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title / Farm name */}
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-slate-900">
              {currentFarm?.name || t('common.dashboard')}
            </h1>
            {currentFarm && (
              <p className="text-xs text-slate-500">
                {currentFarm.cropType} • {currentFarm.area} {t('farms.hectares')}
              </p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isOnline
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('common.onlineStatus')}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('common.offlineStatus')}</span>
              </>
            )}
          </div>

          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <Bell className="w-5 h-5" />
            {recentThreats.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {recentThreats.length > 9 ? '9+' : recentThreats.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notification panel */}
      {showNotifications && (
        <NotificationPanel
          threats={recentThreats}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </header>
  );
}
