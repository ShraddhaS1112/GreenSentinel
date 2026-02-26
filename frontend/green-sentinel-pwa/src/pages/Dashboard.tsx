import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ThreatAlertDialog } from '../components/ThreatAlertDialog';
import { initialFarmData, initialThreats, generateAutoThreat, getThreatCountLabel } from '../utils/mockData';

interface FarmData {
  id: string;
  name: string;
  location: string;
  activeThreatCount: number;
  cropHealthScore: number;
  activeCameras: number;
  lastUpdate: string;
  threatType?: 'fire' | 'human' | 'animal' | null;
}

interface Threat {
  id: string;
  type: 'fire' | 'human' | 'animal';
  timestamp: string;
  confidence: number;
  camera: string;
}

export const Dashboard: React.FC = () => {
  const { selectedFarm } = useOutletContext<{ selectedFarm: string }>();
  const [pulseAlert, setPulseAlert] = useState(false);
  const [farmData, setFarmData] = useState<Record<string, FarmData>>(initialFarmData);
  const [recentThreats, setRecentThreats] = useState<Threat[]>(initialThreats);
  const [lastThreatTime, setLastThreatTime] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentThreatConfidence, setCurrentThreatConfidence] = useState(85);

  // Auto-threat generator for Mango farm (farm-2) every 30 seconds
  useEffect(() => {
    const threatInterval = setInterval(() => {
      const newThreat = generateAutoThreat();
      setRecentThreats((prev) => {
        const updated = [newThreat, ...prev.slice(0, 9)];
        localStorage.setItem('threats', JSON.stringify(updated));
        return updated;
      });
      setLastThreatTime(newThreat.timestamp);
      setCurrentThreatConfidence(newThreat.confidence);

      // Update farm-2 threat count
      setFarmData((prev) => ({
        ...prev,
        'farm-2': {
          ...prev['farm-2'],
          activeThreatCount: prev['farm-2'].activeThreatCount + 1,
          threatType: newThreat.type,
          lastUpdate: newThreat.timestamp,
        },
      }));

      // Open dialog
      setDialogOpen(true);
    }, 30000); // 30 seconds

    return () => clearInterval(threatInterval);
  }, []);

  // Pulse animation for threats
  useEffect(() => {
    const currentFarm = farmData[selectedFarm] || farmData['farm-1'];
    if (currentFarm.activeThreatCount > 0) {
      const interval = setInterval(() => {
        setPulseAlert((prev) => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [farmData, selectedFarm]);

  const currentFarm = farmData[selectedFarm] || farmData['farm-1'];

  const getThreatIcon = (type: string) => {
    switch (type) {
      case 'fire':
        return '🔥';
      case 'human':
        return '👤';
      case 'animal':
        return '🦁';
      default:
        return '⚠️';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 75) return '#10B981'; // Green
    if (score >= 50) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getHealthColorClass = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getThreatLabel = (type: string | null | undefined) => {
    switch (type) {
      case 'fire':
        return 'आग';
      case 'human':
        return 'चोर';
      case 'animal':
        return 'जानवर';
      default:
        return 'कोणताही धोका नाही';
    }
  };

  const handleAcknowledge = () => {
    // Reset threat count for current farm
    setFarmData((prev) => ({
      ...prev,
      [selectedFarm]: {
        ...prev[selectedFarm],
        activeThreatCount: 0,
        threatType: null,
      },
    }));
  };

  const handlePanic = () => {
    // In a real app, this would trigger emergency services
    alert('आणीबाणी सेवा सक्रिय केली गई! (Emergency services activated!)');
  };

  return (
    <div
      className={`min-h-screen transition-all duration-500 ${
        currentFarm.activeThreatCount > 0 && pulseAlert
          ? 'bg-red-50'
          : 'bg-amber-50'
      }`}
      style={{
        backgroundImage: `
          repeating-linear-gradient(
            45deg,
            transparent,
            transparent 35px,
            rgba(0,0,0,.02) 35px,
            rgba(0,0,0,.02) 70px
          )
        `,
        backgroundColor: currentFarm.activeThreatCount > 0 && pulseAlert ? '#fef2f2' : '#fffbf0',
      }}
    >
      {/* Threat Alert Dialog */}
      <ThreatAlertDialog
        open={dialogOpen}
        threatCount={currentFarm.activeThreatCount}
        farmName={currentFarm.name}
        threatType={currentFarm.threatType}
        timestamp={lastThreatTime || currentFarm.lastUpdate}
        confidence={currentThreatConfidence}
        language={currentFarm.language as 'hi' | 'mr' | 'en'}
        phoneNumber={currentFarm.phoneNumber}
        onClose={() => setDialogOpen(false)}
        onAcknowledge={handleAcknowledge}
      />
      {/* Header with Greeting */}
      <div className="px-6 py-8 text-center">
        <h1 className="text-4xl font-bold text-amber-900 mb-2" style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}>
          नमस्कार 🙏
        </h1>
        <p className="text-xl text-amber-800" style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}>
          आपल्या शेतांचा स्वागत आहे
        </p>
      </div>

      {/* Status Summary */}
      <div className="px-6 py-4 text-center">
        <div className="inline-block bg-white rounded-full px-6 py-3 shadow-md">
          <p className="text-lg font-semibold text-gray-800">
            <span className="text-green-600">🟢 2 खेत सुरक्षित</span>
            {currentFarm.activeThreatCount > 0 && (
              <span className="ml-4 text-red-600">🔴 1 धोक्यात</span>
            )}
          </p>
        </div>
      </div>

      {/* Farm Cards Grid */}
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.values(farmData).map((farm) => (
            <div
              key={farm.id}
              className={`relative transform transition-all duration-300 hover:scale-105 ${
                farm.id === selectedFarm ? 'ring-4 ring-green-500' : ''
              }`}
            >
              {/* Card with torn paper effect */}
              <div
                className="bg-white rounded-lg shadow-2xl overflow-hidden"
                style={{
                  borderRadius: '8px 8px 12px 8px',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                  border: farm.activeThreatCount > 0 ? '3px solid #EF4444' : '2px solid #10B981',
                  position: 'relative',
                }}
              >
                {/* Threat Alert Pulse */}
                {farm.activeThreatCount > 0 && (
                  <div
                    className="absolute inset-0 bg-red-500 opacity-0 animate-pulse"
                    style={{
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                )}

                {/* Card Content */}
                <div className="p-6 relative z-10">
                  {/* Farm Name */}
                  <h2
                    className="text-2xl font-bold text-amber-900 mb-1"
                    style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
                  >
                    {farm.name}
                  </h2>

                  {/* Location */}
                  <p
                    className="text-sm text-amber-700 mb-4"
                    style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
                  >
                    📍 {farm.location}
                  </p>

                  {/* Divider */}
                  <div className="border-t-2 border-amber-200 my-4" />

                  {/* Health Score with Thermometer */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <p
                        className="text-sm font-semibold text-amber-900"
                        style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
                      >
                        📊 सेहत:
                      </p>
                      <p className={`text-lg font-bold ${getHealthColorClass(farm.cropHealthScore)}`}>
                        {farm.cropHealthScore}%
                      </p>
                    </div>

                    {/* Thermometer Bar */}
                    <div
                      className="relative h-8 bg-gray-200 rounded-full overflow-hidden shadow-inner"
                      style={{ backgroundColor: '#e5e7eb' }}
                    >
                      {/* Liquid Fill */}
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-in-out flex items-center justify-end pr-2"
                        style={{
                          width: `${farm.cropHealthScore}%`,
                          backgroundColor: getHealthColor(farm.cropHealthScore),
                          background: `linear-gradient(90deg, ${getHealthColor(farm.cropHealthScore)}, ${getHealthColor(farm.cropHealthScore)}cc)`,
                        }}
                      >
                        {/* Shine Effect */}
                        <div
                          className="absolute inset-0 opacity-30"
                          style={{
                            background: 'linear-gradient(90deg, transparent, white, transparent)',
                            animation: 'shimmer 2s infinite',
                          }}
                        />
                      </div>

                      {/* Percentage Text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-800">
                          {farm.cropHealthScore}%
                        </span>
                      </div>
                    </div>

                    {/* Update Time */}
                    <p
                      className="text-xs text-amber-600 mt-2"
                      style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
                    >
                      📅 {farm.lastUpdate}
                    </p>
                  </div>

                  {/* Threat Status */}
                  <div className="mb-6 p-4 rounded-lg bg-amber-50 border-2 border-amber-200">
                    <p
                      className={`text-center font-bold text-lg ${
                        farm.activeThreatCount > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                      style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
                    >
                      {farm.activeThreatCount > 0
                        ? `🚨 ${getThreatLabel(farm.threatType)}`
                        : '✅ सुरक्षित'}
                    </p>
                    {farm.activeThreatCount > 0 && (
                      <p
                        className="text-xs text-red-600 text-center mt-1"
                        style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
                      >
                        तातडीने कारवाई करा!
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-1"
                      style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
                    >
                      📞 कॉल
                    </button>
                    <button
                      className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-1"
                      style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
                    >
                      👁️ पहा
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Board - Show when threats exist */}
      {currentFarm.activeThreatCount > 0 && (
        <div className="px-6 py-8 max-w-2xl mx-auto">
          <div
            className="bg-red-600 text-white rounded-lg p-8 shadow-2xl animate-pulse"
            style={{
              border: '4px solid #991b1b',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
            }}
          >
            <h3
              className="text-3xl font-bold text-center mb-4"
              style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
            >
              🚨 आणीबाणी! 🚨
            </h3>
            <p
              className="text-center text-lg font-semibold"
              style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
            >
              {getThreatLabel(currentFarm.threatType)} आपल्या शेतात दिसला!
            </p>
            <p
              className="text-center text-sm mt-2"
              style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
            >
              तातडीने कारवाई करा - {currentFarm.lastUpdate}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                className="px-6 py-3 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition font-bold shadow-lg"
                style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
              >
                ✅ मी बघतोय
              </button>
              <button
                className="px-6 py-3 bg-yellow-400 text-red-900 rounded-lg hover:bg-yellow-300 transition font-bold shadow-lg"
                style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
              >
                🚨 आणीबाणी
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Threats Section */}
      {recentThreats.length > 0 && (
        <div className="px-6 py-8 max-w-4xl mx-auto">
          <h2
            className="text-2xl font-bold text-amber-900 mb-6"
            style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
          >
            📋 अलर्ट इतिहास
          </h2>
          <div className="space-y-4">
            {recentThreats.map((threat) => (
              <div
                key={threat.id}
                className="bg-white rounded-lg p-4 shadow-md border-l-4 border-amber-500 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{getThreatIcon(threat.type)}</span>
                    <div>
                      <p
                        className="font-semibold text-amber-900"
                        style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
                      >
                        {threat.type === 'fire' ? 'आग' : threat.type === 'human' ? 'चोर' : 'जानवर'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {threat.camera} • {threat.timestamp}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-red-600">{threat.confidence}%</p>
                    <p className="text-xs text-gray-500">विश्वास</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-8 text-center text-amber-700">
        <p style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}>
          🌾 Green-Sentinel - आपल्या शेतांचा संरक्षक 🌾
        </p>
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 0.1;
          }
        }
      `}</style>
    </div>
  );
};
