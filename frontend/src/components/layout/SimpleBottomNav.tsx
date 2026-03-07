/**
 * Green Sentinel - Simple Bottom Navigation
 *
 * Minimal navigation for Simple Mode with only 4 essential items:
 * Home, Camera (scan), Help (call), Settings
 */

import { NavLink } from 'react-router-dom';
import { Home, Camera, Phone, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '@/stores/preferencesStore';

const navItems = [
  { path: '/', key: 'nav.home', icon: Home },
  { path: '/scanner', key: 'nav.scan', icon: Camera },
  { path: 'tel:1800-180-1551', key: 'nav.help', icon: Phone, isExternal: true },
  { path: '/settings', key: 'nav.settings', icon: Settings },
];

export default function SimpleBottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) =>
          item.isExternal ? (
            <a
              key={item.path}
              href={item.path}
              className="flex flex-col items-center justify-center py-2 px-4 text-slate-500 hover:text-green-600 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-1">
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium">{t(item.key)}</span>
            </a>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center py-2 px-4 transition-colors',
                  isActive ? 'text-green-600' : 'text-slate-500 hover:text-green-600'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={clsx(
                      'w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-colors',
                      isActive ? 'bg-green-500' : 'bg-slate-100'
                    )}
                  >
                    <item.icon
                      className={clsx(
                        'w-6 h-6',
                        isActive ? 'text-white' : 'text-slate-600'
                      )}
                    />
                  </div>
                  <span className="text-xs font-medium">{t(item.key)}</span>
                </>
              )}
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
}
