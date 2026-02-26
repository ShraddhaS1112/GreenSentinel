import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

interface Threat {
  id: string;
  type: 'fire' | 'human' | 'animal';
  timestamp: string;
  confidence: number;
  camera: string;
}

export const ThreatHistory: React.FC = () => {
  const { selectedFarm } = useOutletContext<{ selectedFarm: string }>();
  const [threats, setThreats] = useState<Threat[]>([]);

  // Listen for threats from localStorage (shared state)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedThreats = localStorage.getItem('threats');
      if (storedThreats) {
        setThreats(JSON.parse(storedThreats));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    handleStorageChange();

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  const getThreatLabel = (type: string) => {
    switch (type) {
      case 'fire':
        return 'आग';
      case 'human':
        return 'चोर';
      case 'animal':
        return 'जानवर';
      default:
        return 'अज्ञात';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-bold text-amber-900 mb-2"
          style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
        >
          📋 अलर्ट इतिहास
        </h1>
        <p className="text-gray-600">सर्व धोके आणि अलर्ट्स</p>
      </div>

      {/* Threats Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {threats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-100 to-amber-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">
                    प्रकार
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">
                    वेळ
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">
                    कैमरा
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">
                    विश्वास
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">
                    स्थिति
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {threats.map((threat) => (
                  <tr
                    key={threat.id}
                    className="hover:bg-amber-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getThreatIcon(threat.type)}</span>
                        <span
                          className="font-semibold text-amber-900"
                          style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
                        >
                          {getThreatLabel(threat.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{threat.timestamp}</td>
                    <td className="px-6 py-4 text-gray-700">{threat.camera}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              threat.confidence >= 80
                                ? 'bg-red-500'
                                : threat.confidence >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${threat.confidence}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-700 w-12">
                          {threat.confidence}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                        सक्रिय
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-2xl text-green-600 font-semibold mb-2">✅ सर्व सुरक्षित!</p>
            <p
              className="text-gray-600"
              style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
            >
              अद्याप कोणताही धोका आढळला नाही
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      {threats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-red-500">
            <p className="text-gray-600 text-sm font-medium">एकूण धोके</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{threats.length}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-medium">सर्वोच्च विश्वास</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {Math.max(...threats.map((t) => t.confidence))}%
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-medium">सर्वात सामान्य</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {threats.reduce(
                (acc, t) => {
                  acc[t.type] = (acc[t.type] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              )[
                Object.entries(
                  threats.reduce(
                    (acc, t) => {
                      acc[t.type] = (acc[t.type] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  )
                ).sort(([, a], [, b]) => b - a)[0]?.[0]
              ] || 0}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
