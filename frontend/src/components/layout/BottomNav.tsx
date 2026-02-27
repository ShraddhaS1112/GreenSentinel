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

const navItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/threats', label: 'Threats', icon: AlertTriangle },
  { path: '/health', label: 'Health', icon: Leaf },
  { path: '/farms', label: 'Farms', icon: Building2 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
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
