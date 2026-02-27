# Green Sentinel

**Digital Immune System for Indian Agriculture** - Satellite + AI Vision threat detection platform.

Green Sentinel is a Progressive Web App (PWA) that helps farmers detect and respond to agricultural threats using satellite imagery (NDVI analysis) and AI-powered threat detection.

## Features

- **Satellite Imagery Analysis** - NDVI monitoring using Sentinel Hub
- **AI Threat Detection** - AWS Bedrock-powered image analysis
- **Real-time Alerts** - WhatsApp notifications via Twilio
- **Multi-language Support** - Bhashini integration for regional languages
- **Offline-first PWA** - Works without internet connectivity
- **Interactive Maps** - Leaflet-based field visualization

## Project Structure

```
green-sentinel/
├── frontend/              # React + Vite PWA application
├── packages/
│   ├── backend/           # AWS Lambda functions
│   ├── infrastructure/    # AWS CDK infrastructure (alternative)
│   └── shared/            # Shared TypeScript types
├── infra/                 # AWS CDK infrastructure (primary)
└── docs/                  # Documentation
```

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **AWS CLI** configured with appropriate credentials
- **AWS CDK** installed globally (`npm install -g aws-cdk`)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/green-sentinel/green-sentinel.git
cd green-sentinel
```

### 2. Install dependencies

```bash
npm install
```

This will install dependencies for all workspaces (frontend, backend, shared, infrastructure).

### 3. Configure environment variables

#### Root environment (for backend services)

```bash
cp .env.example .env
```

Edit `.env` and configure:

| Variable | Description |
|----------|-------------|
| `AWS_REGION` | AWS region (default: `ap-south-1`) |
| `AWS_ACCOUNT_ID` | Your AWS account ID |
| `SENTINEL_HUB_CLIENT_ID` | Sentinel Hub API client ID |
| `SENTINEL_HUB_CLIENT_SECRET` | Sentinel Hub API client secret |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | Twilio WhatsApp number |
| `BHASHINI_USER_ID` | Bhashini user ID |
| `BHASHINI_ULCA_API_KEY` | Bhashini ULCA API key |
| `BHASHINI_INFERENCE_API_KEY` | Bhashini inference API key |
| `BHASHINI_PIPELINE_ID` | Bhashini pipeline ID |

#### Frontend environment

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env` and configure:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
| `VITE_WS_URL` | WebSocket URL for real-time updates |
| `VITE_AWS_REGION` | AWS region |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID (from CDK output) |
| `VITE_COGNITO_CLIENT_ID` | Cognito Client ID (from CDK output) |
| `VITE_ENABLE_MOCK_DATA` | Enable mock data for development (`true`/`false`) |

## Running the Application

### Development Mode

#### Start the frontend development server

```bash
npm run dev
```

This starts the Vite development server at `http://localhost:5173`.

#### Build the frontend

```bash
npm run build:frontend
```

#### Preview production build

```bash
cd frontend
npm run preview
```

### Running Tests

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration
```

### Linting and Type Checking

```bash
# Run linter
npm run lint

# Run TypeScript type check
npm run typecheck
```

## AWS Infrastructure Deployment

### 1. Bootstrap CDK (first time only)

```bash
cd infra
npm install
npx cdk bootstrap
```

### 2. Deploy infrastructure

```bash
# From root directory
npm run deploy

# Or from infra directory
cd infra
npx cdk deploy --all
```

### 3. Deploy to production

```bash
cd infra
npx cdk deploy --all --context environment=production
```

### 4. View infrastructure diff

```bash
cd infra
npx cdk diff
```

### 5. Destroy infrastructure

```bash
cd infra
npx cdk destroy --all
```

## Third-Party Service Setup

### Sentinel Hub (Satellite Data)

1. Register at [Sentinel Hub](https://www.sentinel-hub.com/)
2. Create an OAuth client
3. Add credentials to `.env`

### Twilio (WhatsApp Notifications)

1. Register at [Twilio](https://www.twilio.com/)
2. Enable WhatsApp sandbox or production number
3. Add credentials to `.env`

### Bhashini (Translation & Voice)

1. Register at [Bhashini ULCA](https://bhashini.gov.in/ulca)
2. Create a pipeline for your language pairs
3. Add credentials to `.env`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend development server |
| `npm run build` | Build frontend and backend |
| `npm run build:frontend` | Build frontend only |
| `npm run build:backend` | Build backend only |
| `npm run deploy` | Deploy infrastructure to AWS |
| `npm run test` | Run all tests |
| `npm run lint` | Run linter on all workspaces |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run clean` | Clean all build artifacts |

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Query
- Zustand (state management)
- Leaflet (maps)
- Chart.js
- AWS Amplify (authentication)

### Backend
- AWS Lambda
- AWS DynamoDB
- AWS S3
- AWS Bedrock (AI)
- AWS Cognito (authentication)
- AWS SNS/SQS (messaging)

### Infrastructure
- AWS CDK (TypeScript)

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request
