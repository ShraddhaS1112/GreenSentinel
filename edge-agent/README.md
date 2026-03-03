# GreenSentinel Edge Agent

Runs 24/7 on any device at the farm — Raspberry Pi, old laptop, Android tablet (via Termux), or Windows PC.
No cloud subscription needed. Uses your existing CCTV cameras.

## How it works

```
CCTV camera → capture frame → motion-free cooldown → AI analysis → auto-save alert → SMS to farmer
```

- Captures a frame from each camera every 5 minutes (day) / 2 minutes (night)
- Sends to GreenSentinel AI (Bedrock Claude Vision) for fire/intruder/animal detection
- On high/critical threat: saves alert to dashboard + sends SMS immediately
- Budget guard: stops after 100 calls/day locally, 200/day server-side

## Setup

### 1. Install Node.js 18+

```bash
# Raspberry Pi / Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# macOS
brew install node

# Windows
winget install OpenJS.NodeJS
```

### 2. Install ffmpeg (for RTSP/webcam cameras)

```bash
# Raspberry Pi / Ubuntu
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
winget install Gyan.FFmpeg
```

Not needed if all your cameras use HTTP snapshot URLs (`type: "snapshot"`).

### 3. Configure

```bash
cd edge-agent
cp config.example.json config.json
nano config.json    # fill in farmId, phoneNumber, camera URLs
```

Your `farmId` is shown in the GreenSentinel app under Settings → Farm Details.

### 4. Run

```bash
node agent.js
```

### 5. Run as a service (so it survives reboots)

**Linux / Raspberry Pi (systemd):**

```ini
# /etc/systemd/system/greensentinel-agent.service
[Unit]
Description=GreenSentinel Edge Agent
After=network.target

[Service]
ExecStart=/usr/bin/node /home/pi/GreenSentinel/edge-agent/agent.js
WorkingDirectory=/home/pi/GreenSentinel/edge-agent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable greensentinel-agent
sudo systemctl start greensentinel-agent
sudo journalctl -u greensentinel-agent -f
```

**Windows (Task Scheduler):**
Create a task that runs `node agent.js` at system startup with "Run whether user is logged on or not".

## Camera types

| Type | Description | ffmpeg needed? |
|------|-------------|----------------|
| `snapshot` | HTTP JPEG snapshot URL | No |
| `mjpeg` | HTTP MJPEG stream | No |
| `rtsp` | RTSP stream (NVR/IP cam) | Yes |
| `webcam` | USB or built-in webcam | Yes |
| `file` | MP4 file (demo mode) | Yes |

**Tip for cheap Indian IP cameras:** Most support a snapshot URL like:
- `http://192.168.1.10/snapshot.cgi`
- `http://192.168.1.10/cgi-bin/snapshot.jpg`
- Check the camera's web interface or manual for the exact URL.

## Cost

| Resource | Rate | Monthly (4 cameras) |
|----------|------|---------------------|
| Bedrock Claude Vision | ~$0.003/call | ~$5 (100 calls/night × 30 days) |
| SNS SMS (India) | ~₹0.50/SMS | ₹5 (10 real alerts) |
| Lambda | Free tier | Free |
| **Total** | | **~₹500/month** |

Budget guard: the agent stops calling AI after 100 calls/day (configurable). The server enforces 200/day.

## Logs

The agent logs to stdout with timestamps. Each line shows:
- `Clear (none)` — no threat detected
- `*** MEDIUM *** Fire 82%` — threat found, alert saved
- `Daily call limit reached` — budget exhausted for today

## Troubleshooting

**"Config not found"**: Make sure you've copied `config.example.json` to `config.json`.

**"Frame capture error"**: Check that ffmpeg is installed and the camera URL/path is correct.

**"API timeout"**: Check internet connectivity and that the apiUrl in config.json is correct.

**SMS not arriving**: Ensure `phoneNumber` is in E.164 format (`+91XXXXXXXXXX`). AWS SNS requires the account to be out of the SMS Sandbox for production use — contact your AWS admin.
