/**
 * Green Sentinel - Disease & Pest Forecast Service
 *
 * Predicts disease and pest risks based on weather conditions
 */

import { WeatherData } from './weatherService';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DiseaseRisk {
  diseaseId: string;
  name: string;
  localName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  probability: number;
  affectedCrops: string[];
  triggers: string[];
  symptoms: string[];
  preventiveActions: string[];
  curativeActions: string[];
}

export interface PestRisk {
  pestId: string;
  name: string;
  localName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  affectedCrops: string[];
  triggers: string[];
  identificationTips: string[];
  controlMeasures: { type: string; description: string; effectiveness: number }[];
}

export interface DiseaseForecast {
  diseases: DiseaseRisk[];
  pests: PestRisk[];
  overallRiskLevel: RiskLevel;
  advisories: string[];
  generatedAt: string;
}

// Disease configurations
const DISEASE_CONFIG = {
  late_blight: {
    name: 'Late Blight',
    localName: 'झुलसा रोग',
    affectedCrops: ['potato', 'tomato'],
    symptoms: ['Water-soaked lesions', 'White fuzzy growth', 'Brown/black spots on leaves'],
    preventiveActions: ['Apply preventive fungicide', 'Improve air circulation', 'Remove infected debris'],
    curativeActions: ['Apply systemic fungicide', 'Remove infected plants', 'Spray Mancozeb/Metalaxyl'],
  },
  powdery_mildew: {
    name: 'Powdery Mildew',
    localName: 'चूर्णिल आसिता',
    affectedCrops: ['wheat', 'grapes', 'peas', 'cucurbits'],
    symptoms: ['White powdery coating on leaves', 'Curled/distorted leaves', 'Yellowing'],
    preventiveActions: ['Apply sulfur-based fungicide', 'Maintain plant spacing'],
    curativeActions: ['Spray Myclobutanil', 'Remove heavily infected leaves'],
  },
  downy_mildew: {
    name: 'Downy Mildew',
    localName: 'मृदुरोमिल आसिता',
    affectedCrops: ['grapes', 'cucurbits', 'onion'],
    symptoms: ['Yellow patches on upper leaf', 'Gray-purple fuzz underneath', 'Leaf drop'],
    preventiveActions: ['Apply copper fungicide', 'Avoid overhead irrigation'],
    curativeActions: ['Spray Metalaxyl', 'Improve drainage'],
  },
  rust: {
    name: 'Rust',
    localName: 'गेरुई',
    affectedCrops: ['wheat', 'pulses', 'coffee'],
    symptoms: ['Orange-brown pustules', 'Yellow streaks', 'Premature leaf death'],
    preventiveActions: ['Plant resistant varieties', 'Remove volunteer plants'],
    curativeActions: ['Apply Propiconazole', 'Early harvest if severe'],
  },
  bacterial_wilt: {
    name: 'Bacterial Wilt',
    localName: 'जीवाणु म्लानि',
    affectedCrops: ['tomato', 'potato', 'brinjal', 'chili'],
    symptoms: ['Sudden wilting', 'No yellowing before wilt', 'Brown vascular tissue'],
    preventiveActions: ['Use disease-free seeds', 'Crop rotation', 'Improve drainage'],
    curativeActions: ['Remove infected plants', 'Solarize soil', 'No effective chemical control'],
  },
};

