import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { getThreatCountLabel } from '../utils/mockData';
import { sendLocalizedAlert } from '../services/twilioService';

interface EmergencyBoardProps {
  threatCount: number;
  farmName: string;
  lastThreatTime: string;
  threatType?: 'fire' | 'human' | 'animal' | null;
  language?: 'hi' | 'mr' | 'en';
  onAcknowledge: () => void;
  onPanic: () => void;
}

export const EmergencyBoard: React.FC<EmergencyBoardProps> = ({
  threatCount,
  farmName,
  lastThreatTime,
  threatType,
  language = 'mr',
  onAcknowledge,
  onPanic,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  // Send WhatsApp alert when threat is detected
  useEffect(() => {
    if (threatCount > 0 && !alertSent && threatType) {
      sendAlert();
    }
  }, [threatCount, alertSent, threatType]);

  const sendAlert = async () => {
    try {
      await sendLocalizedAlert(
        {
          farmName,
          threatType: threatType || 'human',
          timestamp: lastThreatTime,
          confidence: 85 + Math.random() * 15, // 85-100%
        },
        language as 'hi' | 'mr' | 'en'
      );
      setAlertSent(true);
      console.log('WhatsApp alert sent successfully');
    } catch (error) {
      console.error('Failed to send WhatsApp alert:', error);
      // Continue even if alert fails
    }
  };

  const handleAcknowledge = () => {
    setAcknowledged(true);
    onAcknowledge();
    setTimeout(() => {
      setAcknowledged(false);
      setAlertSent(false);
    }, 2000);
  };

  if (threatCount === 0) return null;

  // Create portal for true modal behavior
  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-md"
        onClick={handleAcknowledge}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white rounded-3xl p-8 shadow-2xl border-4 border-red-400"
          style={{
            animation: 'pulse-modal 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            boxShadow:
              '0 0 80px rgba(239, 68, 68, 1), 0 0 40px rgba(239, 68, 68, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.15)',
          }}
        >
          {/* Alert Header */}
          <div className="text-center mb-8">
            <h3
              className="text-5xl font-black mb-4 animate-bounce"
              style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
            >
              🚨 आणीबाणी! 🚨
            </h3>
            <p
              className="text-3xl font-bold text-red-100"
              style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
            >
              {farmName}
            </p>
          </div>

          {/* Threat Details Box */}
          <div className="bg-red-900/70 rounded-2xl p-6 mb-8 text-center border-3 border-red-300/60 backdrop-blur-sm">
            <p
              className="text-4xl font-black mb-3"
              style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
            >
              {getThreatCountLabel(threatCount)}
            </p>
            <p className="text-lg text-red-100 font-semibold">{lastThreatTime}</p>
            <p
              className="text-sm text-red-200 mt-2"
              style={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}
            >
              तातडीने कारवाई करा!
            </p>
          </div>

          {/* WhatsApp Alert Status */}
          {alertSent && (
            <div className="bg-green-500/30 rounded-lg p-3 mb-6 border border-green-300/50 text-center">
              <p className="text-sm text-green-100">
                ✅ व्हाट्सअँप अलर्ट पाठवला गेला
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleAcknowledge}
              className={`px-6 py-4 rounded-xl font-black text-lg transition-all transform hover:scale-110 active:scale-95 ${
                acknowledged
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-white text-red-600 hover:bg-gray-100 shadow-xl'
              }`}
              style={{
                fontFamily: 'Noto Sans Devanagari, sans-serif',
                minHeight: '72px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {acknowledged ? '✅ ठीक आहे' : '✅ मी बघतोय'}
            </button>
            <button
              onClick={onPanic}
              className="px-6 py-4 bg-yellow-400 text-red-900 rounded-xl hover:bg-yellow-300 transition-all transform hover:scale-110 active:scale-95 font-black text-lg shadow-xl"
              style={{
                fontFamily: 'Noto Sans Devanagari, sans-serif',
                minHeight: '72px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              🚨 आणीबाणी
            </button>
          </div>

          {/* Animations */}
          <style>{`
            @keyframes pulse-modal {
              0%, 100% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.95;
                transform: scale(1.05);
              }
            }
          `}</style>
        </div>
      </div>
    </>
  );

  // Render using React Portal for true modal behavior
  return ReactDOM.createPortal(modalContent, document.body);
};
