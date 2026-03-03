#!/usr/bin/env node
/**
 * GreenSentinel Edge Agent v1.0
 *
 * Runs 24/7 on any device at the farm — Raspberry Pi, Android tablet via Termux,
 * old laptop, NVR box, Windows/Linux PC. Monitors CCTV cameras autonomously and
 * sends threat alerts even when the GreenSentinel app is closed.
 *
 * Supported camera sources:
 *   rtsp     — IP camera RTSP stream (requires ffmpeg)
 *   snapshot — IP camera HTTP snapshot URL (common on cheap Indian IP cameras)
 *   mjpeg    — HTTP MJPEG stream URL
 *   webcam   — USB / built-in webcam (requires ffmpeg)
 *   file     — MP4/video file (demo mode, requires ffmpeg)
 *
 * Requirements:
 *   - Node.js 18+
 *   - ffmpeg installed (sudo apt install ffmpeg / brew install ffmpeg / winget install ffmpeg)
 *     Only needed for rtsp, webcam, and file source types.
 *     For 'snapshot' type, ffmpeg is NOT required.
 *
 * Cost controls baked in:
 *   - Per-camera cooldown (default 5 min day / 2 min night)
 *   - Client-side daily call cap (default 100/day)
 *   - Server-side daily cap enforced by Lambda (200/day)
 *   - Only calls AI when camera source is reachable
 *
 * Usage:
 *   node agent.js [path/to/config.json]
 *   node agent.js               ← uses ./config.json by default
 */

'use strict';

const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const { execSync } = require('child_process');

