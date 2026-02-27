/**
 * Green Sentinel - Farmer-Friendly Translations
 *
 * Converts technical agricultural metrics into simple,
 * actionable language that farmers can understand.
 */

export interface FarmerAdvice {
  status: 'good' | 'attention' | 'urgent';
  title: string;
  message: string;
  action?: string;
  color: string;
  bgColor: string;
}

// =============================================================================
// HEALTH SCORE TRANSLATIONS
// =============================================================================

export function getHealthAdvice(score: number, lang: string = 'en'): FarmerAdvice {
  const translations = {
    en: {
      excellent: {
        title: 'Crops Look Great!',
        message: 'Your plants are healthy and growing well. Keep up the good work!',
        action: 'Continue current care routine',
      },
      good: {
        title: 'Crops Are Healthy',
        message: 'Plants are doing fine. Check water and watch for pests.',
        action: 'Regular check recommended',
      },
      attention: {
        title: 'Needs Attention',
        message: 'Plants may need water or nutrients. Check soil and leaves.',
        action: 'Water plants today',
      },
      poor: {
        title: 'Immediate Care Needed',
        message: 'Plants are stressed! Check for disease, water shortage, or pests.',
        action: 'Inspect crops now',
      },
    },
    hi: {
      excellent: {
        title: 'फसल बहुत अच्छी है!',
        message: 'आपके पौधे स्वस्थ हैं और अच्छी तरह बढ़ रहे हैं।',
        action: 'देखभाल जारी रखें',
      },
      good: {
        title: 'फसल स्वस्थ है',
        message: 'पौधे ठीक हैं। पानी और कीटों की जांच करें।',
        action: 'नियमित जांच करें',
      },
      attention: {
        title: 'ध्यान दें',
        message: 'पौधों को पानी या पोषण की जरूरत हो सकती है।',
        action: 'आज पानी दें',
      },
      poor: {
        title: 'तुरंत देखभाल जरूरी',
        message: 'पौधे तनाव में हैं! बीमारी, पानी की कमी जांचें।',
        action: 'अभी फसल देखें',
      },
    },
    kn: {
      excellent: {
        title: 'ಬೆಳೆ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ!',
        message: 'ನಿಮ್ಮ ಸಸ್ಯಗಳು ಆರೋಗ್ಯಕರವಾಗಿ ಬೆಳೆಯುತ್ತಿವೆ.',
        action: 'ಆರೈಕೆ ಮುಂದುವರಿಸಿ',
      },
      good: {
        title: 'ಬೆಳೆ ಆರೋಗ್ಯಕರ',
        message: 'ಸಸ್ಯಗಳು ಚೆನ್ನಾಗಿವೆ. ನೀರು ಮತ್ತು ಕೀಟಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.',
        action: 'ನಿಯಮಿತ ತಪಾಸಣೆ',
      },
      attention: {
        title: 'ಗಮನ ಬೇಕು',
        message: 'ಸಸ್ಯಗಳಿಗೆ ನೀರು ಅಥವಾ ಪೋಷಕಾಂಶ ಬೇಕಾಗಬಹುದು.',
        action: 'ಇಂದು ನೀರು ಕೊಡಿ',
      },
      poor: {
        title: 'ತಕ್ಷಣ ಆರೈಕೆ ಬೇಕು',
        message: 'ಸಸ್ಯಗಳು ಒತ್ತಡದಲ್ಲಿವೆ! ರೋಗ, ನೀರಿನ ಕೊರತೆ ಪರಿಶೀಲಿಸಿ.',
        action: 'ಈಗಲೇ ಬೆಳೆ ನೋಡಿ',
      },
    },
  };

  const t = translations[lang as keyof typeof translations] || translations.en;

  if (score >= 80) {
    return { status: 'good', ...t.excellent, color: 'text-green-700', bgColor: 'bg-green-50' };
  } else if (score >= 60) {
    return { status: 'good', ...t.good, color: 'text-green-600', bgColor: 'bg-green-50' };
  } else if (score >= 40) {
    return { status: 'attention', ...t.attention, color: 'text-yellow-700', bgColor: 'bg-yellow-50' };
  } else {
    return { status: 'urgent', ...t.poor, color: 'text-red-700', bgColor: 'bg-red-50' };
  }
}

// =============================================================================
// NDVI EXPLANATION
// =============================================================================