const PEST_CONFIG = {
  fall_armyworm: {
    name: 'Fall Armyworm',
    localName: 'फॉल आर्मीवर्म',
    affectedCrops: ['maize', 'rice', 'sugarcane', 'sorghum'],
    identificationTips: ['Windowpane feeding on leaves', 'Larvae in leaf whorl', 'Inverted Y on head'],
    controlMeasures: [
      { type: 'biological', description: 'Release Trichogramma wasps', effectiveness: 70 },
      { type: 'chemical', description: 'Spray Emamectin benzoate', effectiveness: 85 },
      { type: 'mechanical', description: 'Apply sand+lime in whorl', effectiveness: 60 },
    ],
  },
  aphids: {
    name: 'Aphids',
    localName: 'माहू',
    affectedCrops: ['wheat', 'mustard', 'cotton', 'vegetables'],
    identificationTips: ['Small soft-bodied insects', 'Clustered on new growth', 'Sticky honeydew'],
    controlMeasures: [
      { type: 'biological', description: 'Encourage ladybirds/lacewings', effectiveness: 65 },
      { type: 'chemical', description: 'Spray Imidacloprid', effectiveness: 80 },
      { type: 'organic', description: 'Neem oil spray', effectiveness: 55 },
    ],
  },
  whitefly: {
    name: 'Whitefly',
    localName: 'सफेद मक्खी',
    affectedCrops: ['cotton', 'tomato', 'brinjal', 'okra'],
    identificationTips: ['Tiny white flying insects', 'Found under leaves', 'Sooty mold on leaves'],
    controlMeasures: [
      { type: 'biological', description: 'Release Encarsia wasps', effectiveness: 60 },
      { type: 'chemical', description: 'Spray Spiromesifen', effectiveness: 75 },
      { type: 'trap', description: 'Yellow sticky traps', effectiveness: 50 },
    ],
  },
  stem_borer: {
    name: 'Stem Borer',
    localName: 'तना छेदक',
    affectedCrops: ['rice', 'sugarcane', 'maize'],
    identificationTips: ['Dead hearts in vegetative stage', 'White ears at flowering', 'Bore holes in stem'],
    controlMeasures: [
      { type: 'biological', description: 'Release Trichogramma', effectiveness: 65 },
      { type: 'chemical', description: 'Apply Cartap hydrochloride', effectiveness: 80 },
      { type: 'cultural', description: 'Remove crop stubbles', effectiveness: 45 },
    ],
  },
  bollworm: {
    name: 'Bollworm',
    localName: 'गुलाबी सुंडी',
    affectedCrops: ['cotton', 'chickpea', 'tomato'],
    identificationTips: ['Holes in bolls/fruits', 'Frass near entry holes', 'Damaged squares'],
    controlMeasures: [
      { type: 'biological', description: 'Release Trichogramma', effectiveness: 60 },
      { type: 'chemical', description: 'Spray Indoxacarb', effectiveness: 85 },
      { type: 'trap', description: 'Pheromone traps', effectiveness: 50 },
    ],
  },
};

/**
 * Calculate disease and pest risks based on weather
 */
