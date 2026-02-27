/**
 * Green Sentinel - Preferences Store
 *
 * Zustand store for managing UI mode (Simple/Expert) and accessibility preferences.
 * Simple Mode: Large icons, color-coded indicators, voice alerts, local language
 * Expert Mode: Detailed NDVI data, charts, technical analysis
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

export type UIMode = 'simple' | 'expert';
export type Language = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'mr' | 'bn';

interface PreferencesState {
  // UI Mode
  uiMode: UIMode;

  // Accessibility
  largeText: boolean;
  highContrast: boolean;
  voiceGuidance: boolean;

  // Language
  language: Language;

  // Actions
  setUIMode: (mode: UIMode) => void;
  toggleUIMode: () => void;
  setLargeText: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setVoiceGuidance: (enabled: boolean) => void;
  setLanguage: (language: Language) => void;
}

// =============================================================================
// STORE
// =============================================================================

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state - default to Simple mode for accessibility
      uiMode: 'simple',
      largeText: false,
      highContrast: false,
      voiceGuidance: true,
      language: 'en',

      // Set UI mode
      setUIMode: (mode) => {
        set({ uiMode: mode });
      },

      // Toggle between Simple and Expert mode
      toggleUIMode: () => {
        const { uiMode } = get();
        set({ uiMode: uiMode === 'simple' ? 'expert' : 'simple' });
      },

      // Accessibility settings
      setLargeText: (enabled) => set({ largeText: enabled }),
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      setVoiceGuidance: (enabled) => set({ voiceGuidance: enabled }),

      // Language
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'green-sentinel-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// =============================================================================
// TRANSLATIONS
// =============================================================================

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Dashboard
    'dashboard.title': 'My Farm',
    'dashboard.cropHealth': 'Crop Health',
    'dashboard.healthy': 'Healthy',
    'dashboard.needsAttention': 'Needs Care',
    'dashboard.critical': 'Critical',
    'dashboard.alerts': 'Alerts',
    'dashboard.noAlerts': 'No alerts',
    'dashboard.weather': 'Weather',
    'dashboard.irrigation': 'Irrigation',
    'dashboard.scanDisease': 'Scan Disease',

    // Health status
    'health.excellent': 'Excellent',
    'health.good': 'Good',
    'health.moderate': 'Fair',
    'health.stressed': 'Stressed',
    'health.poor': 'Poor',

    // Actions
    'action.refresh': 'Refresh',
    'action.viewDetails': 'View Details',
    'action.takePhoto': 'Take Photo',
    'action.water': 'Water Plants',
    'action.call': 'Call Expert',

    // Alerts
    'alert.fire': 'Fire Warning',
    'alert.pest': 'Pest Alert',
    'alert.disease': 'Disease Found',
    'alert.drought': 'Low Water',
    'alert.intruder': 'Intruder Alert',

    // Settings
    'settings.title': 'Settings',
    'settings.simpleMode': 'Simple Mode',
    'settings.expertMode': 'Expert Mode',
    'settings.simpleModeDesc': 'Easy to understand, large icons',
    'settings.expertModeDesc': 'Detailed data and analysis',
    'settings.language': 'Language',
    'settings.voiceAlerts': 'Voice Alerts',

    // Voice messages
    'voice.cropHealthy': 'Your crops are healthy. Everything is fine.',
    'voice.needsWater': 'Your crops need water. Please irrigate soon.',
    'voice.diseaseAlert': 'Disease detected in your field. Please check immediately.',
    'voice.pestAlert': 'Pests found in your farm. Take action now.',
  },

  hi: {
    // Dashboard
    'dashboard.title': 'मेरा खेत',
    'dashboard.cropHealth': 'फसल स्वास्थ्य',
    'dashboard.healthy': 'स्वस्थ',
    'dashboard.needsAttention': 'देखभाल चाहिए',
    'dashboard.critical': 'गंभीर',
    'dashboard.alerts': 'सूचनाएं',
    'dashboard.noAlerts': 'कोई सूचना नहीं',
    'dashboard.weather': 'मौसम',
    'dashboard.irrigation': 'सिंचाई',
    'dashboard.scanDisease': 'रोग जांचें',

    // Health status
    'health.excellent': 'बहुत अच्छा',
    'health.good': 'अच्छा',
    'health.moderate': 'ठीक',
    'health.stressed': 'तनाव में',
    'health.poor': 'खराब',

    // Actions
    'action.refresh': 'ताज़ा करें',
    'action.viewDetails': 'विवरण देखें',
    'action.takePhoto': 'फोटो लें',
    'action.water': 'पानी दें',
    'action.call': 'विशेषज्ञ से बात करें',

    // Alerts
    'alert.fire': 'आग की चेतावनी',
    'alert.pest': 'कीट चेतावनी',
    'alert.disease': 'बीमारी मिली',
    'alert.drought': 'पानी कम है',
    'alert.intruder': 'घुसपैठिया सूचना',

    // Settings
    'settings.title': 'सेटिंग्स',
    'settings.simpleMode': 'सरल मोड',
    'settings.expertMode': 'विशेषज्ञ मोड',
    'settings.simpleModeDesc': 'समझने में आसान, बड़े आइकन',
    'settings.expertModeDesc': 'विस्तृत डेटा और विश्लेषण',
    'settings.language': 'भाषा',
    'settings.voiceAlerts': 'आवाज़ सूचनाएं',

    // Voice messages
    'voice.cropHealthy': 'आपकी फसल स्वस्थ है। सब कुछ ठीक है।',
    'voice.needsWater': 'आपकी फसल को पानी चाहिए। जल्द सिंचाई करें।',
    'voice.diseaseAlert': 'आपके खेत में बीमारी पाई गई। तुरंत जांचें।',
    'voice.pestAlert': 'आपके खेत में कीड़े मिले हैं। अभी कार्रवाई करें।',
  },

  kn: {
    // Dashboard
    'dashboard.title': 'ನನ್ನ ಹೊಲ',
    'dashboard.cropHealth': 'ಬೆಳೆ ಆರೋಗ್ಯ',
    'dashboard.healthy': 'ಆರೋಗ್ಯಕರ',
    'dashboard.needsAttention': 'ಕಾಳಜಿ ಬೇಕು',
    'dashboard.critical': 'ತುರ್ತು',
    'dashboard.alerts': 'ಎಚ್ಚರಿಕೆಗಳು',
    'dashboard.noAlerts': 'ಯಾವುದೇ ಎಚ್ಚರಿಕೆ ಇಲ್ಲ',
    'dashboard.weather': 'ಹವಾಮಾನ',
    'dashboard.irrigation': 'ನೀರಾವರಿ',
    'dashboard.scanDisease': 'ರೋಗ ಪರಿಶೀಲಿಸಿ',

    // Health status
    'health.excellent': 'ಅತ್ಯುತ್ತಮ',
    'health.good': 'ಒಳ್ಳೆಯದು',
    'health.moderate': 'ಸಮಾಧಾನ',
    'health.stressed': 'ಒತ್ತಡದಲ್ಲಿದೆ',
    'health.poor': 'ಕೆಟ್ಟದು',

    // Actions
    'action.refresh': 'ರಿಫ್ರೆಶ್',
    'action.viewDetails': 'ವಿವರಗಳನ್ನು ನೋಡಿ',
    'action.takePhoto': 'ಫೋಟೋ ತೆಗೆಯಿರಿ',
    'action.water': 'ನೀರು ಹಾಕಿ',
    'action.call': 'ತಜ್ಞರನ್ನು ಕರೆಯಿರಿ',

    // Alerts
    'alert.fire': 'ಬೆಂಕಿ ಎಚ್ಚರಿಕೆ',
    'alert.pest': 'ಕೀಟ ಎಚ್ಚರಿಕೆ',
    'alert.disease': 'ರೋಗ ಪತ್ತೆ',
    'alert.drought': 'ನೀರು ಕಡಿಮೆ',
    'alert.intruder': 'ಅನಧಿಕೃತ ಪ್ರವೇಶ',

    // Settings
    'settings.title': 'ಸೆಟ್ಟಿಂಗ್ಸ್',
    'settings.simpleMode': 'ಸರಳ ಮೋಡ್',
    'settings.expertMode': 'ತಜ್ಞ ಮೋಡ್',
    'settings.simpleModeDesc': 'ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸುಲಭ',
    'settings.expertModeDesc': 'ವಿವರವಾದ ಮಾಹಿತಿ',
    'settings.language': 'ಭಾಷೆ',
    'settings.voiceAlerts': 'ಧ್ವನಿ ಎಚ್ಚರಿಕೆ',

    // Voice messages
    'voice.cropHealthy': 'ನಿಮ್ಮ ಬೆಳೆ ಆರೋಗ್ಯಕರವಾಗಿದೆ. ಎಲ್ಲವೂ ಸರಿ ಇದೆ.',
    'voice.needsWater': 'ನಿಮ್ಮ ಬೆಳೆಗೆ ನೀರು ಬೇಕು. ಶೀಘ್ರ ನೀರಾವರಿ ಮಾಡಿ.',
    'voice.diseaseAlert': 'ನಿಮ್ಮ ಹೊಲದಲ್ಲಿ ರೋಗ ಪತ್ತೆಯಾಗಿದೆ. ತಕ್ಷಣ ಪರಿಶೀಲಿಸಿ.',
    'voice.pestAlert': 'ನಿಮ್ಮ ಹೊಲದಲ್ಲಿ ಕೀಟಗಳು ಕಂಡುಬಂದಿವೆ. ಈಗಲೇ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಿ.',
  },

  ta: {
    // Dashboard
    'dashboard.title': 'என் தோட்டம்',
    'dashboard.cropHealth': 'பயிர் ஆரோக்கியம்',
    'dashboard.healthy': 'ஆரோக்கியமான',
    'dashboard.needsAttention': 'கவனிப்பு தேவை',
    'dashboard.critical': 'அவசரம்',
    'dashboard.alerts': 'எச்சரிக்கைகள்',
    'dashboard.noAlerts': 'எச்சரிக்கை இல்லை',
    'dashboard.weather': 'வானிலை',
    'dashboard.irrigation': 'நீர்ப்பாசனம்',
    'dashboard.scanDisease': 'நோய் சோதனை',

    // Health status
    'health.excellent': 'சிறப்பு',
    'health.good': 'நல்லது',
    'health.moderate': 'சுமார்',
    'health.stressed': 'அழுத்தம்',
    'health.poor': 'மோசம்',

    // Actions
    'action.refresh': 'புதுப்பி',
    'action.viewDetails': 'விவரங்கள் காண்க',
    'action.takePhoto': 'புகைப்படம் எடு',
    'action.water': 'தண்ணீர் ஊற்று',
    'action.call': 'நிபுணரை அழை',

    // Alerts
    'alert.fire': 'தீ எச்சரிக்கை',
    'alert.pest': 'பூச்சி எச்சரிக்கை',
    'alert.disease': 'நோய் கண்டறியப்பட்டது',
    'alert.drought': 'தண்ணீர் குறைவு',
    'alert.intruder': 'ஊடுருவல் எச்சரிக்கை',

    // Settings
    'settings.title': 'அமைப்புகள்',
    'settings.simpleMode': 'எளிய முறை',
    'settings.expertMode': 'நிபுணர் முறை',
    'settings.simpleModeDesc': 'புரிந்துகொள்ள எளிது',
    'settings.expertModeDesc': 'விரிவான தகவல்கள்',
    'settings.language': 'மொழி',
    'settings.voiceAlerts': 'குரல் எச்சரிக்கை',

    // Voice messages
    'voice.cropHealthy': 'உங்கள் பயிர் ஆரோக்கியமாக உள்ளது. எல்லாம் சரி.',
    'voice.needsWater': 'உங்கள் பயிருக்கு தண்ணீர் தேவை. விரைவில் நீர்ப்பாசனம் செய்யுங்கள்.',
    'voice.diseaseAlert': 'உங்கள் வயலில் நோய் கண்டறியப்பட்டது. உடனே சரிபாருங்கள்.',
    'voice.pestAlert': 'உங்கள் தோட்டத்தில் பூச்சிகள் கண்டுபிடிக்கப்பட்டன. இப்போதே நடவடிக்கை எடுங்கள்.',
  },

  te: {
    // Dashboard
    'dashboard.title': 'నా పొలం',
    'dashboard.cropHealth': 'పంట ఆరోగ్యం',
    'dashboard.healthy': 'ఆరోగ్యకరమైన',
    'dashboard.needsAttention': 'శ్రద్ధ అవసరం',
    'dashboard.critical': 'అత్యవసరం',
    'dashboard.alerts': 'హెచ్చరికలు',
    'dashboard.noAlerts': 'హెచ్చరికలు లేవు',
    'dashboard.weather': 'వాతావరణం',
    'dashboard.irrigation': 'నీటిపారుదల',
    'dashboard.scanDisease': 'వ్యాధి తనిఖీ',

    // Health status
    'health.excellent': 'అద్భుతం',
    'health.good': 'మంచిది',
    'health.moderate': 'సగటు',
    'health.stressed': 'ఒత్తిడి',
    'health.poor': 'చెడ్డది',

    // Actions
    'action.refresh': 'రిఫ్రెష్',
    'action.viewDetails': 'వివరాలు చూడండి',
    'action.takePhoto': 'ఫోటో తీయండి',
    'action.water': 'నీళ్ళు పోయండి',
    'action.call': 'నిపుణుడిని పిలవండి',

    // Alerts
    'alert.fire': 'అగ్ని హెచ్చరిక',
    'alert.pest': 'పురుగుల హెచ్చరిక',
    'alert.disease': 'వ్యాధి గుర్తించబడింది',
    'alert.drought': 'నీరు తక్కువ',
    'alert.intruder': 'చొరబాటు హెచ్చరిక',

    // Settings
    'settings.title': 'సెట్టింగ్స్',
    'settings.simpleMode': 'సింపుల్ మోడ్',
    'settings.expertMode': 'ఎక్స్‌పర్ట్ మోడ్',
    'settings.simpleModeDesc': 'అర్థం చేసుకోవడం సులభం',
    'settings.expertModeDesc': 'వివరమైన సమాచారం',
    'settings.language': 'భాష',
    'settings.voiceAlerts': 'వాయిస్ హెచ్చరికలు',

    // Voice messages
    'voice.cropHealthy': 'మీ పంట ఆరోగ్యంగా ఉంది. అంతా బాగుంది.',
    'voice.needsWater': 'మీ పంటకు నీళ్ళు అవసరం. త్వరగా నీటిపారుదల చేయండి.',
    'voice.diseaseAlert': 'మీ పొలంలో వ్యాధి గుర్తించబడింది. వెంటనే తనిఖీ చేయండి.',
    'voice.pestAlert': 'మీ పొలంలో పురుగులు కనుగొనబడ్డాయి. ఇప్పుడే చర్య తీసుకోండి.',
  },

  mr: {
    // Dashboard
    'dashboard.title': 'माझे शेत',
    'dashboard.cropHealth': 'पिकाचे आरोग्य',
    'dashboard.healthy': 'निरोगी',
    'dashboard.needsAttention': 'लक्ष हवे',
    'dashboard.critical': 'गंभीर',
    'dashboard.alerts': 'सूचना',
    'dashboard.noAlerts': 'सूचना नाहीत',
    'dashboard.weather': 'हवामान',
    'dashboard.irrigation': 'सिंचन',
    'dashboard.scanDisease': 'रोग तपासा',

    // Health status
    'health.excellent': 'उत्कृष्ट',
    'health.good': 'चांगले',
    'health.moderate': 'बरे',
    'health.stressed': 'तणावात',
    'health.poor': 'वाईट',

    // Actions
    'action.refresh': 'ताजे करा',
    'action.viewDetails': 'तपशील पहा',
    'action.takePhoto': 'फोटो काढा',
    'action.water': 'पाणी द्या',
    'action.call': 'तज्ञांना कॉल करा',

    // Alerts
    'alert.fire': 'आग इशारा',
    'alert.pest': 'कीटक इशारा',
    'alert.disease': 'रोग आढळला',
    'alert.drought': 'पाणी कमी',
    'alert.intruder': 'घुसखोर सूचना',

    // Settings
    'settings.title': 'सेटिंग्ज',
    'settings.simpleMode': 'सोपी पद्धत',
    'settings.expertMode': 'तज्ञ पद्धत',
    'settings.simpleModeDesc': 'समजायला सोपे',
    'settings.expertModeDesc': 'तपशीलवार माहिती',
    'settings.language': 'भाषा',
    'settings.voiceAlerts': 'आवाज सूचना',

    // Voice messages
    'voice.cropHealthy': 'तुमचे पीक निरोगी आहे. सर्व काही ठीक आहे.',
    'voice.needsWater': 'तुमच्या पिकाला पाणी हवे आहे. लवकर सिंचन करा.',
    'voice.diseaseAlert': 'तुमच्या शेतात रोग आढळला. लगेच तपासा.',
    'voice.pestAlert': 'तुमच्या शेतात कीटक आढळले. आता कारवाई करा.',
  },

  bn: {
    // Dashboard
    'dashboard.title': 'আমার খেত',
    'dashboard.cropHealth': 'ফসলের স্বাস্থ্য',
    'dashboard.healthy': 'স্বাস্থ্যকর',
    'dashboard.needsAttention': 'যত্ন দরকার',
    'dashboard.critical': 'জরুরি',
    'dashboard.alerts': 'সতর্কতা',
    'dashboard.noAlerts': 'কোন সতর্কতা নেই',
    'dashboard.weather': 'আবহাওয়া',
    'dashboard.irrigation': 'সেচ',
    'dashboard.scanDisease': 'রোগ পরীক্ষা',

    // Health status
    'health.excellent': 'চমৎকার',
    'health.good': 'ভালো',
    'health.moderate': 'মোটামুটি',
    'health.stressed': 'চাপে',
    'health.poor': 'খারাপ',

    // Actions
    'action.refresh': 'রিফ্রেশ',
    'action.viewDetails': 'বিস্তারিত দেখুন',
    'action.takePhoto': 'ছবি তুলুন',
    'action.water': 'জল দিন',
    'action.call': 'বিশেষজ্ঞকে কল করুন',

    // Alerts
    'alert.fire': 'আগুনের সতর্কতা',
    'alert.pest': 'কীটপতঙ্গ সতর্কতা',
    'alert.disease': 'রোগ পাওয়া গেছে',
    'alert.drought': 'জল কম',
    'alert.intruder': 'অনুপ্রবেশকারী সতর্কতা',

    // Settings
    'settings.title': 'সেটিংস',
    'settings.simpleMode': 'সহজ মোড',
    'settings.expertMode': 'বিশেষজ্ঞ মোড',
    'settings.simpleModeDesc': 'বুঝতে সহজ',
    'settings.expertModeDesc': 'বিস্তারিত তথ্য',
    'settings.language': 'ভাষা',
    'settings.voiceAlerts': 'ভয়েস সতর্কতা',

    // Voice messages
    'voice.cropHealthy': 'আপনার ফসল সুস্থ। সবকিছু ঠিক আছে।',
    'voice.needsWater': 'আপনার ফসলের জল দরকার। শীঘ্রই সেচ দিন।',
    'voice.diseaseAlert': 'আপনার খেতে রোগ পাওয়া গেছে। এখনই পরীক্ষা করুন।',
    'voice.pestAlert': 'আপনার খেতে কীটপতঙ্গ পাওয়া গেছে। এখনই ব্যবস্থা নিন।',
  },
};

// Helper hook for translations
export const useTranslation = () => {
  const { language } = usePreferencesStore();

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return { t, language };
};
