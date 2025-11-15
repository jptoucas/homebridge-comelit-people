/**
 * Configuration et constantes du plugin Homebridge Comelit People
 * Aligné sur la documentation officielle Comelit Group API
 */

export const PLATFORM_NAME = 'ComelitPeoplePlatform';
export const PLUGIN_NAME = 'homebridge-comelit-people';

export interface ComelitPlatformConfig {
  platform: string;
  name?: string;
  
  // Authentification (obligatoire)
  email: string;
  password: string;
  
  baseURL?: string;
  pollInterval?: number;
  lockIds?: string[];
  enableCamera?: boolean;
  ignoredDevices?: string;
  videoConfig?: {
    maxWidth?: number;
    maxHeight?: number;
    maxFPS?: number;
    maxBitrate?: number;
    forceMax?: boolean;
    vcodec?: string;
    audio?: boolean;
  };
  
  // Cache interne pour les credentials (géré automatiquement)
  _cachedCredentials?: {
    token: string;
    deviceUuid: string;
    apartmentId: string;
    expirySeconds: number;
  };
}

export const DEFAULT_CONFIG: Partial<ComelitPlatformConfig> = {
  baseURL: 'https://api.comelitgroup.com/servicerest',
  pollInterval: 10000,
  enableCamera: true,
  ignoredDevices: 'Actionneur Générique',
};