// Auto-resolve ffmpeg: prefer system install, fall back to bundled binary
function resolveFfmpeg(configuredPath) {
  if (configuredPath && configuredPath !== 'ffmpeg') return configuredPath;
  try {
    execSync('ffmpeg -version', { stdio: 'ignore', timeout: 3000 });
    return 'ffmpeg'; // system ffmpeg works
  } catch {
    try {
      const bundled = require('ffmpeg-static');
      if (bundled && fs.existsSync(bundled)) return bundled;
    } catch {}
    return null; // no ffmpeg available
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Load config
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG_PATH = process.argv[2] || path.join(__dirname, 'config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch {
  console.error(`\n[GreenSentinel] Config not found at: ${CONFIG_PATH}`);
  console.error(`Copy config.example.json to config.json and fill in your details.\n`);
  process.exit(1);
}

const {
  apiUrl,
  farmId,
  phoneNumber,          // E.164 format: +91XXXXXXXXXX — for SMS alerts
  cameras = [],
  cooldownMinutes      = 5,   // min between AI calls per camera during day
  nightCooldownMinutes = 2,   // min between AI calls per camera at night
  maxDailyCallsLocal   = 100, // client-side daily budget guard
  nightStart           = 18,  // 6 PM — when "night mode" begins (more frequent checks)
  nightEnd             = 6,   // 6 AM — when day mode resumes
  heartbeatSeconds     = 60,  // how often to ping the dashboard
  ffmpegPath: _ffmpegPathConfig = 'ffmpeg',
  maxImageWidth        = 640, // resize before sending — fewer tokens = lower cost
  maxImageHeight       = 480,
  jpegQuality          = 3,   // ffmpeg -q:v 1(best)–31(worst), 3–5 is good balance
  motionThreshold      = 5,   // % pixel change to trigger analysis (5% suits outdoor cams)
} = config;

const ffmpegPath = resolveFfmpeg(_ffmpegPathConfig);

// ─────────────────────────────────────────────────────────────────────────────
// Runtime state
// ─────────────────────────────────────────────────────────────────────────────
const lastCallTime = {}; // cameraId → epoch ms of last successful API call
let dailyCallCount = 0;
let dailyCallDate  = new Date().toDateString();
let budgetExhausted = false;

// Reset daily counters at midnight
setInterval(() => {
  const today = new Date().toDateString();
  if (today !== dailyCallDate) {
    dailyCallCount  = 0;
    dailyCallDate   = today;
    budgetExhausted = false;
    log('Daily call counter reset');
  }
}, 60_000);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function log(msg) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}

function isNight() {
  const h = new Date().getHours();
  return nightStart > nightEnd
    ? (h >= nightStart || h < nightEnd)   // spans midnight  e.g. 18 → 6
    : (h >= nightStart && h < nightEnd);  // same day window e.g. 18 → 22
}

function cooldownMs() {
  return (isNight() ? nightCooldownMinutes : cooldownMinutes) * 60_000;
}

function isCooledDown(cameraId) {
  return (Date.now() - (lastCallTime[cameraId] || 0)) >= cooldownMs();
}

// Generic HTTP/HTTPS GET → Buffer
function httpGet(url, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// POST JSON to API Gateway
function apiPost(endpoint, data, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const u    = new URL(apiUrl + endpoint);
    const opts = {
      hostname: u.hostname,
      port:     u.port || (u.protocol === 'https:' ? 443 : 80),
      path:     u.pathname + u.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout:  timeoutMs,
    };
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end',  () => {
        try   { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('API timeout')); });
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame capture
// ─────────────────────────────────────────────────────────────────────────────

// ffmpeg -vf scale filter: shrink to maxImageWidth×maxImageHeight, keep aspect ratio
// Smaller image = fewer Bedrock tokens = lower cost
function scaleFilter() {
  return `-vf "scale='min(${maxImageWidth},iw)':'min(${maxImageHeight},ih)':force_original_aspect_ratio=decrease"`;
}

async function captureFrame(camera) {
  const tmp = path.join(os.tmpdir(), `gs-frame-${camera.id}-${Date.now()}.jpg`);
  try {
    if (camera.type === 'snapshot' || camera.type === 'mjpeg') {
      // Direct HTTP snapshot — most cheap IP cameras expose this
      // e.g. http://192.168.1.10/snapshot.cgi or /cgi-bin/snapshot.cgi
      const buf = await httpGet(camera.url);
      if (buf.length < 1_000) return null; // corrupt or empty
      return buf.toString('base64');

    } else if (camera.type === 'rtsp') {
      if (!ffmpegPath) { log(`Skipping ${camera.name} — ffmpeg required for RTSP`); return null; }
      execSync(
        `"${ffmpegPath}" -y -rtsp_transport tcp -i "${camera.url}" -vframes 1 ${scaleFilter()} -q:v ${jpegQuality} "${tmp}"`,
        { timeout: 20_000, stdio: 'pipe' }
      );

    } else if (camera.type === 'webcam') {
      if (!ffmpegPath) { log(`Skipping ${camera.name} — ffmpeg required for webcam`); return null; }
      const dev = process.platform === 'win32'
        ? `-f dshow -i video="${camera.device || 'Integrated Camera'}"`
        : `-f v4l2 -i ${camera.device || '/dev/video0'}`;
      execSync(`"${ffmpegPath}" -y ${dev} -vframes 1 ${scaleFilter()} -q:v ${jpegQuality} "${tmp}"`, { timeout: 10_000, stdio: 'pipe' });

    } else if (camera.type === 'file') {
      if (!ffmpegPath) { log(`Skipping ${camera.name} — ffmpeg required for file type`); return null; }
      // Demo mode — grab a random frame from an MP4 file
      // Get duration via ffmpeg stderr (ffprobe not bundled in ffmpeg-static)
      let duration = 30;
      if (ffmpegPath) {
        try {
          const info = execSync(
            `"${ffmpegPath}" -i "${camera.path}"`,
            { stdio: 'pipe', timeout: 5000 }
          ).toString();
          const m = info.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
          if (m) duration = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
        } catch (e) {
          // ffmpeg exits with error code when given no output — check stderr
          const stderr = e.stderr?.toString() || '';
          const m = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
          if (m) duration = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
        }
      }
      const seek = (Math.random() * Math.max(0, duration - 2)).toFixed(2);
      execSync(
        `"${ffmpegPath}" -y -ss ${seek} -i "${camera.path}" -vframes 1 ${scaleFilter()} -q:v ${jpegQuality} "${tmp}"`,
        { timeout: 10_000, stdio: 'pipe' }
      );

    } else {
      log(`Unknown camera type "${camera.type}" for ${camera.name} — skipping`);
      return null;
    }

    if (!fs.existsSync(tmp)) return null;
    const buf = fs.readFileSync(tmp);
    if (buf.length < 1_000) return null; // too small = blank / failed
    return buf.toString('base64');

  } catch (err) {
    log(`Frame capture error (${camera.name}): ${err.message}`);
    return null;
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Analyse one camera
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeCamera(camera) {
  if (!isCooledDown(camera.id)) return;
  if (budgetExhausted || dailyCallCount >= maxDailyCallsLocal) {
    if (!budgetExhausted) {
      log(`Daily call limit (${maxDailyCallsLocal}) reached locally. Pausing until midnight.`);
      budgetExhausted = true;
    }
    return;
  }

  log(`Capturing frame — ${camera.name} (${camera.type})`);
  const imageData = await captureFrame(camera);
  if (!imageData) {
    log(`No frame from ${camera.name} — will retry next interval`);
    return;
  }

  // Lock cooldown BEFORE API call to prevent burst on failure
  lastCallTime[camera.id] = Date.now();
  dailyCallCount++;

  const callInfo = `call ${dailyCallCount}/${maxDailyCallsLocal} today, ` +
    `next in ${isNight() ? nightCooldownMinutes : cooldownMinutes}min`;
  log(`Sending to AI — ${camera.name} (${callInfo})`);

  try {
    const res = await apiPost('/threat-detect', {
      farmId,
      imageData,
      autoMode:    true,
      cameraId:    camera.id,
      cameraName:  camera.name,
      phoneNumber: phoneNumber || undefined,
    });

    if (res.status === 429) {
      if (res.data?.budgetExhausted) {
        log('Server daily budget exhausted — pausing AI calls until midnight');
        budgetExhausted = true;
      } else {
        log('Bedrock throttled — will retry after next cooldown');
        // Don't mark budgetExhausted; just let cooldown handle it
      }
      return;
    }

    if (res.status !== 200) {
      log(`AI error for ${camera.name}: ${res.data?.error || res.status}`);
      return;
    }

    const { analysis, autoSaved } = res.data;
    const threat = analysis?.overallThreat || 'none';

    if (threat === 'none' || threat === 'low') {
      log(`${camera.name}: Clear (${threat})`);
    } else {
      const parts = [];
      if (analysis.fire?.detected)                          parts.push(`Fire ${analysis.fire.confidence}%`);
      if (analysis.human?.detected && analysis.human.suspicious) parts.push(`Intruder ${analysis.human.confidence}%`);
      if (analysis.animal?.detected)                        parts.push(`Animal: ${(analysis.animal.species || []).join(',') || '?'} ${analysis.animal.confidence}%`);
      log(`*** ${camera.name}: ${threat.toUpperCase()} *** ${parts.join(' | ')}`);
      if (autoSaved) log(`Alert saved to dashboard${phoneNumber ? ' + SMS sent' : ''}`);
    }

  } catch (err) {
    log(`API error (${camera.name}): ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Heartbeat — lets the app dashboard show "Agent Online"
// ─────────────────────────────────────────────────────────────────────────────
async function sendHeartbeat() {
  try {
    await apiPost('/agent-heartbeat', {
      farmId,
      agentVersion: '1.0',
      cameras: cameras.map(c => ({ id: c.id, name: c.name, type: c.type })),
    });
  } catch { /* non-fatal */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main loop
// ─────────────────────────────────────────────────────────────────────────────
async function start() {
  log(`GreenSentinel Edge Agent starting`);
  log(`Farm: ${farmId} | Cameras: ${cameras.length} | ` +
    `Day cooldown: ${cooldownMinutes}min | Night cooldown: ${nightCooldownMinutes}min`);
  log(`Local budget: ${maxDailyCallsLocal} calls/day | SMS: ${phoneNumber ? 'enabled' : 'disabled'}`);
  log(`Night mode: ${nightStart}:00 – ${nightEnd}:00`);
  log(`ffmpeg: ${ffmpegPath || 'NOT FOUND — snapshot/mjpeg cameras only'}`);

  if (cameras.length === 0) {
    log('WARNING: No cameras configured — check config.json');
    return;
  }

  const ffmpegNeeded = ['rtsp', 'webcam', 'file'];
  const needsFfmpeg  = cameras.filter(c => ffmpegNeeded.includes(c.type));
  if (!ffmpegPath && needsFfmpeg.length > 0) {
    log(`WARNING: ffmpeg not found. ${needsFfmpeg.length} camera(s) will be skipped: ` +
      needsFfmpeg.map(c => c.name).join(', '));
    log(`Fix: cd edge-agent && npm install   (installs bundled ffmpeg-static)`);
  }

  // First heartbeat
  await sendHeartbeat();
  setInterval(sendHeartbeat, heartbeatSeconds * 1_000);

  // Stagger camera checks by 30 s each to avoid simultaneous API calls
  cameras.forEach((camera, i) => {
    const interval = cooldownMs();
    setTimeout(async () => {
      await analyzeCamera(camera);
      setInterval(() => analyzeCamera(camera), interval);
    }, i * 30_000);
  });
}

start().catch(err => { log(`Fatal: ${err.message}`); process.exit(1); });
