/**
 * Green Sentinel - Threat History Page
 *
 * Displays historical threat detections with filtering and search.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Flame,
  User,
  PawPrint,
  Calendar,
  ChevronDown,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import type { ThreatType, ThreatDetection } from '@green-sentinel/shared';
import { format } from 'date-fns';

const threatIcons: Record<ThreatType, typeof Flame> = {
  fire: Flame,
  human: User,
  animal: PawPrint,
};

const threatColors: Record<ThreatType, { bg: string; text: string; border: string }> = {
  fire: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  human: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  animal: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
};

export default function ThreatHistory() {
  const { threats, getCurrentFarm } = useFarmStore();
  const farm = getCurrentFarm();

  const [selectedTypes, setSelectedTypes] = useState<ThreatType[]>([]);
  const [dateRange, setDateRange] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [selectedThreat, setSelectedThreat] = useState<ThreatDetection | null>(null);

  // Filter threats
  const filteredThreats = useMemo(() => {
    let filtered = [...threats];

    // Filter by type
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((t) => selectedTypes.includes(t.threatType));
    }

    // Filter by date range
    const now = Date.now();
    if (dateRange !== 'all') {
      const ranges = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[dateRange];
      filtered = filtered.filter(
        (t) => new Date(t.createdAt).getTime() > cutoff
      );
    }

    // Sort by date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return filtered;
  }, [threats, selectedTypes, dateRange]);

  const toggleType = (type: ThreatType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Threat History</h1>
          <p className="text-slate-500 mt-1">
            {filteredThreats.length} threats detected at {farm?.name || 'your farm'}
          </p>
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All time</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
            <Filter className="w-4 h-4" />
            Filter by type:
          </span>

          {(['fire', 'human', 'animal'] as ThreatType[]).map((type) => {
            const Icon = threatIcons[type];
            const isSelected = selectedTypes.includes(type);
            const colors = threatColors[type];

            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? `${colors.bg} ${colors.text} border ${colors.border}`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="capitalize">{type}</span>
              </button>
            );
          })}

          {selectedTypes.length > 0 && (
            <button
              onClick={() => setSelectedTypes([])}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Threat list */}
      {filteredThreats.length === 0 ? (
        <div className="card text-center py-12">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            No threats found
          </h3>
          <p className="text-slate-500">
            {selectedTypes.length > 0
              ? 'Try adjusting your filters'
              : 'Your farm has been secure during this period'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredThreats.map((threat, index) => (
            <motion.div
              key={threat.threatId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ThreatCard
                threat={threat}
                onClick={() => setSelectedThreat(threat)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Threat detail modal */}
      {selectedThreat && (
        <ThreatDetailModal
          threat={selectedThreat}
          onClose={() => setSelectedThreat(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ThreatCard({
  threat,
  onClick,
}: {
  threat: ThreatDetection;
  onClick: () => void;
}) {
  const Icon = threatIcons[threat.threatType];
  const colors = threatColors[threat.threatType];
  const date = new Date(threat.createdAt);

  return (
    <button
      onClick={onClick}
      className={`w-full card ${colors.bg} border-l-4 ${colors.border} hover:shadow-md transition-shadow text-left`}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}
        >
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold capitalize ${colors.text}`}>
              {threat.threatType} Detected
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
            >
              {threat.confidenceScore}%
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            {format(date, 'MMM d, yyyy')} at {format(date, 'h:mm a')}
          </p>
        </div>

        {/* Thumbnail */}
        <div className="hidden sm:flex w-16 h-16 bg-slate-200 rounded-lg items-center justify-center">
          <ImageIcon className="w-6 h-6 text-slate-400" />
        </div>

        <ChevronDown className="w-5 h-5 text-slate-400 rotate-[-90deg]" />
      </div>
    </button>
  );
}

function ThreatDetailModal({
  threat,
  onClose,
}: {
  threat: ThreatDetection;
  onClose: () => void;
}) {
  const Icon = threatIcons[threat.threatType];
  const colors = threatColors[threat.threatType];
  const date = new Date(threat.createdAt);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 capitalize">
                {threat.threatType} Detection
              </h2>
              <p className="text-sm text-slate-500">
                {format(date, 'MMMM d, yyyy')} at {format(date, 'h:mm:ss a')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snapshot */}
        <div className="aspect-video bg-slate-100 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">Snapshot not available in demo</p>
          </div>
        </div>

        {/* Details */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase">Confidence</p>
              <p className="text-lg font-semibold text-slate-900">
                {threat.confidenceScore}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Alert Status</p>
              <p className="text-lg font-semibold text-slate-900 capitalize">
                {threat.alertDeliveryStatus}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Camera</p>
              <p className="text-lg font-semibold text-slate-900">
                {threat.cameraId}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Processing Time</p>
              <p className="text-lg font-semibold text-slate-900">
                {threat.latencyMs}ms
              </p>
            </div>
          </div>

          {/* Analysis metadata */}
          {threat.analysisMetadata && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase mb-2">
                AI Analysis Details
              </p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-red-600 font-semibold">
                    {threat.analysisMetadata.allScores.fire}%
                  </p>
                  <p className="text-xs text-slate-500">Fire</p>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-orange-600 font-semibold">
                    {threat.analysisMetadata.allScores.human}%
                  </p>
                  <p className="text-xs text-slate-500">Human</p>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <p className="text-yellow-600 font-semibold">
                    {threat.analysisMetadata.allScores.animal}%
                  </p>
                  <p className="text-xs text-slate-500">Animal</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