export function getNdviExplanation(ndvi: number, lang: string = 'en'): string {
  const translations = {
    en: {
      veryHealthy: '🌿 Very green and healthy - crops are thriving!',
      healthy: '🌱 Good greenness - plants are doing well',
      moderate: '🌾 Moderate - may need more water or nutrients',
      stressed: '🍂 Plants look stressed - check water and soil',
      poor: '⚠️ Very low greenness - urgent attention needed',
    },
    hi: {
      veryHealthy: '🌿 बहुत हरा और स्वस्थ - फसल बढ़िया है!',
      healthy: '🌱 अच्छी हरियाली - पौधे अच्छे हैं',
      moderate: '🌾 मध्यम - पानी या पोषण चाहिए',
      stressed: '🍂 पौधे तनाव में - पानी और मिट्टी जांचें',
      poor: '⚠️ बहुत कम हरियाली - तुरंत ध्यान दें',
    },
    kn: {
      veryHealthy: '🌿 ತುಂಬಾ ಹಸಿರು ಮತ್ತು ಆರೋಗ್ಯಕರ!',
      healthy: '🌱 ಒಳ್ಳೆಯ ಹಸಿರು - ಸಸ್ಯಗಳು ಚೆನ್ನಾಗಿವೆ',
      moderate: '🌾 ಮಧ್ಯಮ - ನೀರು ಅಥವಾ ಪೋಷಕಾಂಶ ಬೇಕು',
      stressed: '🍂 ಸಸ್ಯಗಳು ಒತ್ತಡದಲ್ಲಿವೆ - ನೀರು ಪರಿಶೀಲಿಸಿ',
      poor: '⚠️ ತುಂಬಾ ಕಡಿಮೆ ಹಸಿರು - ತಕ್ಷಣ ಗಮನಿಸಿ',
    },
  };

  const t = translations[lang as keyof typeof translations] || translations.en;

  if (ndvi >= 0.7) return t.veryHealthy;
  if (ndvi >= 0.5) return t.healthy;
  if (ndvi >= 0.3) return t.moderate;
  if (ndvi >= 0.2) return t.stressed;
  return t.poor;
}

// =============================================================================
// TECHNICAL TERM EXPLANATIONS (for tooltips)
// =============================================================================

export interface TermExplanation {
  simple: string;
  detail: string;
}

