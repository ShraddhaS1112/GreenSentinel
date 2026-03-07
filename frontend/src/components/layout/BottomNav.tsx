/**
 * Green Sentinel - Mobile Bottom Navigation
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Leaf,
  Building2,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '@/stores/preferencesStore';

export default function BottomNav() {
  const { t } = useTranslation();

  const navItems = [
    { path: '/', label: t('nav.home'), icon: LayoutDashboard },
    { path: '/threats', label: t('nav.threats'), icon: AlertTriangle },
    { path: '/health', label: t('nav.health'), icon: Leaf },
    { path: '/farms', label: t('nav.farms'), icon: Building2 },
    { path: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <nav className="bottom-nav lg:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx('bottom-nav-item flex-1', isActive && 'active')
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
