/**
 * Green Sentinel - Live Camera Component
 *
 * AI-powered live threat monitoring with:
 * - WebRTC live feed with edge-based motion detection
 * - Automatic AI threat analysis on motion events (Bedrock Claude Vision)
 * - Detects fire, human intrusion, and animal threats in real time
 * - 30-second cooldown to prevent excessive API calls
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CameraOff,
  Scan,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Activity,
  ZapOff,
  Flame,
  User,
  Dog,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '@/services/apiService';

interface LiveCameraProps {
  farmId: string;
  onThreatDetected?: (threat: api.ThreatAnalysis) => void;
}

// Rate limiting: minimum seconds between AI analyses
const MIN_ANALYSIS_INTERVAL = 30;

export default function LiveCamera({ farmId, onThreatDetected }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastFrameRef = useRef<ImageData | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<api.ThreatAnalysis | null>(null);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);

  // Start camera stream
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        toast.success('Camera started — AI monitoring active');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      setError(message);
      toast.error(message);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      setMotionDetected(false);
    }
  };

  // Capture current frame as base64 JPEG
  const captureFrameBase64 = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
    // Strip the data:image/jpeg;base64, prefix
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1];
  }, []);

  // AI threat analysis
  const analyzeForThreats = useCallback(async () => {
    if (!isStreaming || isAnalyzing) return;

    const now = Date.now();
    const elapsed = (now - lastAnalysisTime) / 1000;
    if (elapsed < MIN_ANALYSIS_INTERVAL) {
      setCooldownRemaining(Math.ceil(MIN_ANALYSIS_INTERVAL - elapsed));
      return;
    }

    const imageData = captureFrameBase64();
    if (!imageData) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await api.analyzeThreat(farmId, imageData);
      if (response.data?.analysis) {
        const analysis = response.data.analysis;
        setLastAnalysis(analysis);
        setAnalyzedAt(response.data.analyzedAt);
        setLastAnalysisTime(now);
        setCooldownRemaining(MIN_ANALYSIS_INTERVAL);

        const isThreat = analysis.overallThreat !== 'none' && analysis.overallThreat !== 'low';
        if (isThreat) {
          toast.error(`⚠️ ${analysis.overallThreat.toUpperCase()} threat detected!`, { duration: 6000 });
          onThreatDetected?.(analysis);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [farmId, isStreaming, isAnalyzing, lastAnalysisTime, captureFrameBase64, onThreatDetected]);

  // Client-side motion detection — edge processing for low latency
  useEffect(() => {
    if (!isStreaming || !motionEnabled) return;

    const detectMotion = () => {
      const video = videoRef.current;
      const canvas = motionCanvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 160;
      canvas.height = 120;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (lastFrameRef.current) {
        let diffCount = 0;
        const threshold = 30;
        const data1 = lastFrameRef.current.data;
        const data2 = currentFrame.data;

        for (let i = 0; i < data1.length; i += 4) {
          const diff =
            Math.abs(data1[i] - data2[i]) +
            Math.abs(data1[i + 1] - data2[i + 1]) +
            Math.abs(data1[i + 2] - data2[i + 2]);
          if (diff > threshold * 3) diffCount++;
        }

        const motionPercent = (diffCount / (data1.length / 4)) * 100;
        const hasMotion = motionPercent > 2;
        setMotionDetected(hasMotion);

        // Auto-trigger AI analysis on motion (with rate limiting)
        if (hasMotion) {
          analyzeForThreats();
        }
      }

      lastFrameRef.current = currentFrame;
    };

    const interval = setInterval(detectMotion, 200); // 5 FPS
    return () => clearInterval(interval);
  }, [isStreaming, motionEnabled, analyzeForThreats]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  const threatLevelColor = {
    none: 'bg-green-100 text-green-700',
    low: 'bg-yellow-100 text-yellow-700',
    medium: 'bg-orange-100 text-orange-700',
    high: 'bg-red-100 text-red-700',
    critical: 'bg-red-600 text-white',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-slate-900">Live Camera</h3>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              AI Monitoring
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMotionEnabled(!motionEnabled)}
            className={`p-2 rounded-lg transition-colors ${motionEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}
            title={motionEnabled ? 'Motion detection ON' : 'Motion detection OFF'}
          >
            {motionEnabled ? <Activity className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          </button>
          <button
            onClick={isStreaming ? stopCamera : startCamera}
            className={`px-3 py-2 rounded-lg font-medium transition-colors ${isStreaming ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
          >
            {isStreaming ? (
              <><CameraOff className="w-4 h-4 inline mr-1" />Stop</>
            ) : (
              <><Camera className="w-4 h-4 inline mr-1" />Start</>
            )}
          </button>
        </div>
      </div>

      {/* Video Feed */}
      <div className="relative bg-slate-900 aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={motionCanvasRef} className="hidden" />

        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <div className="text-center text-slate-400">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Camera not started</p>
              <p className="text-sm opacity-70">Start to enable AI threat monitoring</p>
            </div>
          </div>
        )}

        {isStreaming && motionEnabled && motionDetected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-3 left-3 px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded flex items-center gap-1 shadow"
          >
            <Activity className="w-3.5 h-3.5" />
            Motion — Analyzing...
          </motion.div>
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm font-medium">AI scanning for threats...</p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Scan Button */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={analyzeForThreats}
          disabled={!isStreaming || isAnalyzing || cooldownRemaining > 0}
          className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            !isStreaming || isAnalyzing || cooldownRemaining > 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isAnalyzing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Scan className="w-5 h-5" />
          )}
          {cooldownRemaining > 0
            ? `Next scan in ${cooldownRemaining}s`
            : isAnalyzing
            ? 'Scanning...'
            : 'Manual Threat Scan'}
        </button>
        <p className="text-xs text-slate-500 mt-2 text-center">
          AI analyzes for fire, human intrusion &amp; animal threats
        </p>
      </div>

      {/* Threat Analysis Results */}
      <AnimatePresence>
        {lastAnalysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-200 overflow-hidden"
          >
            <div className="p-4">
              {/* Overall Threat Level */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">AI Threat Assessment</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${threatLevelColor[lastAnalysis.overallThreat] || 'bg-slate-100 text-slate-600'}`}>
                  {lastAnalysis.overallThreat === 'none' ? '✓ Clear' : `⚠ ${lastAnalysis.overallThreat}`}
                </span>
              </div>

              {/* Individual Detections */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {/* Fire */}
                <div className={`p-2.5 rounded-lg text-center ${lastAnalysis.fire.detected ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
                  <Flame className={`w-5 h-5 mx-auto mb-1 ${lastAnalysis.fire.detected ? 'text-red-500' : 'text-slate-300'}`} />
                  <p className={`text-xs font-medium ${lastAnalysis.fire.detected ? 'text-red-700' : 'text-slate-400'}`}>Fire</p>
                  <p className={`text-xs ${lastAnalysis.fire.detected ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                    {lastAnalysis.fire.detected ? `${lastAnalysis.fire.confidence}%` : 'None'}
                  </p>
                </div>

                {/* Human */}
                <div className={`p-2.5 rounded-lg text-center ${lastAnalysis.human.detected && lastAnalysis.human.suspicious ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'}`}>
                  <User className={`w-5 h-5 mx-auto mb-1 ${lastAnalysis.human.detected && lastAnalysis.human.suspicious ? 'text-orange-500' : 'text-slate-300'}`} />
                  <p className={`text-xs font-medium ${lastAnalysis.human.detected && lastAnalysis.human.suspicious ? 'text-orange-700' : 'text-slate-400'}`}>Intruder</p>
                  <p className={`text-xs ${lastAnalysis.human.detected && lastAnalysis.human.suspicious ? 'text-orange-600 font-bold' : 'text-slate-400'}`}>
                    {lastAnalysis.human.detected && lastAnalysis.human.suspicious ? `${lastAnalysis.human.confidence}%` : 'None'}
                  </p>
                </div>

                {/* Animal */}
                <div className={`p-2.5 rounded-lg text-center ${lastAnalysis.animal.detected ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                  <Dog className={`w-5 h-5 mx-auto mb-1 ${lastAnalysis.animal.detected ? 'text-amber-500' : 'text-slate-300'}`} />
                  <p className={`text-xs font-medium ${lastAnalysis.animal.detected ? 'text-amber-700' : 'text-slate-400'}`}>Animal</p>
                  <p className={`text-xs ${lastAnalysis.animal.detected ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                    {lastAnalysis.animal.detected
                      ? lastAnalysis.animal.species.length > 0
                        ? lastAnalysis.animal.species[0]
                        : `${lastAnalysis.animal.confidence}%`
                      : 'None'}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {lastAnalysis.recommendations.length > 0 && lastAnalysis.overallThreat !== 'none' && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                    Recommended Actions
                  </p>
                  {lastAnalysis.recommendations.slice(0, 3).map((rec, i) => (
                    <p key={i} className="text-xs text-slate-600 mt-1">• {rec}</p>
                  ))}
                </div>
              )}

              {lastAnalysis.overallThreat === 'none' && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs font-medium">No threats detected. Farm is secure.</p>
                </div>
              )}

              {analyzedAt && (
                <p className="text-xs text-slate-400 mt-2 text-right">
                  Scanned {new Date(analyzedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No analysis yet */}
      {!lastAnalysis && isStreaming && (
        <div className="p-4 border-t border-slate-200 flex items-center gap-2 text-slate-500">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-xs">Watching for motion — AI will analyze automatically</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