export function getTermExplanation(term: string, lang: string = 'en'): TermExplanation {
  const explanations: Record<string, Record<string, TermExplanation>> = {
    en: {
      ndvi: {
        simple: 'Plant Greenness',
        detail: 'Measures how green and healthy your crops are using satellite photos. Higher = healthier plants.',
      },
      healthScore: {
        simple: 'Crop Condition',
        detail: 'Overall health of your crops from 0-100. Above 60 is good, below 40 needs attention.',
      },
      diseaseRisk: {
        simple: 'Sickness Chance',
        detail: 'How likely your crops are to get sick based on weather and conditions.',
      },
      pestRisk: {
        simple: 'Bug Danger',
        detail: 'Chance of insects or pests attacking your crops. Higher means more danger.',
      },
      ndwi: {
        simple: 'Water in Plants',
        detail: 'Shows how much water your plants have. Low means they need watering.',
      },
      lai: {
        simple: 'Leaf Coverage',
        detail: 'How much leaf area your plants have. More leaves usually means better growth.',
      },
      soilMoisture: {
        simple: 'Soil Wetness',
        detail: 'How wet or dry your soil is. Helps you know when to water.',
      },
      evapotranspiration: {
        simple: 'Water Loss',
        detail: 'How much water plants use and lose each day. Helps plan irrigation.',
      },
    },
    hi: {
      ndvi: {
        simple: 'पौधों की हरियाली',
        detail: 'उपग्रह तस्वीरों से पौधों की हरियाली मापता है। अधिक = स्वस्थ पौधे।',
      },
      healthScore: {
        simple: 'फसल की स्थिति',
        detail: 'आपकी फसल का स्वास्थ्य 0-100। 60 से ऊपर अच्छा है।',
      },
      diseaseRisk: {
        simple: 'बीमारी का खतरा',
        detail: 'मौसम के आधार पर फसल के बीमार होने की संभावना।',
      },
      pestRisk: {
        simple: 'कीट का खतरा',
        detail: 'कीड़ों द्वारा फसल पर हमले की संभावना।',
      },
      ndwi: {
        simple: 'पौधों में पानी',
        detail: 'दिखाता है कि पौधों में कितना पानी है।',
      },
      lai: {
        simple: 'पत्ती का क्षेत्र',
        detail: 'पौधों में कितनी पत्तियां हैं।',
      },
      soilMoisture: {
        simple: 'मिट्टी की नमी',
        detail: 'मिट्टी कितनी गीली या सूखी है।',
      },
      evapotranspiration: {
        simple: 'पानी की खपत',
        detail: 'पौधे रोज़ाना कितना पानी इस्तेमाल करते हैं।',
      },
    },
    kn: {
      ndvi: {
        simple: 'ಸಸ್ಯ ಹಸಿರು',
        detail: 'ಉಪಗ್ರಹ ಚಿತ್ರಗಳಿಂದ ಸಸ್ಯಗಳ ಆರೋಗ್ಯ ಅಳೆಯುತ್ತದೆ.',
      },
      healthScore: {
        simple: 'ಬೆಳೆ ಸ್ಥಿತಿ',
        detail: 'ನಿಮ್ಮ ಬೆಳೆಯ ಒಟ್ಟಾರೆ ಆರೋಗ್ಯ 0-100.',
      },
      diseaseRisk: {
        simple: 'ರೋಗ ಅಪಾಯ',
        detail: 'ಹವಾಮಾನ ಆಧರಿಸಿ ಬೆಳೆ ಅನಾರೋಗ್ಯದ ಸಾಧ್ಯತೆ.',
      },
      pestRisk: {
        simple: 'ಕೀಟ ಅಪಾಯ',
        detail: 'ಕೀಟಗಳಿಂದ ಬೆಳೆಗೆ ಹಾನಿ ಆಗುವ ಸಾಧ್ಯತೆ.',
      },
      ndwi: {
        simple: 'ಸಸ್ಯಗಳಲ್ಲಿ ನೀರು',
        detail: 'ಸಸ್ಯಗಳಲ್ಲಿ ಎಷ್ಟು ನೀರಿದೆ ಎಂದು ತೋರಿಸುತ್ತದೆ.',
      },
      lai: {
        simple: 'ಎಲೆ ಪ್ರದೇಶ',
        detail: 'ಸಸ್ಯಗಳಲ್ಲಿ ಎಷ್ಟು ಎಲೆಗಳಿವೆ.',
      },
      soilMoisture: {
        simple: 'ಮಣ್ಣಿನ ತೇವಾಂಶ',
        detail: 'ಮಣ್ಣು ಎಷ್ಟು ಒದ್ದೆ ಅಥವಾ ಒಣಗಿದೆ.',
      },
      evapotranspiration: {
        simple: 'ನೀರಿನ ಬಳಕೆ',
        detail: 'ಸಸ್ಯಗಳು ದಿನಕ್ಕೆ ಎಷ್ಟು ನೀರು ಬಳಸುತ್ತವೆ.',
      },
    },
  };

  const langExplanations = explanations[lang] || explanations.en;
  return langExplanations[term] || { simple: term, detail: '' };
}

// =============================================================================
// IRRIGATION ADVICE
// =============================================================================

