/**
 * Configuration et constantes du plugin Homebridge Comelit People
 * Aligné sur la documentation officielle Comelit Group API
 */

export const PLATFORM_NAME = 'ComelitPeoplePlatform';
export const PLUGIN_NAME = 'homebridge-comelit-people';

export interface ComelitPlatformConfig {
  platform: string;
  name?: string;
  
  // Méthode 1: Email + Password (prioritaire)
  email?: string;
  password?: string;
  
  // Méthode 2: Credentials manuels (utilisés si email/password absents)
  token?: string;
  deviceUuid?: string;
  apartmentId?: string;
  
  baseURL?: string;
  pollInterval?: number;
  lockIds?: string[];
  enableCamera?: boolean;
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

export const DEFAULT_CONFIG = {
  baseURL: 'https://api.comelitgroup.com/servicerest',
  pollInterval: 30000, // 30 secondes
  enableCamera: true, // Réactivé avec implémentation WebRTC
  videoConfig: {
    maxWidth: 1280,
    maxHeight: 720,
    maxFPS: 30,
    maxBitrate: 300,
    forceMax: false,
    vcodec: 'libx264',
    audio: true,
  },
};