export function calculateDiseaseForecast(
  weather: WeatherData,
  cropType: string
): DiseaseForecast {
  const { current, daily } = weather;
  const diseases: DiseaseRisk[] = [];
  const pests: PestRisk[] = [];

  // Calculate average conditions
  const avgHumidity = current.humidity;
  const avgTemp = (daily[0]?.tempMax + daily[0]?.tempMin) / 2 || current.temperature;
  const recentRain = daily.slice(0, 3).reduce((sum, d) => sum + d.precipitation, 0);

  // Late Blight risk (potato, tomato)
  if (isAffected(cropType, DISEASE_CONFIG.late_blight.affectedCrops)) {
    let riskScore = 0;
    const triggers: string[] = [];

    if (avgHumidity >= 80) {
      riskScore += 35;
      triggers.push(`High humidity (${avgHumidity}%)`);
    }
    if (avgTemp >= 15 && avgTemp <= 25) {
      riskScore += 30;
      triggers.push(`Favorable temperature (${Math.round(avgTemp)}°C)`);
    }
    if (recentRain > 10) {
      riskScore += 25;
      triggers.push(`Recent rainfall (${Math.round(recentRain)}mm)`);
    }
    if (current.cloudCover > 70) {
      riskScore += 10;
    }

    diseases.push({
      diseaseId: 'late_blight',
      ...DISEASE_CONFIG.late_blight,
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      probability: Math.min(95, riskScore),
      triggers,
    });
  }

  // Powdery Mildew risk
  if (isAffected(cropType, DISEASE_CONFIG.powdery_mildew.affectedCrops)) {
    let riskScore = 0;
    const triggers: string[] = [];

    if (avgHumidity >= 50 && avgHumidity <= 80) {
      riskScore += 35;
      triggers.push(`Moderate humidity (${avgHumidity}%)`);
    }
    if (avgTemp >= 20 && avgTemp <= 30) {
      riskScore += 35;
      triggers.push(`Warm temperature (${Math.round(avgTemp)}°C)`);
    }
    if (recentRain < 5) {
      riskScore += 15;
      triggers.push('Dry conditions');
    }

    diseases.push({
      diseaseId: 'powdery_mildew',
      ...DISEASE_CONFIG.powdery_mildew,
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      probability: Math.min(95, riskScore),
      triggers,
    });
  }

  // Downy Mildew risk
  if (isAffected(cropType, DISEASE_CONFIG.downy_mildew.affectedCrops)) {
    let riskScore = 0;
    const triggers: string[] = [];

    if (avgHumidity >= 85) {
      riskScore += 40;
      triggers.push(`Very high humidity (${avgHumidity}%)`);
    }
    if (avgTemp >= 18 && avgTemp <= 24) {
      riskScore += 30;
      triggers.push(`Cool-warm temperature (${Math.round(avgTemp)}°C)`);
    }
    if (recentRain > 15) {
      riskScore += 20;
      triggers.push(`Wet conditions`);
    }

    diseases.push({
      diseaseId: 'downy_mildew',
      ...DISEASE_CONFIG.downy_mildew,
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      probability: Math.min(95, riskScore),
      triggers,
    });
  }

  // Rust risk
  if (isAffected(cropType, DISEASE_CONFIG.rust.affectedCrops)) {
    let riskScore = 0;
    const triggers: string[] = [];

    if (avgHumidity >= 75) {
      riskScore += 30;
      triggers.push(`High humidity (${avgHumidity}%)`);
    }
    if (avgTemp >= 15 && avgTemp <= 28) {
      riskScore += 35;
      triggers.push(`Moderate temperature (${Math.round(avgTemp)}°C)`);
    }
    if (recentRain > 5 && recentRain < 30) {
      riskScore += 20;
      triggers.push('Intermittent wet conditions');
    }

    diseases.push({
      diseaseId: 'rust',
      ...DISEASE_CONFIG.rust,
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      probability: Math.min(95, riskScore),
      triggers,
    });
  }

  // Fall Armyworm risk
  if (isAffected(cropType, PEST_CONFIG.fall_armyworm.affectedCrops)) {
    let riskScore = 0;
    const triggers: string[] = [];

    if (avgTemp >= 25 && avgTemp <= 35) {
      riskScore += 40;
      triggers.push(`Optimal temperature (${Math.round(avgTemp)}°C)`);
    }
    if (avgHumidity >= 60) {
      riskScore += 30;
      triggers.push(`Favorable humidity (${avgHumidity}%)`);
    }
    if (recentRain > 0 && recentRain < 30) {
      riskScore += 15;
    }

    pests.push({
      pestId: 'fall_armyworm',
      ...PEST_CONFIG.fall_armyworm,
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      triggers,
    });
  }

  // Aphids risk
  if (isAffected(cropType, PEST_CONFIG.aphids.affectedCrops)) {
    let riskScore = 0;
    const triggers: string[] = [];

    if (avgTemp >= 15 && avgTemp <= 25) {
      riskScore += 35;
      triggers.push(`Cool-moderate temperature (${Math.round(avgTemp)}°C)`);
    }
    if (avgHumidity >= 40 && avgHumidity <= 70) {
      riskScore += 35;
      triggers.push(`Moderate humidity (${avgHumidity}%)`);
    }
    if (current.windSpeed < 10) {
      riskScore += 15;
      triggers.push('Low wind conditions');
    }

    pests.push({
      pestId: 'aphids',
      ...PEST_CONFIG.aphids,
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      triggers,
    });
  }

  // Whitefly risk
  if (isAffected(cropType, PEST_CONFIG.whitefly.affectedCrops)) {
    let riskScore = 0;
    const triggers: string[] = [];

    if (avgTemp >= 28 && avgTemp <= 38) {
      riskScore += 40;
      triggers.push(`Hot temperature (${Math.round(avgTemp)}°C)`);
    }
    if (avgHumidity >= 50 && avgHumidity <= 80) {
      riskScore += 30;
      triggers.push(`Moderate humidity (${avgHumidity}%)`);
    }
    if (recentRain < 5) {
      riskScore += 15;
      triggers.push('Dry weather');
    }

    pests.push({
      pestId: 'whitefly',
      ...PEST_CONFIG.whitefly,
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      triggers,
    });
  }

  // Stem Borer risk
  if (isAffected(cropType, PEST_CONFIG.stem_borer.affectedCrops)) {
    let riskScore = 0;
    const triggers: string[] = [];

    if (avgTemp >= 25 && avgTemp <= 32) {
      riskScore += 35;
      triggers.push(`Favorable temperature (${Math.round(avgTemp)}°C)`);
    }
    if (avgHumidity >= 70) {
      riskScore += 30;
      triggers.push(`High humidity (${avgHumidity}%)`);
    }

    pests.push({
      pestId: 'stem_borer',
      ...PEST_CONFIG.stem_borer,
      riskLevel: getRiskLevel(riskScore),
      riskScore,
      triggers,
    });
  }

  // Sort by risk score
  diseases.sort((a, b) => b.riskScore - a.riskScore);
  pests.sort((a, b) => b.riskScore - a.riskScore);

  // Calculate overall risk
  const maxRisk = Math.max(
    ...diseases.map(d => d.riskScore),
    ...pests.map(p => p.riskScore),
    0
  );

  // Generate advisories
  const advisories: string[] = [];
  const highRiskDiseases = diseases.filter(d => d.riskLevel === 'high' || d.riskLevel === 'critical');
  const highRiskPests = pests.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical');

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
    diseases,
    pests,
    overallRiskLevel: getRiskLevel(maxRisk),
    advisories,
    generatedAt: new Date().toISOString(),
  };
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function isAffected(cropType: string, affectedCrops: string[]): boolean {
  const crop = cropType.toLowerCase();
  return affectedCrops.some(c => crop.includes(c) || c.includes(crop));
}
