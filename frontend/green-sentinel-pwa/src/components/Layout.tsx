import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { OfflineIndicator } from './OfflineIndicator';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState('farm-1');
  const location = useLocation();

  // Mock farms data with Hindi names
  const farms = [
    { id: 'farm-1', name: 'गुलाब का बाग', location: 'पुणे, महाराष्ट्र' },
    { id: 'farm-2', name: 'आंबा का खेत', location: 'खेड, पुणे' },
    { id: 'farm-3', name: 'गेहूं का खेत', location: 'महाराष्ट्र' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'डैशबोर्ड', icon: '📊' },
    { path: '/threats', label: 'अलर्ट इतिहास', icon: '⚠️' },
    { path: '/health', label: 'फसल स्वास्थ्य', icon: '🌱' },
    { path: '/farms', label: 'खेत', icon: '🚜' },
    { path: '/settings', label: 'सेटिंग्स', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-green-700 shadow-lg sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-green-500 rounded-lg transition text-white"
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}>
              🌾 Green-Sentinel
            </h1>
          </div>
          <OfflineIndicator />
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col`}
        >
          {/* Farm Selector */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-b from-green-50 to-white">
            <label
              className="block text-sm font-semibold text-gray-700 mb-2"
              style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
            >
              खेत निवडा
            </label>
            <select
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
            >
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name} ({farm.location})
                </option>
              ))}
            </select>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive(item.path)
                    ? 'bg-green-100 text-green-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer Info */}
          <div className="p-4 border-t border-gray-200 text-xs text-gray-500 bg-gray-50">
            <p className="font-semibold mb-1" style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}>
              खेत स्थिति
            </p>
            <p>सक्रिय कैमरे: 3</p>
            <p>अंतिम अपडेट: 2 मिनट पहले</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ selectedFarm }} />
        </main>
      </div>
    </div>
  );
};
