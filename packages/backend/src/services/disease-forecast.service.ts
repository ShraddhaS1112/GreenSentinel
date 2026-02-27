/**
 * Green Sentinel - Disease & Pest Forecasting Service
 *
 * Predicts disease and pest risks based on weather conditions,
 * crop growth stage, and historical patterns.
 */

import {
  DiseaseAndPestForecast,
  DiseaseRisk,
  PestRisk,
  RiskLevel,
  GrowthStage,
  WeatherData,
  ControlMeasure,
} from '@green-sentinel/shared';

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate disease risk for a farm
 */
export async function calculateDiseaseRisk(
  farmId: string,
  cropType: string,
  growthStage: GrowthStage,
  weather: WeatherData
): Promise<DiseaseRisk[]> {
  const { current } = weather;
  const diseases: DiseaseRisk[] = [];

  // Late Blight risk calculation
  if (['potato', 'tomato'].includes(cropType.toLowerCase())) {
    let riskScore = 0;
    if (current.humidity >= 80) riskScore += 35;
    if (current.temperature >= 15 && current.temperature <= 25) riskScore += 30;
    if (current.precipitation > 0) riskScore += 25;

    diseases.push({
      diseaseId: 'late_blight',
      name: 'Late Blight',
      localName: 'झुलसा रोग',
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      probability: Math.min(95, riskScore),
      affectedCrops: ['potato', 'tomato'],
      triggers: current.humidity >= 80 ? [`High humidity (${current.humidity}%)`] : [],
      symptoms: ['Water-soaked lesions', 'White fuzzy growth', 'Brown/black spots'],
      preventiveActions: ['Apply preventive fungicide', 'Improve air circulation'],
      curativeActions: ['Apply systemic fungicide', 'Remove infected plants'],
      historicalIncidence: 0,
      neighborhoodAlerts: 0,
    });
  }

  // Powdery Mildew
  if (['wheat', 'grapes', 'peas'].includes(cropType.toLowerCase())) {
    let riskScore = 0;
    if (current.humidity >= 50 && current.humidity <= 80) riskScore += 35;
    if (current.temperature >= 20 && current.temperature <= 30) riskScore += 35;

    diseases.push({
      diseaseId: 'powdery_mildew',
      name: 'Powdery Mildew',
      localName: 'चूर्णिल आसिता',
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      probability: Math.min(95, riskScore),
      affectedCrops: ['wheat', 'grapes', 'peas'],
      triggers: [],
      symptoms: ['White powdery coating', 'Curled leaves'],
      preventiveActions: ['Apply sulfur-based fungicide'],
      curativeActions: ['Apply Myclobutanil'],
      historicalIncidence: 0,
      neighborhoodAlerts: 0,
    });
  }

  return diseases.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Calculate pest risk for a farm
 */
export async function calculatePestRisk(
  farmId: string,
  cropType: string,
  growthStage: GrowthStage,
  weather: WeatherData
): Promise<PestRisk[]> {
  const { current } = weather;
  const pests: PestRisk[] = [];

  // Fall Armyworm
  if (['maize', 'rice', 'sugarcane'].includes(cropType.toLowerCase())) {
    let riskScore = 0;
    if (current.temperature >= 25 && current.temperature <= 35) riskScore += 40;
    if (current.humidity >= 60) riskScore += 30;

    pests.push({
      pestId: 'fall_armyworm',
      name: 'Fall Armyworm',
      localName: 'फॉल आर्मीवर्म',
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      affectedCrops: ['maize', 'rice', 'sugarcane'],
      triggers: [`Temperature ${current.temperature}°C`],
      identificationTips: ['Windowpane feeding damage', 'Larvae in leaf whorl'],
      controlMeasures: [
        { type: 'biological', description: 'Release Trichogramma wasps', timing: 'Early', effectiveness: 70 },
        { type: 'chemical', description: 'Spray Emamectin benzoate', timing: 'When visible', effectiveness: 85 },
      ],
      economicThreshold: '5-10% plants with fresh damage',
    });
  }

  // Aphids
  if (['wheat', 'mustard', 'cotton'].includes(cropType.toLowerCase())) {
    let riskScore = 0;
    if (current.temperature >= 15 && current.temperature <= 25) riskScore += 35;
    if (current.humidity >= 40 && current.humidity <= 70) riskScore += 35;

    pests.push({
      pestId: 'aphids',
      name: 'Aphids',
      localName: 'माहू',
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      affectedCrops: ['wheat', 'mustard', 'cotton'],
      triggers: [],
      identificationTips: ['Soft-bodied insects on new growth', 'Sticky honeydew'],
      controlMeasures: [
        { type: 'biological', description: 'Encourage ladybirds', timing: 'Continuous', effectiveness: 65 },
        { type: 'chemical', description: 'Apply Imidacloprid', timing: 'At threshold', effectiveness: 80 },
      ],
      economicThreshold: '10-15 aphids per plant',
    });
  }

  return pests.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Generate complete disease and pest forecast
 */
export async function generateForecast(
  farmId: string,
  cropType: string,
  growthStage: GrowthStage,
  weather: WeatherData
): Promise<DiseaseAndPestForecast> {
  const diseases = await calculateDiseaseRisk(farmId, cropType, growthStage, weather);
  const pests = await calculatePestRisk(farmId, cropType, growthStage, weather);

  const maxRisk = Math.max(
    ...diseases.map(d => d.riskScore),
    ...pests.map(p => p.riskScore),
    0
  );

  const advisories: string[] = [];
  const highRiskDiseases = diseases.filter(d => d.riskLevel === RiskLevel.HIGH || d.riskLevel === RiskLevel.CRITICAL);
  const highRiskPests = pests.filter(p => p.riskLevel === RiskLevel.HIGH || p.riskLevel === RiskLevel.CRITICAL);

  for (const d of highRiskDiseases.slice(0, 2)) {
    advisories.push(`High ${d.name} risk: ${d.preventiveActions[0] || 'Monitor closely'}`);
  }
  for (const p of highRiskPests.slice(0, 2)) {
    advisories.push(`${p.name} alert: Scout fields regularly`);
  }
  if (advisories.length === 0) {
    advisories.push('Conditions favorable - continue regular monitoring');
  }

  return {
    farmId,
    cropType,
    growthStage,
    diseases,
    pests,
    overallRiskLevel: getRiskLevel(maxRisk),
    advisories,
    nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    generatedAt: new Date().toISOString(),
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function getRiskLevel(score: number): RiskLevel {
  if (score >= 85) return RiskLevel.CRITICAL;
  if (score >= 70) return RiskLevel.HIGH;
  if (score >= 50) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}
