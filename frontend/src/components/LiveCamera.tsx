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
  MonitorPlay,
  ChevronDown,
  WifiOff,
  Bot,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '@/services/apiService';
import { useFarmStore } from '@/stores/farmStore';

interface LiveCameraProps {
  farmId: string;
  onThreatDetected?: (threat: api.ThreatAnalysis) => void;
}

// ---------------------------------------------------------------------------
// Camera feed configuration
// Add your .mp4 files to frontend/public/cameras/ and list them here.
// The filenames must match exactly. Labels are shown as camera location names.
// ---------------------------------------------------------------------------
const CAMERA_FEEDS = [
  { id: 'cam1', label: 'North Gate',     location: 'CAM-01', src: '/cameras/north-gate.mp4' },
  { id: 'cam2', label: 'South Field',    location: 'CAM-02', src: '/cameras/south-field.mp4' },
  { id: 'cam3', label: 'Farm Overview',  location: 'CAM-03', src: '/cameras/farm-overview.mp4' },
  { id: 'cam4', label: 'Farm Entry',     location: 'CAM-04', src: '/cameras/farm-entry.mp4' },
] as const;

type CameraFeed = typeof CAMERA_FEEDS[number];

// Rate limiting: minimum seconds between AI analyses
const MIN_ANALYSIS_INTERVAL = 30;
// Motion detection sensitivity for outdoor cameras.
// 2% is too sensitive (wind/leaves trigger constantly). 5% filters incidental movement.
const MOTION_COVERAGE_THRESHOLD = 5;   // % of pixels that must change
const MOTION_PIXEL_DIFF_THRESHOLD = 90; // per-pixel diff to count as changed

