/**
 * Green Sentinel - Sidebar Navigation
 */

import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  AlertTriangle,
  Leaf,
  Building2,
  Settings,
  X,
  Shield,
  Cloud,
  Droplets,
  Bug,
} from 'lucide-react';
import clsx from 'clsx';
import { useFarmStore } from '@/stores/farmStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/threats', label: 'Threat History', icon: AlertTriangle },
  { path: '/health', label: 'Crop Health', icon: Leaf },
  { path: '/scanner', label: 'Disease Scanner', icon: Bug },
  { path: '/weather', label: 'Weather', icon: Cloud },
  { path: '/irrigation', label: 'Irrigation', icon: Droplets },
  { path: '/farms', label: 'Farm Management', icon: Building2 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { farms, currentFarmId, setCurrentFarm, getCurrentFarm } = useFarmStore();
  const currentFarm = getCurrentFarm();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200',
          'transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Green Sentinel</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Farm selector */}
        <div className="p-4 border-b border-slate-200">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Current Farm
          </label>
          <select
            value={currentFarmId || ''}
            onChange={(e) => setCurrentFarm(e.target.value)}
            className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {farms.map((farm) => (
              <option key={farm.farmId} value={farm.farmId}>
                {farm.name}
              </option>
            ))}
          </select>
          {currentFarm && (
            <p className="mt-2 text-xs text-slate-500">
              {currentFarm.location.district}, {currentFarm.location.state}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'nav-item',
                  isActive && 'active'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {currentFarm?.name?.charAt(0) || 'G'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {currentFarm?.name || 'No farm selected'}
              </p>
              <p className="text-xs text-slate-500">
                {currentFarm?.cameras.length || 0} cameras
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
