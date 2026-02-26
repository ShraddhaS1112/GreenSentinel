export interface FarmData {
  id: string;
  name: string;
  location: string;
  activeThreatCount: number;
  cropHealthScore: number;
  activeCameras: number;
  lastUpdate: string;
  threatType?: 'fire' | 'human' | 'animal' | null;
  language?: 'hi' | 'mr' | 'en';
  phoneNumber?: string;
}

export interface Threat {
  id: string;
  type: 'fire' | 'human' | 'animal';
  timestamp: string;
  confidence: number;
  camera: string;
}

export const initialFarmData: Record<string, FarmData> = {
  'farm-1': {
    id: 'farm-1',
    name: 'गुलाब का बाग',
    location: 'पुणे, महाराष्ट्र',
    activeThreatCount: 0,
    cropHealthScore: 82,
    activeCameras: 3,
    lastUpdate: 'अभी',
    threatType: null,
    language: 'mr',
    phoneNumber: '+91XXXXXXXXXX',
  },
  'farm-2': {
    id: 'farm-2',
    name: 'आंबा का खेत',
    location: 'खेड, पुणे',
    activeThreatCount: 0,
    cropHealthScore: 85,
    activeCameras: 2,
    lastUpdate: 'अभी',
    threatType: null,
    language: 'mr',
    phoneNumber: '+91XXXXXXXXXX',
  },
  'farm-3': {
    id: 'farm-3',
    name: 'गेहूं का खेत',
    location: 'महाराष्ट्र',
    activeThreatCount: 0,
    cropHealthScore: 75,
    activeCameras: 4,
    lastUpdate: 'अभी',
    threatType: null,
    language: 'hi',
    phoneNumber: '+91XXXXXXXXXX',
  },
};

export const initialThreats: Threat[] = [];

// Auto-threat generator for Mango farm (farm-2)
export const generateAutoThreat = (): Threat => {
  const threatTypes: Array<'fire' | 'human' | 'animal'> = ['human', 'animal', 'fire'];
  const randomType = threatTypes[Math.floor(Math.random() * threatTypes.length)];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    id: `threat-${Date.now()}`,
    type: randomType,
    timestamp: timeStr,
    confidence: Math.floor(Math.random() * 20) + 80, // 80-100%
    camera: `कैमरा ${Math.floor(Math.random() * 3) + 1}`,
  };
};

// Get Hindi threat count label
export const getThreatCountLabel = (count: number): string => {
  if (count === 0) return 'कोणताही धोका नाही';
  if (count === 1) return '1 धोका';
  return `${count} धोके`;
};
