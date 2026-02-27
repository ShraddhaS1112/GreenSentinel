/**
 * Green Sentinel - Dashboard Page
 *
 * Main dashboard showing farm overview, recent threats,
 * health score, and camera status.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Leaf,
  Camera,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  User,
  PawPrint,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import { ThreatType } from '@green-sentinel/shared';

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Dashboard() {
  const { getCurrentFarm, threats } = useFarmStore();
  const farm = getCurrentFarm();

  // Calculate stats
  const stats = useMemo(() => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const recentThreats = threats.filter(
      (t) => new Date(t.createdAt).getTime() > dayAgo
    );
    const weeklyThreats = threats.filter(
      (t) => new Date(t.createdAt).getTime() > weekAgo
    );

    const threatsByType = {
      fire: recentThreats.filter((t) => t.threatType === 'fire').length,
      human: recentThreats.filter((t) => t.threatType === 'human').length,
      animal: recentThreats.filter((t) => t.threatType === 'animal').length,
    };

    return {
      threatsToday: recentThreats.length,
      threatsWeek: weeklyThreats.length,
      threatsByType,
      activeCameras: farm?.cameras.filter((c) => c.status === 'connected').length || 0,
      totalCameras: farm?.cameras.length || 0,
    };
  }, [farm, threats]);

  // Mock health score (in production, fetch from API)
  const healthScore = 78;
  const healthTrend = 'improving' as const;
  const previousScore = 72;

  if (!farm) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <AlertTriangle className="empty-state-icon" />
          <h2 className="empty-state-title">No Farm Selected</h2>
          <p className="empty-state-description">
            Please select a farm from the sidebar or create a new one.
          </p>
          <Link to="/farms" className="btn-primary mt-4">
            Manage Farms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{farm.name}</h1>
        <p className="text-slate-500 mt-1">
          {farm.location.district}, {farm.location.state} • {farm.cropType}
        </p>
      </div>

      {/* Stats grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid-dashboard mb-6"
      >
        {/* Health Score Card */}
        <motion.div variants={cardVariants} className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Crop Health</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-900">
                  {healthScore}
                </span>
                <span className="text-slate-400 text-sm mb-1">/100</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {healthTrend === 'improving' ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">
                      +{healthScore - previousScore} from last week
                    </span>
                  </>
                ) : healthTrend === 'declining' ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">
                      {healthScore - previousScore} from last week
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">Stable</span>
                  </>
                )}
              </div>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                healthScore >= 70
                  ? 'bg-green-100'
                  : healthScore >= 50
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
              }`}
            >
              <Leaf
                className={`w-6 h-6 ${
                  healthScore >= 70
                    ? 'text-green-600'
                    : healthScore >= 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              />
            </div>
          </div>
          <Link
            to="/health"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4"
          >
            View details <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Threats Today Card */}
        <motion.div variants={cardVariants} className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Threats Today</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-900">
                  {stats.threatsToday}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                {stats.threatsWeek} this week
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                stats.threatsToday > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 ${
                  stats.threatsToday > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              />
            </div>
          </div>
          <Link
            to="/threats"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4"
          >
            View history <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Cameras Card */}
        <motion.div variants={cardVariants} className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Cameras</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-900">
                  {stats.activeCameras}
                </span>
                <span className="text-slate-400 text-sm mb-1">
                  /{stats.totalCameras}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="status-online" />
                <span className="text-sm text-slate-500">
                  {stats.activeCameras === stats.totalCameras
                    ? 'All cameras online'
                    : `${stats.totalCameras - stats.activeCameras} offline`}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <Link
            to={`/farms/${farm.farmId}/cameras`}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4"
          >
            Manage cameras <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </motion.div>

      {/* Threats by type */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="card mb-6"
      >
        <h2 className="section-header flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-400" />
          Today's Threats by Type
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <ThreatTypeCard
            type={ThreatType.FIRE}
            count={stats.threatsByType.fire}
            icon={Flame}
            color="red"
          />
          <ThreatTypeCard
            type={ThreatType.HUMAN}
            count={stats.threatsByType.human}
            icon={User}
            color="orange"
          />
          <ThreatTypeCard
            type={ThreatType.ANIMAL}
            count={stats.threatsByType.animal}
            icon={PawPrint}
            color="yellow"
          />
        </div>
      </motion.div>

      {/* Recent threats */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="card"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header mb-0">Recent Alerts</h2>
          <Link
            to="/threats"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            View all
          </Link>
        </div>

        {threats.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No recent threats detected</p>
            <p className="text-sm">Your farm is currently secure</p>
          </div>
        ) : (
          <div className="space-y-3">
            {threats.slice(0, 5).map((threat) => (
              <ThreatListItem key={threat.threatId} threat={threat} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ThreatTypeCard({
  type,
  count,
  icon: Icon,
  color,
}: {
  type: ThreatType;
  count: number;
  icon: typeof Flame;
  color: 'red' | 'orange' | 'yellow';
}) {
  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
  };

  return (
    <div
      className={`p-4 rounded-xl border ${colorClasses[color]} text-center`}
    >
      <Icon className="w-6 h-6 mx-auto mb-2" />
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs capitalize opacity-75">{type}</p>
    </div>
  );
}

function ThreatListItem({
  threat,
}: {
  threat: {
    threatId: string;
    threatType: ThreatType;
    confidenceScore: number;
    createdAt: string;
  };
}) {
  const icons: Record<ThreatType, typeof Flame> = {
    fire: Flame,
    human: User,
    animal: PawPrint,
  };

  const colors: Record<ThreatType, string> = {
    fire: 'bg-red-100 text-red-600',
    human: 'bg-orange-100 text-orange-600',
    animal: 'bg-yellow-100 text-yellow-600',
  };

  const Icon = icons[threat.threatType];
  const colorClass = colors[threat.threatType];

  const timeAgo = getRelativeTime(new Date(threat.createdAt));

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900 capitalize">
          {threat.threatType} detected
        </p>
        <p className="text-xs text-slate-500">
          {threat.confidenceScore}% confidence • {timeAgo}
        </p>
      </div>
    </div>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
