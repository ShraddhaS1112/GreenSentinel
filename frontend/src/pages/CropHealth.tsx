/**
 * Green Sentinel - Crop Health Page
 *
 * Displays NDVI-based crop health data with heatmaps and trends.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Leaf,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  MapPin,
  Info,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function CropHealth() {
  const { getCurrentFarm } = useFarmStore();
  const farm = getCurrentFarm();

  // Mock health data (in production, fetch from API)
  const healthData = useMemo(() => {
    // Generate mock 30-day health score data
    const data = [];
    const today = new Date();
    let score = 70;

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Add some variation
      score += (Math.random() - 0.45) * 5;
      score = Math.max(40, Math.min(95, score));

      data.push({
        date: date.toISOString().split('T')[0],
        score: Math.round(score),
        ndvi: (score / 50 - 1).toFixed(2),
      });
    }

    return data;
  }, []);

  const currentScore = healthData[healthData.length - 1]?.score || 0;
  const previousScore = healthData[healthData.length - 8]?.score || currentScore;
  const trend =
    currentScore > previousScore + 3
      ? 'improving'
      : currentScore < previousScore - 3
      ? 'declining'
      : 'stable';

  // Chart configuration
  const chartData = {
    labels: healthData.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }),
    datasets: [
      {
        label: 'Health Score',
        data: healthData.map((d) => d.score),
        fill: true,
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#16a34a',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 7,
          color: '#94a3b8',
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: '#f1f5f9',
        },
        ticks: {
          color: '#94a3b8',
          stepSize: 25,
        },
      },
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-lime-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreCategory = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-100 text-green-700' };
    if (score >= 60) return { label: 'Good', color: 'bg-lime-100 text-lime-700' };
    if (score >= 40) return { label: 'Moderate', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Poor', color: 'bg-red-100 text-red-700' };
  };

  const category = getScoreCategory(currentScore);

  if (!farm) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <Leaf className="empty-state-icon" />
          <h2 className="empty-state-title">No Farm Selected</h2>
          <p className="empty-state-description">
            Please select a farm to view crop health data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Crop Health</h1>
        <p className="text-slate-500 mt-1 flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {farm.name} • {farm.cropType}
        </p>
      </div>

      {/* Current Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Current Health Score</p>
            <div className="flex items-end gap-3">
              <span className={`text-5xl font-bold ${getScoreColor(currentScore)}`}>
                {currentScore}
              </span>
              <span className="text-slate-400 text-lg mb-2">/100</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                {category.label}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3">
              {trend === 'improving' ? (
                <>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-medium">
                    +{currentScore - previousScore} points this week
                  </span>
                </>
              ) : trend === 'declining' ? (
                <>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <span className="text-red-600 font-medium">
                    {currentScore - previousScore} points this week
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-500 font-medium">Stable this week</span>
                </>
              )}
            </div>
          </div>

          {/* Score gauge visualization */}
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={currentScore >= 60 ? '#22c55e' : currentScore >= 40 ? '#eab308' : '#ef4444'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${currentScore * 2.51} 251`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Leaf className={`w-6 h-6 ${getScoreColor(currentScore)}`} />
              <span className="text-xs text-slate-500 mt-1">NDVI</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Health Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header mb-0 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            30-Day Health Trend
          </h2>
        </div>

        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      </motion.div>

      {/* NDVI Heatmap placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card mb-6"
      >
        <h2 className="section-header flex items-center gap-2">
          <MapPin className="w-5 h-5 text-slate-400" />
          NDVI Heatmap
        </h2>

        <div className="aspect-video bg-gradient-to-br from-red-200 via-yellow-200 to-green-300 rounded-lg flex items-center justify-center relative overflow-hidden">
          {/* Mock heatmap visualization */}
          <div className="absolute inset-0 opacity-50">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${20 + Math.random() * 60}px`,
                  height: `${20 + Math.random() * 60}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ['#22c55e', '#84cc16', '#eab308', '#f97316'][
                    Math.floor(Math.random() * 4)
                  ],
                  opacity: 0.3 + Math.random() * 0.5,
                }}
              />
            ))}
          </div>

          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-slate-600 z-10">
            Satellite imagery updated daily
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-400" />
            <span className="text-sm text-slate-600">Poor (&lt;0.3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-400" />
            <span className="text-sm text-slate-600">Moderate (0.3-0.6)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-400" />
            <span className="text-sm text-slate-600">Excellent (&gt;0.6)</span>
          </div>
        </div>
      </motion.div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card bg-blue-50 border border-blue-200"
      >
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">About NDVI Health Score</h3>
            <p className="text-sm text-blue-700 mt-1">
              The health score is calculated from Normalized Difference Vegetation Index
              (NDVI) satellite data. NDVI measures vegetation health using near-infrared
              and visible light reflectance. Scores above 60 indicate healthy crops,
              while scores below 40 may require intervention.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
