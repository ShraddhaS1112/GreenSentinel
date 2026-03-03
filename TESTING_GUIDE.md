# Testing Guide - AWS MediaLive HLS Integration

## Setup for Testing

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Update HLS URLs
Edit `frontend/src/components/LiveCamera.tsx` line ~50 and replace placeholder URLs with your actual AWS MediaPackage HLS endpoints:

```typescript
const CAMERA_FEEDS: CameraFeedConfig[] = [
  {
    id: 'cam1',
    label: 'North Gate',
    location: 'CAM-01',
    hlsUrl: 'https://your-mediapackage.ap-south-1.amazonaws.com/out/v1/farm1-cam1/index.m3u8',
  },
  // ... more cameras
];
```

### 3. Build & Deploy
```bash
npm run build
npm run deploy
```

### 4. Start MediaLive Channel
AWS Console → MediaLive → Channels → Select channel → Click **Start**

---

## Testing Checklist

### ✅ Live Stream Display
- [ ] Open PWA: `https://d9arh4mw4n81s.cloudfront.net/`
- [ ] Go to **Live Camera** section
- [ ] Click **Select Camera Feed**
- [ ] Choose a camera (e.g., "North Gate")
- [ ] Verify live RTSP stream displays in video element
- [ ] Check video plays smoothly without buffering

### ✅ Motion Detection
- [ ] Move in front of camera
- [ ] Verify "Motion — Analyzing..." badge appears
- [ ] Check motion detection triggers within 1 second
- [ ] Verify motion detection can be toggled on/off

### ✅ Bedrock Fire Detection
- [ ] Motion detection triggers analysis
- [ ] Bedrock Claude analyzes frame
- [ ] Threat assessment displays (Fire/Human/Animal)
- [ ] Confidence scores show correctly
- [ ] Recommendations display for threats

### ✅ Camera Switching
- [ ] Start one camera feed
- [ ] Click camera selector dropdown
- [ ] Switch to another camera
- [ ] Verify stream switches without errors
- [ ] Verify motion detection continues working

### ✅ Error Handling
- [ ] Stop MediaLive channel
- [ ] Try to play stream
- [ ] Verify error message displays
- [ ] Restart MediaLive channel
- [ ] Verify stream reconnects

### ✅ Browser Compatibility
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on Edge
- [ ] Test on mobile browsers

### ✅ Performance
- [ ] Check stream latency (should be 3-10 seconds)
- [ ] Monitor CPU usage (should be <30%)
- [ ] Check memory usage (should be <100MB)
- [ ] Verify frame rate (should be 25-30 fps)

### ✅ Alerts
- [ ] Trigger high-confidence threat (e.g., fire)
- [ ] Verify WhatsApp/SMS alert sent
- [ ] Check threat appears in history
- [ ] Verify alert timestamp is correct

### ✅ Offline Mode
- [ ] Disconnect internet
- [ ] Verify cached threat data displays
- [ ] Reconnect internet
- [ ] Verify new threats load

---

## Expected Results

| Feature | Expected Behavior |
|---------|-------------------|
| Stream Loading | Video displays within 3-5 seconds |
| Motion Detection | Triggers within 1 second of motion |
| Bedrock Analysis | Completes within 3 seconds |
| Threat Alert | Sent within 10 seconds of detection |
| Camera Switch | Completes within 2 seconds |
| Error Recovery | Reconnects within 30 seconds |

---

## Troubleshooting

### Stream not loading
- Check MediaLive channel is **Running**
- Verify HLS URL is correct
- Check browser console for errors
- Test HLS URL in VLC player

### Motion detection not working
- Verify video is playing
- Check motion toggle is enabled
- Verify Bedrock API credentials
- Check browser console for errors

### High latency
- Reduce `liveSyncDuration` in startFeed() (currently 3)
- Check network bandwidth
- Reduce segment duration in MediaLive

### Build/Deploy issues
```bash
npm cache clean --force
npm install
npm run build
npm run deploy
```

---

## Test Data

Use these test scenarios:

1. **Normal Operation**
   - Clear farm, no threats
   - Motion detection triggers
   - Bedrock returns "none" threat level

2. **Fire Detection**
   - Show fire/flame to camera
   - Bedrock detects fire
   - Alert sent with high confidence

3. **Intruder Detection**
   - Person walks in front of camera
   - Bedrock detects human
   - Alert sent if suspicious

4. **Animal Detection**
   - Animal appears in frame
   - Bedrock detects animal species
   - Alert sent if configured

---

## Performance Metrics

Monitor these metrics:

- **Stream Latency:** 3-10 seconds
- **Frame Rate:** 25-30 fps
- **Bitrate:** 1-2 Mbps
- **CPU Usage:** <30%
- **Memory Usage:** <100MB
- **Error Rate:** <1%
- **Motion Detection:** <1 second trigger
- **Bedrock Latency:** <3 seconds

---

## Sign-Off

Once all tests pass:
- [ ] Stream displays correctly
- [ ] Motion detection works
- [ ] Bedrock fire detection works
- [ ] Alerts send properly
- [ ] No errors in console
- [ ] Performance acceptable
- [ ] Ready for production

---

**Implementation ready for testing!**
