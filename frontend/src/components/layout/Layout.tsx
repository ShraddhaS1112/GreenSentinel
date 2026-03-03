/**
 * Green Sentinel - Main Layout Component
 *
 * Provides the main application layout with navigation,
 * header, and content area.
 *
 * Simple Mode: Only available on mobile phones
 * Expert Mode: Default for tablets and desktops (no toggle option)
 */

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import SimpleBottomNav from './SimpleBottomNav';
import { useState, useEffect } from 'react';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useFarmStore } from '@/stores/farmStore';
import { useAuthStore } from '@/stores/authStore';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { uiMode } = usePreferencesStore();
  const isMobile = useIsMobile();
  const { fetchFarms } = useFarmStore();
  const { user } = useAuthStore();

  // Fetch farms when user is authenticated
  useEffect(() => {
    if (user?.userId) {
      fetchFarms(user.userId);
    }
  }, [user?.userId, fetchFarms]);

  // Simple Mode: Only on mobile phones when user preference is 'simple'
  const showSimpleMode = isMobile && uiMode === 'simple';

  if (showSimpleMode) {
    return (
      <div className="min-h-screen bg-slate-50 overflow-x-hidden">
        {/* Page content - full width, no sidebar */}
        <main className="pb-24">
          <Outlet />
        </main>

        {/* Simple bottom navigation */}
        <SimpleBottomNav />
      </div>
    );
  }

  // Expert Mode: Full layout with sidebar (default for tablets/desktops)
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
