import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Layout
import Layout from '@/components/layout/Layout';
import LoadingScreen from '@/components/common/LoadingScreen';
import OfflineBanner from '@/components/common/OfflineBanner';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const SimpleDashboard = lazy(() => import('@/pages/SimpleDashboard'));
const ThreatHistory = lazy(() => import('@/pages/ThreatHistory'));
const CropHealth = lazy(() => import('@/pages/CropHealth'));
const FarmManagement = lazy(() => import('@/pages/FarmManagement'));
const CameraManagement = lazy(() => import('@/pages/CameraManagement'));
const Settings = lazy(() => import('@/pages/Settings'));
const Login = lazy(() => import('@/pages/Login'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Weather = lazy(() => import('@/pages/Weather'));
const IrrigationPlanner = lazy(() => import('@/pages/IrrigationPlanner'));
const DiseaseScanner = lazy(() => import('@/pages/DiseaseScanner'));

// Hooks and Stores
import { useAuthStore } from '@/stores/authStore';
import { useFarmStore, DEMO_FARMS } from '@/stores/farmStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useIsMobile } from '@/hooks/useIsMobile';

// Demo mode detection
const IS_DEMO_BUILD = import.meta.env.VITE_DEMO_MODE === 'true';

// Seed demo state at module level — before React renders and before any
// persist hydration race can overwrite. Also re-runs on every page load
// (including incognito refresh) so farms are always guaranteed to be present.
if (typeof window !== 'undefined') {
  if (IS_DEMO_BUILD || new URLSearchParams(window.location.search).has('demo')) {
    useAuthStore.getState().instantDemoLogin();
    useFarmStore.getState().setFarms(DEMO_FARMS);
    useFarmStore.getState().setCurrentFarm(DEMO_FARMS[0].farmId);
  }
}

/**
 * Protected route wrapper
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Demo build: always authenticated, never redirect to login
  if (IS_DEMO_BUILD) {
    return <>{children}</>;
  }

  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Dashboard Switch - renders Simple or Expert dashboard based on user preference
 * Simple mode is only available on mobile devices
 */
function DashboardSwitch() {
  const { uiMode } = usePreferencesStore();
  const isMobile = useIsMobile();

  // Simple mode only on mobile phones
  const showSimple = isMobile && uiMode === 'simple';
  return showSimple ? <SimpleDashboard /> : <Dashboard />;
}

/**
 * Main App component
 */
function App() {
  const isOnline = useOnlineStatus();

  return (
    <BrowserRouter>
      {/* Show offline banner when not connected */}
      {!isOnline && <OfflineBanner />}

      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes — on demo build, /login redirects straight to dashboard */}
          <Route
            path="/login"
            element={IS_DEMO_BUILD ? <Navigate to="/" replace /> : <Login />}
          />

          {/* Protected routes with layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardSwitch />} />
            <Route path="threats" element={<ThreatHistory />} />
            <Route path="health" element={<CropHealth />} />
            <Route path="weather" element={<Weather />} />
            <Route path="irrigation" element={<IrrigationPlanner />} />
            <Route path="scanner" element={<DiseaseScanner />} />
            <Route path="farms" element={<FarmManagement />} />
            <Route path="farms/:farmId/cameras" element={<CameraManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
