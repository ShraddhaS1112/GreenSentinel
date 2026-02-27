# Green Sentinel - Enhanced Features Documentation

## Overview

This document describes the enhanced features added to Green Sentinel, transforming it from a basic threat detection system into a comprehensive agricultural intelligence platform.

---

## Table of Contents

1. [Satellite Analytics (Multiple Vegetation Indices)](#1-satellite-analytics)
2. [Weather Intelligence](#2-weather-intelligence)
3. [Disease & Pest Forecasting](#3-disease--pest-forecasting)
4. [Irrigation Modeling](#4-irrigation-modeling)
5. [Yield Prediction](#5-yield-prediction)
6. [Crop Detection & Growth Tracking](#6-crop-detection--growth-tracking)
7. [Historical Analysis](#7-historical-analysis)
8. [Data Sources & APIs](#8-data-sources--apis)
9. [Architecture](#9-architecture)
10. [Cost Analysis](#10-cost-analysis)

---

## 1. Satellite Analytics

### Overview
Enhanced satellite analysis using **free** Sentinel-2 data from AWS Open Data Registry, providing multiple vegetation indices for comprehensive crop health assessment.

### Vegetation Indices

| Index | Name | Formula | Use Case |
|-------|------|---------|----------|
| **NDVI** | Normalized Difference Vegetation Index | (NIR - Red) / (NIR + Red) | Overall vegetation health |
| **NDWI** | Normalized Difference Water Index | (Green - NIR) / (Green + NIR) | Water stress detection |
| **NDMI** | Normalized Difference Moisture Index | (NIR - SWIR) / (NIR + SWIR) | Canopy moisture content |
| **EVI** | Enhanced Vegetation Index | 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1) | Dense vegetation areas |
| **SAVI** | Soil Adjusted Vegetation Index | ((NIR - Red) / (NIR + Red + L)) * (1 + L) | Sparse vegetation |

### Health Score Calculation
```
Health Score = (NDVI_score * 0.5) + (NDMI_score * 0.3) + (NDWI_score * 0.2)
```

Where each component score is normalized to 0-100 scale.

### Data Source
- **Provider**: AWS Open Data Registry
- **Dataset**: Sentinel-2 Level-2A Cloud Optimized GeoTIFFs
- **Resolution**: 10 meters (Bands 2, 3, 4, 8) / 20 meters (Bands 11, 12)
- **Revisit Time**: 5 days
- **Cost**: FREE
- **Coverage**: Global

### API Endpoints
```
GET /api/farms/{farmId}/satellite
GET /api/farms/{farmId}/satellite/history?days=30
GET /api/farms/{farmId}/satellite/indices
```

---

## 2. Weather Intelligence

### Overview
Hyper-local weather data integration using Open-Meteo API (100% free, no API key required).

### Features

#### Current Conditions
- Temperature (actual & feels like)
- Humidity
- Wind speed & direction
- Precipitation
- UV Index
- Cloud cover

#### Forecasting
- 14-day daily forecast
- 48-hour hourly forecast
- Precipitation probability
- Temperature ranges

#### Agricultural Metrics
- **GDD (Growing Degree Days)**: Accumulated heat units for crop development
- **ET₀ (Evapotranspiration)**: Daily water loss estimate
- **Chill Hours**: For fruit/nut crops requiring winter dormancy
- **Frost Risk**: Alerts when temperature approaches freezing

### Weather Alerts
| Alert Type | Trigger Condition | Severity |
|------------|-------------------|----------|
| Frost Warning | Temp < 4°C forecast | High |
| Heat Wave | Temp > 40°C for 3+ days | High |
| Heavy Rain | Precipitation > 50mm/day | Medium |
| Strong Wind | Wind > 50 km/h | Medium |
| Drought Risk | No rain for 14+ days + low humidity | High |

### Data Source
- **Provider**: Open-Meteo
- **API**: https://api.open-meteo.com/v1/forecast
- **Historical**: https://archive-api.open-meteo.com/v1/archive
- **Cost**: FREE (10,000 requests/day)
- **API Key**: Not required

### API Endpoints
```
GET /api/farms/{farmId}/weather
GET /api/farms/{farmId}/weather/forecast
GET /api/farms/{farmId}/weather/history?startDate=&endDate=
GET /api/farms/{farmId}/weather/alerts
```

---

## 3. Disease & Pest Forecasting

### Overview
AI-powered prediction of disease and pest risks based on weather conditions, crop growth stage, and historical patterns.

### Supported Diseases

| Disease | Crops Affected | Risk Factors |
|---------|---------------|--------------|
| Late Blight | Potato, Tomato | Humidity >80%, Temp 15-25°C, Wet |
| Early Blight | Potato, Tomato | Warm temps, Stressed plants |
| Powdery Mildew | Wheat, Grapes, Vegetables | Temp 20-30°C, Humidity 50-80% |
| Downy Mildew | Grapes, Cucurbits | Cool nights, Morning dew |
| Rust | Wheat, Pulses | Humidity >60%, Temp 15-30°C |
| Bacterial Wilt | Tomato, Potato, Brinjal | Warm, Wet conditions |
| Anthracnose | Mango, Chilli, Beans | High humidity, Rain splash |

### Supported Pests

| Pest | Crops Affected | Risk Factors |
|------|---------------|--------------|
| Fall Armyworm | Maize, Sorghum, Rice | Warm weather, Dense plantings |
| Aphids | All crops | Moderate temps, New growth |
| Whitefly | Cotton, Vegetables | Hot, Dry conditions |
| Thrips | Onion, Chilli, Cotton | Dry weather |
| Stem Borer | Rice, Sugarcane | Humid conditions |
| Bollworm | Cotton | Flowering stage |
| Fruit Fly | Mango, Guava, Citrus | Fruiting stage |

### Risk Calculation Algorithm
```typescript
riskScore = baseRisk
  + weatherFactor(temperature, humidity, precipitation)
  + growthStageFactor(currentStage)
  + historicalFactor(pastIncidents)
  + neighborhoodFactor(nearbyFarmAlerts)
```

### Alert Levels
- **Low (0-30)**: Monitor conditions
- **Medium (31-60)**: Prepare preventive measures
- **High (61-80)**: Apply preventive treatment
- **Critical (81-100)**: Immediate action required

### API Endpoints
```
GET /api/farms/{farmId}/disease-risk
GET /api/farms/{farmId}/pest-risk
GET /api/farms/{farmId}/advisories
```

---

## 4. Irrigation Modeling

### Overview
Smart irrigation recommendations based on soil moisture estimation, weather data, and crop water requirements.

### Water Balance Model
```
Soil Moisture (today) = Soil Moisture (yesterday)
                       + Rainfall
                       + Irrigation
                       - Evapotranspiration
                       - Deep Percolation
```

### Crop Coefficients (Kc)

| Crop | Initial | Mid-Season | Late |
|------|---------|------------|------|
| Rice | 1.05 | 1.20 | 0.90 |
| Wheat | 0.30 | 1.15 | 0.25 |
| Maize | 0.30 | 1.20 | 0.35 |
| Cotton | 0.35 | 1.20 | 0.50 |
| Sugarcane | 0.40 | 1.25 | 0.75 |
| Potato | 0.50 | 1.15 | 0.75 |
| Tomato | 0.60 | 1.15 | 0.80 |
| Onion | 0.70 | 1.05 | 0.75 |

### Irrigation Recommendations

| Soil Moisture Level | Status | Action |
|--------------------|--------|--------|
| >80% Field Capacity | Adequate | No irrigation needed |
| 60-80% FC | Good | Monitor, irrigate in 2-3 days |
| 40-60% FC | Moderate Stress | Irrigate within 24 hours |
| <40% FC | Severe Stress | Irrigate immediately |

### Features
- Zone-based irrigation scheduling
- Water requirement calculation (liters/hectare)
- Optimal irrigation timing (avoid hottest hours)
- Rain forecast integration (skip if rain expected)
- Water savings tracking

### API Endpoints
```
GET /api/farms/{farmId}/irrigation
GET /api/farms/{farmId}/irrigation/schedule
GET /api/farms/{farmId}/irrigation/zones
POST /api/farms/{farmId}/irrigation/log
```

---

## 5. Yield Prediction

### Overview
Machine learning-based yield prediction using historical data, current crop conditions, and weather patterns.

### Input Features
- Current NDVI and vegetation indices
- Weather data (temperature, rainfall, humidity)
- Soil type and quality
- Crop variety
- Sowing date
- Irrigation type
- Historical yields
- Disease/pest incidents

### Model Architecture
```
Input Features → Feature Engineering → XGBoost/Random Forest → Yield Estimate
                                                            → Confidence Interval
```

### Output
```json
{
  "predictedYield": 4500,
  "unit": "kg/hectare",
  "confidence": {
    "low": 4000,
    "high": 5000
  },
  "comparisonToLastYear": "+12%",
  "comparisonToRegionalAvg": "+8%",
  "factors": {
    "positive": ["good_rainfall", "healthy_ndvi", "timely_sowing"],
    "negative": ["pest_pressure_moderate"]
  }
}
```

### API Endpoints
```
GET /api/farms/{farmId}/yield/prediction
GET /api/farms/{farmId}/yield/history
GET /api/farms/{farmId}/yield/factors
```

---

## 6. Crop Detection & Growth Tracking

### Overview
AI-powered automatic detection of crop type and growth stage from satellite imagery.

### Supported Crops (India Focus)
- **Cereals**: Rice, Wheat, Maize, Bajra, Jowar
- **Pulses**: Chickpea, Pigeon Pea, Moong, Urad
- **Oilseeds**: Soybean, Groundnut, Mustard, Sunflower
- **Cash Crops**: Cotton, Sugarcane, Tobacco
- **Vegetables**: Potato, Tomato, Onion, Chilli
- **Fruits**: Mango, Banana, Citrus, Grapes

### Growth Stages
1. **Germination** (0-10 days)
2. **Seedling** (10-25 days)
3. **Vegetative** (25-60 days)
4. **Flowering** (60-80 days)
5. **Fruit Development** (80-100 days)
6. **Maturity** (100-120 days)
7. **Harvest Ready** (120+ days)

### Detection Method
Uses Amazon Bedrock (Claude 3.5 Sonnet) vision capabilities to analyze satellite imagery and identify:
- Crop type based on spectral signature
- Growth stage based on canopy development
- Anomalies (gaps, disease patches, waterlogging)

### API Endpoints
```
GET /api/farms/{farmId}/crop/detect
GET /api/farms/{farmId}/crop/growth-stage
GET /api/farms/{farmId}/crop/timeline
```

---

## 7. Historical Analysis

### Overview
Access to 20+ years of satellite and weather data for trend analysis and pattern recognition.

### Available Analysis
- **NDVI Trends**: Year-over-year vegetation health comparison
- **Weather Patterns**: Seasonal rainfall, temperature trends
- **Yield History**: Historical productivity analysis
- **Best Practices**: Identify optimal sowing windows, irrigation patterns

### Data Range
- **Satellite**: 2015 - Present (Sentinel-2)
- **Weather**: 1940 - Present (Open-Meteo Archive)

### API Endpoints
```
GET /api/farms/{farmId}/history/ndvi?years=5
GET /api/farms/{farmId}/history/weather?years=10
GET /api/farms/{farmId}/history/yields
GET /api/farms/{farmId}/history/insights
```

---

## 8. Data Sources & APIs

### Satellite Data (FREE)

| Source | Data | Resolution | Cost |
|--------|------|------------|------|
| AWS Open Data | Sentinel-2 L2A COGs | 10-20m | Free |
| Element84 STAC | Scene Search API | - | Free |

### Weather Data (FREE)

| Source | Data | Coverage | Cost |
|--------|------|----------|------|
| Open-Meteo | Forecast + Historical | Global | Free |
| Open-Meteo Archive | 1940-Present | Global | Free |

### AI/ML Services (AWS)

| Service | Use Case | Cost Model |
|---------|----------|------------|
| Amazon Bedrock | Vision analysis, Advisories | Per token |
| Amazon SageMaker | Yield prediction | Per hour |

---

## 9. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FREE DATA SOURCES                          │
├─────────────────────────────────────────────────────────────────┤
│  AWS Open Data       Open-Meteo        Element84 STAC          │
│  (Sentinel-2)        (Weather)         (Scene Search)          │
└────────┬─────────────────┬─────────────────┬────────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AWS LAMBDA                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Satellite  │  │   Weather   │  │   Disease   │             │
│  │   Service   │  │   Service   │  │   Service   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Irrigation  │  │    Yield    │  │    Crop     │             │
│  │   Service   │  │   Service   │  │  Detection  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS SERVICES                               │
├─────────────────────────────────────────────────────────────────┤
│  DynamoDB        S3              Bedrock         EventBridge   │
│  (Data)          (Images)        (AI)            (Scheduler)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Cost Analysis

### Monthly Cost Estimate (100 Farms)

| Component | Cost |
|-----------|------|
| **External Data Sources** | |
| Satellite Data (AWS Open Data) | $0 |
| Weather API (Open-Meteo) | $0 |
| **AWS Services** | |
| Lambda (compute) | $5-15 |
| DynamoDB (storage) | $5-10 |
| S3 (image storage) | $2-5 |
| API Gateway | $3-5 |
| Bedrock (AI analysis) | $10-30 |
| EventBridge (scheduling) | $1-2 |
| **External Services** | |
| Twilio (WhatsApp) | $10-50 |
| **Total** | **$36-117/month** |

### Cost Optimization Tips
1. Use DynamoDB on-demand pricing for variable workloads
2. Enable S3 Intelligent Tiering for image storage
3. Cache satellite and weather data to reduce API calls
4. Use Lambda Provisioned Concurrency only for latency-critical endpoints

---

## API Reference

### Base URL
```
https://api.greensentinel.in/v1
```

### Authentication
All API requests require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Rate Limits
- Standard: 100 requests/minute
- Satellite: 10 requests/minute (due to processing time)
- Weather: 60 requests/minute

### Error Codes
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Try again later |

---

## Changelog

### v2.0.0 (Current)
- Added multiple vegetation indices (NDVI, NDWI, NDMI, EVI, SAVI)
- Integrated free satellite data from AWS Open Data
- Added weather intelligence with Open-Meteo
- Implemented disease & pest forecasting
- Added irrigation modeling
- Added yield prediction
- Added crop type detection
- Added historical analysis (20+ years)

### v1.0.0
- Basic threat detection (fire, human, animal)
- WhatsApp alerts
- Basic NDVI from Sentinel Hub (paid)