export default function LiveCamera({ farmId, onThreatDetected }: LiveCameraProps) {
  const { getCurrentFarm } = useFarmStore();
  const farm = getCurrentFarm();
  const videoRef        = useRef<HTMLVideoElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastFrameRef    = useRef<ImageData | null>(null);

  const [isStreaming, setIsStreaming]             = useState(false);
  const [isAnalyzing, setIsAnalyzing]             = useState(false);
  const [motionDetected, setMotionDetected]       = useState(false);
  const [lastAnalysis, setLastAnalysis]           = useState<api.ThreatAnalysis | null>(null);
  const [lastAnalysisTime, setLastAnalysisTime]   = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [error, setError]                         = useState<string | null>(null);
  const [motionEnabled, setMotionEnabled]         = useState(true);
  const [analyzedAt, setAnalyzedAt]               = useState<string | null>(null);
  const [activeFeed, setActiveFeed]               = useState<CameraFeed | 'device' | null>(null);
  const [clockDisplay, setClockDisplay]           = useState('');
  const [showFeedPicker, setShowFeedPicker]       = useState(false);
  const [agentStatus, setAgentStatus]             = useState<api.AgentStatus | null>(null);

  // Live clock overlay — ticks every second while streaming
  useEffect(() => {
    if (!isStreaming) return;
    const tick = () =>
      setClockDisplay(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isStreaming]);

  // Poll edge agent heartbeat every 90s so the banner stays fresh
  useEffect(() => {
    const poll = async () => {
      const res = await api.getAgentStatus(farmId);
      if (res.data) setAgentStatus(res.data);
    };
    poll();
    const id = setInterval(poll, 90_000);
    return () => clearInterval(id);
  }, [farmId]);

  // Start device (WebRTC) camera
  const startDeviceCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.src = '';
        await videoRef.current.play();
        setActiveFeed('device');
        setIsStreaming(true);
        toast.success('Camera started — AI monitoring active');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      setError(message);
      toast.error(message);
    }
  };

  // Start a named camera feed (looping video)
  const startFeed = async (feed: CameraFeed) => {
    setError(null);
    setShowFeedPicker(false);
    if (isStreaming) stopFeed();

    const video = videoRef.current;
    if (!video) return;

    // Clear any existing WebRTC stream first
    if (video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }

    video.src  = feed.src;
    video.loop = true;
    video.muted = true;

    try {
      await video.play();
      setActiveFeed(feed);
      setIsStreaming(true);
      lastFrameRef.current = null;
    } catch {
      setError(`Could not load feed: ${feed.label}`);
    }
  };

  // Stop whichever feed is active
  const stopFeed = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    } else {
      video.pause();
      video.src = '';
    }
    setIsStreaming(false);
    setActiveFeed(null);
    setMotionDetected(false);
    lastFrameRef.current = null;
  };

  // Capture current frame as base64 JPEG (works for both webcam & video file)
  const captureFrameBase64 = useCallback((): string | null => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    // Skip if video hasn't decoded a frame yet
    if (video.readyState < 2) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    try {
      ctx.drawImage(video, 0, 0);
      const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      // A valid JPEG frame will always be > 500 base64 chars; reject blank/corrupt frames
      if (!b64 || b64.length < 500) return null;
      return b64;
    } catch {
      // Canvas tainted (cross-origin video) — can't capture frame
      return null;
    }
  }, []);

  // AI threat analysis
  const analyzeForThreats = useCallback(async () => {
    if (!isStreaming || isAnalyzing) return;

    const now     = Date.now();
    const elapsed = (now - lastAnalysisTime) / 1000;
    if (elapsed < MIN_ANALYSIS_INTERVAL) {
      setCooldownRemaining(Math.ceil(MIN_ANALYSIS_INTERVAL - elapsed));
      return;
    }

    const imageData = captureFrameBase64();
    if (!imageData) return;

    // Lock the cooldown immediately so motion events during the API call don't re-trigger
    setLastAnalysisTime(now);
    setCooldownRemaining(MIN_ANALYSIS_INTERVAL);
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await api.analyzeThreat(farmId, imageData);

      // 429 = Bedrock throttled — wait longer, don't show as error
      if (response.status === 429) {
        setCooldownRemaining(60);
        setLastAnalysisTime(Date.now()); // reset so the 60s starts fresh
        toast('AI is busy — next scan in 60s', { icon: '⏳' });
        return;
      }

      if (response.error || !response.data?.analysis) {
        setError(response.error ?? 'No analysis returned');
        return;
      }

      const analysis = response.data.analysis;
      setLastAnalysis(analysis);
      setAnalyzedAt(response.data.analyzedAt);

      const isThreat = analysis.overallThreat !== 'none' && analysis.overallThreat !== 'low';
      if (isThreat) {
        toast.error(`⚠️ ${analysis.overallThreat.toUpperCase()} threat detected!`, { duration: 6000 });
        onThreatDetected?.(analysis);

        // Persist as an alert so it appears in History and Dashboard
        const threatTypes: string[] = [];
        if (analysis.fire.detected) threatTypes.push('Fire');
        if (analysis.human.detected && analysis.human.suspicious) threatTypes.push('Intruder');
        if (analysis.animal.detected) {
          const species = analysis.animal.species.length > 0 ? analysis.animal.species[0] : 'Animal';
          threatTypes.push(species);
        }
        const threatLabel = threatTypes.join(', ') || analysis.overallThreat;
        const cameraLabel = activeFeed && activeFeed !== 'device'
          ? `${activeFeed.location} – ${activeFeed.label}`
          : 'Live Camera';

        api.triggerAlert(
          farmId,
          farm?.userId ?? 'demo-user',
          {
            alertType: 'camera',
            severity: analysis.overallThreat === 'critical' ? 'critical'
              : analysis.overallThreat === 'high' ? 'high'
              : 'medium',
            title: `${threatLabel} detected – ${cameraLabel}`,
            description: JSON.stringify({
              type: 'threat',
              overallThreat: analysis.overallThreat,
              fire: analysis.fire,
              human: analysis.human,
              animal: analysis.animal,
              recommendations: analysis.recommendations,
              camera: cameraLabel,
            }),
          }
        ).catch(() => { /* non-critical — don't surface alert-save errors to user */ });
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
      const video  = videoRef.current;
      const canvas = motionCanvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width  = 160;
      canvas.height = 120;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (lastFrameRef.current) {
        let diffCount = 0;
        const data1 = lastFrameRef.current.data;
        const data2 = currentFrame.data;

        for (let i = 0; i < data1.length; i += 4) {
          const diff =
            Math.abs(data1[i]     - data2[i])     +
            Math.abs(data1[i + 1] - data2[i + 1]) +
            Math.abs(data1[i + 2] - data2[i + 2]);
          if (diff > MOTION_PIXEL_DIFF_THRESHOLD) diffCount++;
        }

        const motionPercent = (diffCount / (data1.length / 4)) * 100;
        const hasMotion     = motionPercent > MOTION_COVERAGE_THRESHOLD;
        setMotionDetected(hasMotion);

        if (hasMotion) analyzeForThreats();
      }

      lastFrameRef.current = currentFrame;
    };

    const id = setInterval(detectMotion, 200); // 5 FPS
    return () => clearInterval(id);
  }, [isStreaming, motionEnabled, analyzeForThreats]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  const threatLevelColor: Record<string, string> = {
    none:     'bg-green-100 text-green-700',
    low:      'bg-yellow-100 text-yellow-700',
    medium:   'bg-orange-100 text-orange-700',
    high:     'bg-red-100 text-red-700',
    critical: 'bg-red-600 text-white',
  };

  const cameraName = activeFeed === 'device'
    ? 'Device Camera'
    : activeFeed?.label ?? '';
  const cameraLocation = activeFeed === 'device'
    ? 'LIVE CAM'
    : activeFeed?.location ?? '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-slate-900">Live Camera</h3>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Monitoring
            </span>
          )}
          {agentStatus?.online && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium" title="Edge agent running 24/7">
              <Bot className="w-3.5 h-3.5" />
              Auto
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Camera / Feed switcher (only when streaming) */}
          {isStreaming && (
            <div className="relative">
              <button
                onClick={() => setShowFeedPicker(v => !v)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200"
              >
                {cameraName} <ChevronDown className="w-3 h-3" />
              </button>
              {showFeedPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFeedPicker(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-44">
                    <button
                      onClick={startDeviceCamera}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-500" /> Device Camera
                    </button>
                    {CAMERA_FEEDS.map(f => (
                      <button
                        key={f.id}
                        onClick={() => startFeed(f)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                      >
                        <MonitorPlay className="w-3.5 h-3.5 text-slate-500" /> {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Motion toggle */}
          <button
            onClick={() => setMotionEnabled(!motionEnabled)}
            className={`p-2 rounded-lg transition-colors ${motionEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}
            title={motionEnabled ? 'Motion detection ON' : 'Motion detection OFF'}
          >
            {motionEnabled ? <Activity className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          </button>

          {/* Start / Stop */}
          <button
            onClick={isStreaming ? stopFeed : undefined}
            className={`px-3 py-2 rounded-lg font-medium transition-colors ${isStreaming ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'hidden'}`}
          >
            <CameraOff className="w-4 h-4 inline mr-1" />Stop
          </button>
        </div>
      </div>

      {/* ── Video Feed ─────────────────────────────────────────────────── */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          loop
          crossOrigin="anonymous"
        />
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={motionCanvasRef} className="hidden" />

        {/* ── Camera selector (shown when not streaming) ── */}
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-4">

            {/* Autonomous agent status banner */}
            {agentStatus !== null && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${
                agentStatus.online
                  ? 'bg-green-900/60 text-green-300 border border-green-700/40'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700/40'
              }`}>
                <Bot className="w-3 h-3 flex-shrink-0" />
                {agentStatus.online ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                    </span>
                    Auto-monitoring — {agentStatus.cameras.length} cam{agentStatus.cameras.length !== 1 ? 's' : ''}
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    Agent offline — manual mode
                  </>
                )}
              </div>
            )}

            <p className="text-slate-400 text-xs font-mono mb-2 tracking-widest uppercase">
              Select Camera Feed
            </p>
            <div className="grid grid-cols-3 gap-1.5 w-full max-w-xs">
              {/* Device Camera */}
              <button
                onClick={startDeviceCamera}
                className="flex flex-col items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2 py-2 transition-colors"
              >
                <Camera className="w-4 h-4 text-slate-400" />
                <span className="text-white text-[10px] font-medium leading-tight text-center">Device</span>
                <span className="text-slate-500 text-[9px] font-mono">LIVE</span>
              </button>

              {/* Named feeds */}
              {CAMERA_FEEDS.map(feed => (
                <button
                  key={feed.id}
                  onClick={() => startFeed(feed)}
                  className="flex flex-col items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2 py-2 transition-colors"
                >
                  <MonitorPlay className="w-4 h-4 text-slate-400" />
                  <span className="text-white text-[10px] font-medium leading-tight text-center">{feed.label}</span>
                  <span className="text-slate-500 text-[9px] font-mono">{feed.location}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RTSP-style HUD overlay ── */}
        {isStreaming && (
          <>
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-2.5 py-1.5 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
              <span className="text-white text-[11px] font-mono tracking-wide">
                {cameraLocation} &nbsp;|&nbsp; {cameraName.toUpperCase()}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-white">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                REC &nbsp; {clockDisplay}
              </span>
            </div>

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 px-2.5 py-1 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
              <span className="text-white/40 text-[9px] font-mono tracking-widest">
                GREEN SENTINEL SECURITY SYSTEM
              </span>
            </div>
          </>
        )}

        {/* Motion badge */}
        {isStreaming && motionEnabled && motionDetected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-9 left-3 px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded flex items-center gap-1 shadow"
          >
            <Activity className="w-3.5 h-3.5" />
            Motion — Analyzing...
          </motion.div>
        )}

        {/* AI analysis overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm font-medium">Scanning for threats...</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Manual Scan ────────────────────────────────────────────────── */}
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
          {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scan className="w-5 h-5" />}
          {cooldownRemaining > 0
            ? `Next scan in ${cooldownRemaining}s`
            : isAnalyzing
            ? 'Scanning...'
            : 'Manual Threat Scan'}
        </button>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Analyzes for fire, human intrusion &amp; animal threats
        </p>
      </div>

      {/* ── Threat Analysis Results ─────────────────────────────────────── */}
      <AnimatePresence>
        {lastAnalysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-200 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Threat Assessment</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${threatLevelColor[lastAnalysis.overallThreat] ?? 'bg-slate-100 text-slate-600'}`}>
                  {lastAnalysis.overallThreat === 'none' ? '✓ Clear' : `⚠ ${lastAnalysis.overallThreat}`}
                </span>
              </div>

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
                      ? lastAnalysis.animal.species.length > 0 ? lastAnalysis.animal.species[0] : `${lastAnalysis.animal.confidence}%`
                      : 'None'}
                  </p>
                </div>
              </div>

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

      {!lastAnalysis && isStreaming && (
        <div className="p-4 border-t border-slate-200 flex items-center gap-2 text-slate-500">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-xs">Watching for motion — will analyze automatically</p>
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
