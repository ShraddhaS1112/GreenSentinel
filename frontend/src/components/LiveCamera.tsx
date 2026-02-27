/**
 * Green Sentinel - Live Camera Component
 *
 * Cost-optimized browser-based camera with:
 * - WebRTC for live feed (no server cost)
 * - Client-side motion detection (no server cost)
 * - Manual capture & AI analysis (pay per use)
 * - Rate limiting to prevent accidental overuse
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  CameraOff,
  Scan,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Activity,
  ZapOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '@/services/apiService';

interface LiveCameraProps {
  farmId: string;
  onThreatDetected?: (threat: ThreatResult) => void;
}

interface ThreatResult {
  detected: boolean;
  threats: Array<{
    type: string;
    confidence: number;
    description: string;
  }>;
  recommendations: string[];
  analyzedAt: string;
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
  const [lastAnalysis, setLastAnalysis] = useState<ThreatResult | null>(null);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [motionEnabled, setMotionEnabled] = useState(true);

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
        toast.success('Camera started');
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

  // Client-side motion detection (FREE - runs in browser)
  useEffect(() => {
    if (!isStreaming || !motionEnabled) return;

    const detectMotion = () => {
      const video = videoRef.current;
      const canvas = motionCanvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 160; // Low res for performance
      canvas.height = 120;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (lastFrameRef.current) {
        let diffCount = 0;
        const threshold = 30;
        const data1 = lastFrameRef.current.data;
        const data2 = currentFrame.data;

        for (let i = 0; i < data1.length; i += 4) {
          const diff = Math.abs(data1[i] - data2[i]) +
                       Math.abs(data1[i + 1] - data2[i + 1]) +
                       Math.abs(data1[i + 2] - data2[i + 2]);
          if (diff > threshold * 3) diffCount++;
        }

        const motionPercent = (diffCount / (data1.length / 4)) * 100;
        setMotionDetected(motionPercent > 2); // 2% threshold
      }

      lastFrameRef.current = currentFrame;
    };

    const interval = setInterval(detectMotion, 200); // 5 FPS for motion detection
    return () => clearInterval(interval);
  }, [isStreaming, motionEnabled]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  // Capture frame and analyze with AI
  const captureAndAnalyze = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isStreaming) return;

    // Rate limiting check
    const now = Date.now();
    const elapsed = (now - lastAnalysisTime) / 1000;
    if (elapsed < MIN_ANALYSIS_INTERVAL) {
      const remaining = Math.ceil(MIN_ANALYSIS_INTERVAL - elapsed);
      toast.error(`Please wait ${remaining}s before next analysis`);
      setCooldownRemaining(remaining);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Capture frame
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to capture')), 'image/jpeg', 0.8);
      });

      // Get upload URL
      const uploadResponse = await api.getDiseaseScanUploadUrl(farmId);
      if (!uploadResponse.data?.uploadUrl) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, scanId, key } = uploadResponse.data;

      // Upload image
      await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      // Analyze with AI
      const analysisResponse = await api.analyzeDiseaseScan(
        farmId,
        scanId,
        key,
        'Field camera capture'
      );

      if (analysisResponse.data?.analysis) {
        const analysis = analysisResponse.data.analysis;
        const result: ThreatResult = {
          detected: analysis.detected || analysis.severity === 'critical',
          threats: analysis.disease ? [{
            type: analysis.disease,
            confidence: analysis.confidence,
            description: analysis.summary || '',
          }] : [],
          recommendations: analysis.treatment || [],
          analyzedAt: new Date().toISOString(),
        };

        setLastAnalysis(result);
        setLastAnalysisTime(now);
        setCooldownRemaining(MIN_ANALYSIS_INTERVAL);

        if (result.detected) {
          toast.error('Potential threat detected!', { duration: 5000 });
          onThreatDetected?.(result);
        } else {
          toast.success('No threats detected');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [farmId, isStreaming, lastAnalysisTime, onThreatDetected]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-slate-900">Live Camera</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Motion Detection Toggle */}
          <button
            onClick={() => setMotionEnabled(!motionEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              motionEnabled
                ? 'bg-green-100 text-green-600'
                : 'bg-slate-100 text-slate-400'
            }`}
            title={motionEnabled ? 'Motion detection ON' : 'Motion detection OFF'}
          >
            {motionEnabled ? <Activity className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={isStreaming ? stopCamera : startCamera}
            className={`px-3 py-2 rounded-lg font-medium transition-colors ${
              isStreaming
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            {isStreaming ? (
              <>
                <CameraOff className="w-4 h-4 inline mr-1" />
                Stop
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 inline mr-1" />
                Start
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video Feed */}
      <div className="relative bg-slate-900 aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Hidden canvases for processing */}
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={motionCanvasRef} className="hidden" />

        {/* Overlay when not streaming */}
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <div className="text-center text-slate-400">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Camera not started</p>
              <p className="text-sm">Click Start to enable</p>
            </div>
          </div>
        )}

        {/* Motion Indicator */}
        {isStreaming && motionEnabled && motionDetected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-3 left-3 px-2 py-1 bg-yellow-500 text-white text-sm font-medium rounded flex items-center gap-1"
          >
            <Activity className="w-4 h-4" />
            Motion Detected
          </motion.div>
        )}

        {/* Analyzing Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Analyzing for threats...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={captureAndAnalyze}
            disabled={!isStreaming || isAnalyzing || cooldownRemaining > 0}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              !isStreaming || isAnalyzing || cooldownRemaining > 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isAnalyzing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Scan className="w-5 h-5" />
            )}
            {cooldownRemaining > 0
              ? `Wait ${cooldownRemaining}s`
              : isAnalyzing
              ? 'Analyzing...'
              : 'Capture & Analyze'}
          </button>
        </div>

        {/* Cost Info */}
        <p className="text-xs text-slate-500 mt-2 text-center">
          ~$0.003 per analysis • Rate limited to prevent overuse
        </p>
      </div>

      {/* Last Analysis Result */}
      {lastAnalysis && (
        <div className={`p-4 border-t ${
          lastAnalysis.detected ? 'bg-red-50' : 'bg-green-50'
        }`}>
          <div className="flex items-start gap-3">
            {lastAnalysis.detected ? (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className={`font-medium ${
                lastAnalysis.detected ? 'text-red-900' : 'text-green-900'
              }`}>
                {lastAnalysis.detected ? 'Threats Detected' : 'All Clear'}
              </h4>

              {lastAnalysis.threats.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {lastAnalysis.threats.map((threat, i) => (
                    <li key={i} className="text-sm text-red-700">
                      • {threat.type} ({Math.round(threat.confidence * 100)}% confidence)
                    </li>
                  ))}
                </ul>
              )}

              {lastAnalysis.recommendations.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-slate-700">Recommendations:</p>
                  <ul className="mt-1 space-y-1">
                    {lastAnalysis.recommendations.slice(0, 3).map((rec, i) => (
                      <li key={i} className="text-sm text-slate-600">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-2">
                Analyzed at {new Date(lastAnalysis.analyzedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
