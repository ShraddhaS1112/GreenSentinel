import { describe, it, expect } from 'vitest';
import {
  getHealthAdvice,
  getNdviExplanation,
  getTermExplanation,
  getIrrigationAdvice,
  getRiskLabel,
  getActionCards,
  type FarmerAdvice,
} from '@/utils/farmerFriendly';

describe('Farmer Friendly Utilities', () => {
  describe('getHealthAdvice', () => {
    describe('English translations', () => {
      it('should return excellent advice for score >= 80', () => {
        const advice = getHealthAdvice(85, 'en');
        expect(advice.status).toBe('good');
        expect(advice.title).toBe('Crops Look Great!');
        expect(advice.color).toBe('text-green-700');
        expect(advice.bgColor).toBe('bg-green-50');
      });

      it('should return good advice for score 60-79', () => {
        const advice = getHealthAdvice(65, 'en');
        expect(advice.status).toBe('good');
        expect(advice.title).toBe('Crops Are Healthy');
      });

      it('should return attention advice for score 40-59', () => {
        const advice = getHealthAdvice(45, 'en');
        expect(advice.status).toBe('attention');
        expect(advice.title).toBe('Needs Attention');
        expect(advice.color).toBe('text-yellow-700');
      });

      it('should return urgent advice for score < 40', () => {
        const advice = getHealthAdvice(30, 'en');
        expect(advice.status).toBe('urgent');
        expect(advice.title).toBe('Immediate Care Needed');
        expect(advice.color).toBe('text-red-700');
      });

      it('should return correct advice for boundary values', () => {
        expect(getHealthAdvice(80, 'en').title).toBe('Crops Look Great!');
        expect(getHealthAdvice(79, 'en').title).toBe('Crops Are Healthy');
        expect(getHealthAdvice(60, 'en').title).toBe('Crops Are Healthy');
        expect(getHealthAdvice(59, 'en').title).toBe('Needs Attention');
        expect(getHealthAdvice(40, 'en').title).toBe('Needs Attention');
        expect(getHealthAdvice(39, 'en').title).toBe('Immediate Care Needed');
      });
    });

    describe('Hindi translations', () => {
      it('should return Hindi translations', () => {
        const advice = getHealthAdvice(85, 'hi');
        expect(advice.title).toBe('फसल बहुत अच्छी है!');
        expect(advice.message).toContain('स्वस्थ');
      });

      it('should fall back to English for unknown language', () => {
        const advice = getHealthAdvice(85, 'fr');
        expect(advice.title).toBe('Crops Look Great!');
      });
    });

    describe('Kannada translations', () => {
      it('should return Kannada translations', () => {
        const advice = getHealthAdvice(85, 'kn');
        expect(advice.title).toBe('ಬೆಳೆ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ!');
      });
    });
  });

  describe('getNdviExplanation', () => {
    it('should return very healthy for NDVI >= 0.7', () => {
      const explanation = getNdviExplanation(0.8, 'en');
      expect(explanation).toContain('Very green');
    });

    it('should return healthy for NDVI 0.5-0.69', () => {
      const explanation = getNdviExplanation(0.6, 'en');
      expect(explanation).toContain('Good greenness');
    });

    it('should return moderate for NDVI 0.3-0.49', () => {
      const explanation = getNdviExplanation(0.35, 'en');
      expect(explanation).toContain('Moderate');
    });

    it('should return stressed for NDVI 0.2-0.29', () => {
      const explanation = getNdviExplanation(0.25, 'en');
      expect(explanation).toContain('stressed');
    });

    it('should return poor for NDVI < 0.2', () => {
      const explanation = getNdviExplanation(0.1, 'en');
      expect(explanation).toContain('Very low greenness');
    });

    it('should return Hindi translation', () => {
      const explanation = getNdviExplanation(0.8, 'hi');
      expect(explanation).toContain('बहुत हरा');
    });

    it('should return Kannada translation', () => {
      const explanation = getNdviExplanation(0.8, 'kn');
      expect(explanation).toContain('ತುಂಬಾ ಹಸಿರು');
    });
  });

  describe('getTermExplanation', () => {
    it('should return NDVI explanation in English', () => {
      const explanation = getTermExplanation('ndvi', 'en');
      expect(explanation.simple).toBe('Plant Greenness');
      expect(explanation.detail).toContain('satellite');
    });

    it('should return healthScore explanation in English', () => {
      const explanation = getTermExplanation('healthScore', 'en');
      expect(explanation.simple).toBe('Crop Condition');
    });

    it('should return diseaseRisk explanation in English', () => {
      const explanation = getTermExplanation('diseaseRisk', 'en');
      expect(explanation.simple).toBe('Sickness Chance');
    });

    it('should return pestRisk explanation in English', () => {
      const explanation = getTermExplanation('pestRisk', 'en');
      expect(explanation.simple).toBe('Bug Danger');
    });

    it('should return Hindi translations', () => {
      const explanation = getTermExplanation('ndvi', 'hi');
      expect(explanation.simple).toBe('पौधों की हरियाली');
    });

    it('should return Kannada translations', () => {
      const explanation = getTermExplanation('ndvi', 'kn');
      expect(explanation.simple).toBe('ಸಸ್ಯ ಹಸಿರು');
    });

    it('should return term as simple for unknown term', () => {
      const explanation = getTermExplanation('unknownTerm', 'en');
      expect(explanation.simple).toBe('unknownTerm');
      expect(explanation.detail).toBe('');
    });
  });

  describe('getIrrigationAdvice', () => {
    it('should recommend watering when soil is dry and no rain', () => {
      const advice = getIrrigationAdvice(20, { rain: false, temperature: 35 }, 'en');
      expect(advice.status).toBe('urgent');
      expect(advice.title).toBe('Water Your Crops Now');
    });

    it('should recommend waiting for rain when soil is dry but rain expected', () => {
      const advice = getIrrigationAdvice(20, { rain: true, temperature: 30 }, 'en');
      expect(advice.status).toBe('attention');
      expect(advice.title).toBe('Rain Coming Soon');
    });

    it('should say soil is OK when moisture is adequate', () => {
      const advice = getIrrigationAdvice(50, { rain: false, temperature: 30 }, 'en');
      expect(advice.status).toBe('good');
      expect(advice.title).toBe('Soil Has Good Moisture');
    });

    it('should say soil is too wet when moisture > 70', () => {
      const advice = getIrrigationAdvice(80, { rain: false, temperature: 30 }, 'en');
      expect(advice.status).toBe('good');
      expect(advice.title).toBe('Soil Too Wet');
    });

    it('should return Hindi translations', () => {
      const advice = getIrrigationAdvice(20, { rain: false, temperature: 35 }, 'hi');
      expect(advice.title).toBe('अभी पानी दें');
    });
  });

  describe('getRiskLabel', () => {
    it('should return very low risk for risk <= 20', () => {
      const result = getRiskLabel(15, 'en');
      expect(result.label).toBe('Safe');
      expect(result.advice).toBe('No action needed');
    });

    it('should return low risk for risk 21-40', () => {
      const result = getRiskLabel(35, 'en');
      expect(result.label).toBe('Low Risk');
    });

    it('should return medium risk for risk 41-60', () => {
      const result = getRiskLabel(55, 'en');
      expect(result.label).toBe('Moderate');
    });

    it('should return high risk for risk 61-80', () => {
      const result = getRiskLabel(75, 'en');
      expect(result.label).toBe('High Risk');
    });

    it('should return critical for risk > 80', () => {
      const result = getRiskLabel(90, 'en');
      expect(result.label).toBe('Danger!');
      expect(result.advice).toBe('Act immediately');
    });

    it('should return Hindi translations', () => {
      const result = getRiskLabel(90, 'hi');
      expect(result.label).toBe('खतरा!');
    });
  });

  describe('getActionCards', () => {
    it('should return action cards with scan option', () => {
      const cards = getActionCards(80, 0, 50, 'en');
      expect(cards.length).toBeGreaterThanOrEqual(3);
      expect(cards[0].id).toBe('scan');
      expect(cards[0].icon).toBe('📷');
    });

    it('should show urgent water card when soil is dry', () => {
      const cards = getActionCards(80, 0, 30, 'en');
      const waterCard = cards.find(c => c.id === 'water');
      expect(waterCard?.urgent).toBe(true);
    });

    it('should show normal water card when soil is moist', () => {
      const cards = getActionCards(80, 0, 60, 'en');
      const waterCard = cards.find(c => c.id === 'water');
      expect(waterCard?.urgent).toBeUndefined();
    });

    it('should show urgent alerts card when there are alerts', () => {
      const cards = getActionCards(80, 3, 50, 'en');
      const alertCard = cards.find(c => c.id === 'alerts');
      expect(alertCard?.urgent).toBe(true);
    });

    it('should show normal alerts card when there are no alerts', () => {
      const cards = getActionCards(80, 0, 50, 'en');
      const alertCard = cards.find(c => c.id === 'alerts');
      expect(alertCard?.icon).toBe('✅');
      expect(alertCard?.urgent).toBeUndefined();
    });

    it('should always include help card with Kisan helpline', () => {
      const cards = getActionCards(80, 0, 50, 'en');
      const helpCard = cards.find(c => c.id === 'help');
      expect(helpCard).toBeDefined();
      expect(helpCard?.link).toBe('tel:1800-180-1551');
    });

    it('should return Hindi translations', () => {
      const cards = getActionCards(80, 0, 50, 'hi');
      const scanCard = cards.find(c => c.id === 'scan');
      expect(scanCard?.title).toBe('फसल जांचें');
    });

    it('should interpolate alert count in subtitle', () => {
      const cards = getActionCards(80, 5, 50, 'en');
      const alertCard = cards.find(c => c.id === 'alerts');
      expect(alertCard?.subtitle).toContain('5');
    });
  });
});
