/**
 * Green Sentinel - Simple Bottom Navigation
 *
 * Minimal navigation for Simple Mode with only 4 essential items:
 * Home, Camera (scan), Help (call), Settings
 */

import { NavLink } from 'react-router-dom';
import { Home, Camera, Phone, Settings } from 'lucide-react';
import clsx from 'clsx';
import { usePreferencesStore } from '@/stores/preferencesStore';

const navItems = [
  { path: '/', label: 'Home', labelHi: 'होम', labelKn: 'ಮನೆ', icon: Home },
  { path: '/scanner', label: 'Scan', labelHi: 'स्कैन', labelKn: 'ಸ್ಕ್ಯಾನ್', icon: Camera },
  { path: 'tel:1800-180-1551', label: 'Help', labelHi: 'मदद', labelKn: 'ಸಹಾಯ', icon: Phone, isExternal: true },
  { path: '/settings', label: 'Settings', labelHi: 'सेटिंग', labelKn: 'ಸೆಟ್ಟಿಂಗ್', icon: Settings },
];

export default function SimpleBottomNav() {
  const { language } = usePreferencesStore();

  const getLabel = (item: typeof navItems[0]) => {
    if (language === 'hi') return item.labelHi;
    if (language === 'kn') return item.labelKn;
    return item.label;
  };

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
              <span className="text-xs font-medium">{getLabel(item)}</span>
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
                  <span className="text-xs font-medium">{getLabel(item)}</span>
                </>
              )}
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
}
