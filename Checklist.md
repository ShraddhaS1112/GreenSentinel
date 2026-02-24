14-Day Checklist to Win Demo
Day 1: Amplify Backend + PWA Scaffold

[X] npm create vite@latest frontend -- --template react-ts → TypeScript + SWC

[x] cd frontend && npm i && npm run dev → localhost:5173 works

[ ] npm i -g @aws-amplify/cli && amplify configure

[ ] amplify init → appName: "GreenSentinel", env: "dev"

[ ] amplify add auth → Default Cognito configuration

[ ] amplify add data → Farm{id, name, lat, lon, phone, language} + Threat{id, farmID, type, confidence, timestamp, snapshotURL}

[ ] amplify push → Backend deployed, get AppSync URL

Day 2: PWA Frontend Core (Req 1)
[ ] npm i aws-amplify @aws-amplify/ui-react vite-plugin-pwa tailwindcss @heroicons/react leaflet react-leaflet

[ ] Configure vite.config.ts → PWA manifest, service worker

[ ] Setup Amplify in main.tsx → <Authenticator><App/></Authenticator>

[ ] Create Dashboard.tsx → Farm cards + Leaflet map

[ ] amplify add hosting → amplify publish → Live PWA URL

Day 3: S3 + Frame Acquisition Lambda (Req 2)
[ ] AWS Console → Create gs-frames-bucket (lifecycle: delete after 24h)

[ ] Create frame-acquisition Lambda → Mock RTSP (download test images → S3 every 10s)

[ ] EventBridge rule → Trigger Lambda every 10s

[ ] Test: Lambda runs → images in S3 bucket

Day 4: Bedrock Vision Threat Detection (Req 3)
[ ] vision-threat Lambda → S3 trigger on frame upload

[ ] Bedrock Claude 3.5 Sonnet → Prompt: "Detect fire/human/animal in farm image, return JSON {threat: string, confidence: number}"

[ ] If confidence >80% → Create Threat record in DynamoDB via AppSync

[ ] Test: Upload fire image → Threat record created

Day 5: Test E2E Frame → Threat
[ ] Manual test: Upload intruder image → Bedrock detects → DynamoDB record → PWA shows threat

[ ] Add reconnection logic to frame-acquisition (try/except + backoff)

[ ] Verify PWA offline cache works (Req 1.2)

Day 6: Sentinel Hub NDVI Integration (Req 4)
[ ] Get free Sentinel Hub API key (dataspace.copernicus.eu)

[ ] ndvi-health Lambda → Daily cron (06:00 UTC) → Fetch NDVI for farm bbox

[ ] Calculate FarmHealthScore = NDVI × 100 → Store in DynamoDB

[ ] Frontend: NDVI heatmap (Red-Yellow-Green based on 0.3/0.6 thresholds)

Day 7: Mid-Week Demo Prep
[ ] Video record: PWA install → Add farm → Mock threat → PWA shows alert

[ ] Screenshot Free Tier usage (Billing Console) → Prove $0 spend

[ ] Push to GitHub → Clean README with architecture diagram

Day 8: Twilio WhatsApp Alerts (Req 5)
[ ] Twilio Sandbox → Get WhatsApp test number + webhook URL

[ ] alert-delivery Lambda → Trigger on new Threat (AppSync subscription)

[ ] Bhashini API → Translate to Hindi/Marathi: "Alert: {threat} detected at {farm}, confidence {confidence}%"

[ ] Twilio → Send WhatsApp with snapshot image

Day 9: Latency Monitoring (Req 6)
[ ] CloudWatch Logs → Measure frame→alert time (<10s)

[ ] Add timing metrics to all Lambdas (capture timestamp → delivery timestamp)

[ ] Alarm if latency >10s → Email yourself

Day 10: Multi-Farm + RBAC (Req 8)
[ ] AppSync resolvers → Filter threats by user/farm ownership

[ ] Cognito Groups → farm_owner role

[ ] Frontend → Dropdown switch between farms (<2s load)

Day 11: Security Hardening (Req 7)
[ ] AWS Secrets Manager → Encrypt mock camera credentials

[ ] Lambda IAM roles → Least privilege (Bedrock invoke, S3 put, DynamoDB write)

[ ] Frontend → HTTPS certificate pinning

Day 12: Reliability (Req 9)
[ ]  Lambda retries → 3 attempts with exponential backoff

 [ ] Dead letter queue for failed alerts

 [ ] Test failure recovery: Kill Lambda → Auto-restart

Day 13: Cost Optimization (Req 10)
 [ ] CloudWatch Budget → $10 alert threshold

 [ ] S3 lifecycle → Delete frames after 24h

 [ ] DynamoDB on-demand → Auto-scale within Free Tier

Day 14: Winning Demo
 [ ] Full video: PWA → Add farm → NDVI updates → Threat detection → Hindi WhatsApp alert (10s)

 [ ] Live demo setup: 2 phones (PWA + WhatsApp receiver)

[ ]  Pitch deck: "Zero-install PWA, Free Tier compliant, scales to 1000 farms"

[ ]  GitHub repo → Professional README + demo video

Daily Success Metrics
Day	Success =
1-2	Live PWA + CRUD farms/threats
5	Frame → Bedrock → Threat pipeline
8	WhatsApp alert received (<10s)
14	Judge says "This wins!"
Commit every completed day to GitHub. Track Free Tier usage daily. You're building a hackathon champion! 🏆