export function getIrrigationAdvice(
  soilMoisture: number,
  forecast: { rain: boolean; temperature: number },
  lang: string = 'en'
): FarmerAdvice {
  const translations = {
    en: {
      waterNow: {
        title: 'Water Your Crops Now',
        message: 'Soil is dry. Your plants need water today.',
        action: 'Start irrigation',
      },
      waitForRain: {
        title: 'Rain Coming Soon',
        message: 'Rain expected. Save water and wait.',
        action: 'Skip watering today',
      },
      soilOk: {
        title: 'Soil Has Good Moisture',
        message: 'Plants have enough water for now.',
        action: 'Check again tomorrow',
      },
      tooWet: {
        title: 'Soil Too Wet',
        message: 'No watering needed. Let soil dry a bit.',
        action: 'Check drainage',
      },
    },
    hi: {
      waterNow: {
        title: 'अभी पानी दें',
        message: 'मिट्टी सूखी है। पौधों को आज पानी चाहिए।',
        action: 'सिंचाई शुरू करें',
      },
      waitForRain: {
        title: 'बारिश आने वाली है',
        message: 'बारिश की उम्मीद है। पानी बचाएं।',
        action: 'आज पानी न दें',
      },
      soilOk: {
        title: 'मिट्टी में नमी है',
        message: 'पौधों के पास अभी पर्याप्त पानी है।',
        action: 'कल फिर जांचें',
      },
      tooWet: {
        title: 'मिट्टी बहुत गीली है',
        message: 'पानी की जरूरत नहीं। सूखने दें।',
        action: 'जल निकासी जांचें',
      },
    },
    kn: {
      waterNow: {
        title: 'ಈಗ ನೀರು ಕೊಡಿ',
        message: 'ಮಣ್ಣು ಒಣಗಿದೆ. ಇಂದು ಸಸ್ಯಗಳಿಗೆ ನೀರು ಬೇಕು.',
        action: 'ನೀರಾವರಿ ಪ್ರಾರಂಭಿಸಿ',
      },
      waitForRain: {
        title: 'ಮಳೆ ಬರುತ್ತಿದೆ',
        message: 'ಮಳೆ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ. ನೀರು ಉಳಿಸಿ.',
        action: 'ಇಂದು ನೀರು ಬೇಡ',
      },
      soilOk: {
        title: 'ಮಣ್ಣಿನಲ್ಲಿ ಒಳ್ಳೆಯ ತೇವಾಂಶ',
        message: 'ಸಸ್ಯಗಳಿಗೆ ಈಗ ಸಾಕಷ್ಟು ನೀರಿದೆ.',
        action: 'ನಾಳೆ ಮತ್ತೆ ಪರಿಶೀಲಿಸಿ',
      },
      tooWet: {
        title: 'ಮಣ್ಣು ತುಂಬಾ ಒದ್ದೆ',
        message: 'ನೀರು ಬೇಕಾಗಿಲ್ಲ. ಒಣಗಲು ಬಿಡಿ.',
        action: 'ನೀರು ಹೋಗುವಿಕೆ ಪರಿಶೀಲಿಸಿ',
      },
    },
  };

  const t = translations[lang as keyof typeof translations] || translations.en;

  if (soilMoisture < 30) {
    if (forecast.rain) {
      return { status: 'attention', ...t.waitForRain, color: 'text-blue-700', bgColor: 'bg-blue-50' };
    }
    return { status: 'urgent', ...t.waterNow, color: 'text-orange-700', bgColor: 'bg-orange-50' };
  } else if (soilMoisture > 70) {
    return { status: 'good', ...t.tooWet, color: 'text-blue-700', bgColor: 'bg-blue-50' };
  } else {
    return { status: 'good', ...t.soilOk, color: 'text-green-700', bgColor: 'bg-green-50' };
  }
}

// =============================================================================
// RISK LEVEL TRANSLATIONS
// =============================================================================

export function getRiskLabel(risk: number, lang: string = 'en'): { label: string; advice: string } {
  const translations = {
    en: {
      veryLow: { label: 'Safe', advice: 'No action needed' },
      low: { label: 'Low Risk', advice: 'Monitor regularly' },
      medium: { label: 'Moderate', advice: 'Keep watching closely' },
      high: { label: 'High Risk', advice: 'Take preventive action' },
      critical: { label: 'Danger!', advice: 'Act immediately' },
    },
    hi: {
      veryLow: { label: 'सुरक्षित', advice: 'कार्रवाई की जरूरत नहीं' },
      low: { label: 'कम खतरा', advice: 'नियमित निगरानी करें' },
      medium: { label: 'मध्यम', advice: 'ध्यान से देखें' },
      high: { label: 'उच्च खतरा', advice: 'निवारक कार्रवाई करें' },
      critical: { label: 'खतरा!', advice: 'तुरंत कार्रवाई करें' },
    },
    kn: {
      veryLow: { label: 'ಸುರಕ್ಷಿತ', advice: 'ಕ್ರಮ ಅಗತ್ಯವಿಲ್ಲ' },
      low: { label: 'ಕಡಿಮೆ ಅಪಾಯ', advice: 'ನಿಯಮಿತವಾಗಿ ಮೇಲ್ವಿಚಾರಣೆ' },
      medium: { label: 'ಮಧ್ಯಮ', advice: 'ಹತ್ತಿರದಿಂದ ನೋಡಿ' },
      high: { label: 'ಹೆಚ್ಚಿನ ಅಪಾಯ', advice: 'ತಡೆಗಟ್ಟುವ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಿ' },
      critical: { label: 'ಅಪಾಯ!', advice: 'ತಕ್ಷಣ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಿ' },
    },
  };

  const t = translations[lang as keyof typeof translations] || translations.en;

  if (risk <= 20) return t.veryLow;
  if (risk <= 40) return t.low;
  if (risk <= 60) return t.medium;
  if (risk <= 80) return t.high;
  return t.critical;
}

