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
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useIsMobile } from '@/hooks/useIsMobile';

/**
 * Protected route wrapper
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
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
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

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
