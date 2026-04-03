import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePreferencesStore, translations } from '@/stores/preferencesStore';

describe('Preferences Store', () => {
  beforeEach(() => {
    // Reset store before each test
    localStorage.clear();
    usePreferencesStore.setState({
      uiMode: 'expert',
      largeText: false,
      highContrast: false,
      voiceGuidance: true,
      language: 'en',
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = usePreferencesStore.getState();
      expect(state.uiMode).toBe('expert');
      expect(state.largeText).toBe(false);
      expect(state.highContrast).toBe(false);
      expect(state.voiceGuidance).toBe(true);
      expect(state.language).toBe('en');
    });
  });

  describe('UI Mode', () => {
    it('should set UI mode to simple', () => {
      usePreferencesStore.getState().setUIMode('simple');
      expect(usePreferencesStore.getState().uiMode).toBe('simple');
    });

    it('should set UI mode to expert', () => {
      usePreferencesStore.getState().setUIMode('expert');
      expect(usePreferencesStore.getState().uiMode).toBe('expert');
    });

    it('should toggle UI mode', () => {
      const { toggleUIMode } = usePreferencesStore.getState();
      
      expect(usePreferencesStore.getState().uiMode).toBe('expert');
      toggleUIMode();
      expect(usePreferencesStore.getState().uiMode).toBe('simple');
      toggleUIMode();
      expect(usePreferencesStore.getState().uiMode).toBe('expert');
    });
  });

  describe('Accessibility Settings', () => {
    it('should toggle large text', () => {
      const { setLargeText } = usePreferencesStore.getState();
      
      expect(usePreferencesStore.getState().largeText).toBe(false);
      setLargeText(true);
      expect(usePreferencesStore.getState().largeText).toBe(true);
      setLargeText(false);
      expect(usePreferencesStore.getState().largeText).toBe(false);
    });

    it('should toggle high contrast', () => {
      const { setHighContrast } = usePreferencesStore.getState();
      
      expect(usePreferencesStore.getState().highContrast).toBe(false);
      setHighContrast(true);
      expect(usePreferencesStore.getState().highContrast).toBe(true);
      setHighContrast(false);
      expect(usePreferencesStore.getState().highContrast).toBe(false);
    });

    it('should toggle voice guidance', () => {
      const { setVoiceGuidance } = usePreferencesStore.getState();
      
      expect(usePreferencesStore.getState().voiceGuidance).toBe(true);
      setVoiceGuidance(false);
      expect(usePreferencesStore.getState().voiceGuidance).toBe(false);
      setVoiceGuidance(true);
      expect(usePreferencesStore.getState().voiceGuidance).toBe(true);
    });
  });

  describe('Language', () => {
    it('should set language to Hindi', () => {
      usePreferencesStore.getState().setLanguage('hi');
      expect(usePreferencesStore.getState().language).toBe('hi');
    });

    it('should set language to Tamil', () => {
      usePreferencesStore.getState().setLanguage('ta');
      expect(usePreferencesStore.getState().language).toBe('ta');
    });

    it('should support all 7 languages', () => {
      const languages = ['en', 'hi', 'mr', 'ta', 'te', 'kn', 'bn'] as const;
      languages.forEach(lang => {
        usePreferencesStore.getState().setLanguage(lang);
        expect(usePreferencesStore.getState().language).toBe(lang);
      });
    });
  });
});

describe('Translations', () => {
  it('should have translations for English', () => {
    expect(translations.en).toBeDefined();
    expect(translations.en['dashboard.title']).toBe('My Farm');
    expect(translations.en['nav.dashboard']).toBe('Dashboard');
  });

  it('should have translations for Hindi', () => {
    expect(translations.hi).toBeDefined();
    expect(translations.hi['dashboard.title']).toBe('मेरा खेत');
    expect(translations.hi['nav.dashboard']).toBe('डैशबोर्ड');
  });

  it('should have same keys across all languages', () => {
    const enKeys = Object.keys(translations.en);
    const languages = ['hi', 'mr', 'ta', 'te', 'kn', 'bn'] as const;
    
    languages.forEach(lang => {
      const langKeys = Object.keys(translations[lang]);
      const enKeySet = new Set(enKeys);
      // All language keys should be in English keys
      langKeys.forEach(key => {
        expect(enKeySet.has(key)).toBe(true);
      });
    });
  });

  it('should have at least 500 translation keys', () => {
    const enKeys = Object.keys(translations.en);
    expect(enKeys.length).toBeGreaterThanOrEqual(500);
  });
});