// =============================================================================
// SIMPLE ACTION CARDS DATA
// =============================================================================

export interface ActionCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  link: string;
  urgent?: boolean;
}

export function getActionCards(
  _healthScore: number, // Reserved for future health-based actions
  alertCount: number,
  soilMoisture: number,
  lang: string = 'en'
): ActionCard[] {
  const translations = {
    en: {
      checkCrops: { title: 'Check Crops', subtitle: 'Take a photo to scan for problems' },
      waterNow: { title: 'Water Now', subtitle: 'Soil is dry - plants need water' },
      waterOk: { title: 'Watering', subtitle: 'Check irrigation schedule' },
      viewAlerts: { title: 'View Alerts', subtitle: `${alertCount} warnings to check` },
      allClear: { title: 'All Clear', subtitle: 'No warnings right now' },
      getHelp: { title: 'Get Help', subtitle: 'Call farming expert' },
    },
    hi: {
      checkCrops: { title: 'फसल जांचें', subtitle: 'समस्या के लिए फोटो लें' },
      waterNow: { title: 'अभी पानी दें', subtitle: 'मिट्टी सूखी है' },
      waterOk: { title: 'सिंचाई', subtitle: 'सिंचाई शेड्यूल देखें' },
      viewAlerts: { title: 'चेतावनियां देखें', subtitle: `${alertCount} चेतावनियां` },
      allClear: { title: 'सब ठीक', subtitle: 'कोई चेतावनी नहीं' },
      getHelp: { title: 'मदद लें', subtitle: 'विशेषज्ञ को कॉल करें' },
    },
    kn: {
      checkCrops: { title: 'ಬೆಳೆ ಪರಿಶೀಲಿಸಿ', subtitle: 'ಸಮಸ್ಯೆಗಳಿಗೆ ಫೋಟೋ ತೆಗೆಯಿರಿ' },
      waterNow: { title: 'ಈಗ ನೀರು ಕೊಡಿ', subtitle: 'ಮಣ್ಣು ಒಣಗಿದೆ' },
      waterOk: { title: 'ನೀರಾವರಿ', subtitle: 'ನೀರಾವರಿ ವೇಳಾಪಟ್ಟಿ ನೋಡಿ' },
      viewAlerts: { title: 'ಎಚ್ಚರಿಕೆಗಳು', subtitle: `${alertCount} ಎಚ್ಚರಿಕೆಗಳು` },
      allClear: { title: 'ಎಲ್ಲಾ ಸರಿ', subtitle: 'ಯಾವುದೇ ಎಚ್ಚರಿಕೆ ಇಲ್ಲ' },
      getHelp: { title: 'ಸಹಾಯ ಪಡೆಯಿರಿ', subtitle: 'ತಜ್ಞರಿಗೆ ಕರೆ ಮಾಡಿ' },
    },
  };

  const t = translations[lang as keyof typeof translations] || translations.en;
  const cards: ActionCard[] = [];

  // Scan for disease card
  cards.push({
    id: 'scan',
    icon: '📷',
    ...t.checkCrops,
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    link: '/scanner',
  });

  // Water card - urgent if soil is dry
  if (soilMoisture < 40) {
    cards.push({
      id: 'water',
      icon: '💧',
      ...t.waterNow,
      color: 'text-orange-700',
      bgColor: 'bg-orange-50 border-orange-200',
      link: '/irrigation',
      urgent: true,
    });
  } else {
    cards.push({
      id: 'water',
      icon: '💧',
      ...t.waterOk,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
      link: '/irrigation',
    });
  }

  // Alerts card
  if (alertCount > 0) {
    cards.push({
      id: 'alerts',
      icon: '⚠️',
      ...t.viewAlerts,
      color: 'text-red-700',
      bgColor: 'bg-red-50 border-red-200',
      link: '/threats',
      urgent: true,
    });
  } else {
    cards.push({
      id: 'alerts',
      icon: '✅',
      ...t.allClear,
      color: 'text-green-700',
      bgColor: 'bg-green-50 border-green-200',
      link: '/threats',
    });
  }

  // Help card
  cards.push({
    id: 'help',
    icon: '📞',
    ...t.getHelp,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    link: 'tel:1800-180-1551',
  });

  return cards;
}
