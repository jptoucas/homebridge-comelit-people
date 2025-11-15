import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME, ComelitPlatformConfig, DEFAULT_CONFIG } from './settings';
import { ComelitAPI } from './api';
import { ComelitLockAccessory } from './accessories/lock';
import { ComelitDoorbellAccessory } from './accessories/doorbell';
import { authenticateWithComelit, isTokenExpired } from './auth';

/**
 * Plateforme Homebridge Comelit People
 * 
 * Implémente le système d'interphonie Comelit Group conformément à la documentation officielle:
 * - Address Book: Gestion des External Units, Opendoors, Actuators
 * - Authentification: CCS Token (Comelit Cloud Services)
 * - Architecture: Discovery automatique des dispositifs via /devicecom/endpoints/discovery
 * 
 * Dispositifs supportés:
 * - External Units (CAMERA): Panneaux d'entrée avec sonnette et vidéo
 * - Opendoors (LOCK_GENERIC): Relais de serrure
 * - Internal Units (INTERCOM): Intercoms intérieurs
 */
export class ComelitPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  public comelitAPI!: ComelitAPI;

  public readonly config: ComelitPlatformConfig;

  constructor(
    public readonly log: Logger,
    public readonly platformConfig: PlatformConfig,
    public readonly api: API,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...platformConfig } as ComelitPlatformConfig;

    this.log.info('Plateforme Comelit People initialisée');

    // Enregistrer l'événement de découverte des accessoires
    this.api.on('didFinishLaunching', async () => {
      this.log.debug('didFinishLaunching - Démarrage de l\'authentification et découverte');
      await this.initializeAuthentication();
      await this.discoverDevices();
    });
  }

  /**
   * Initialise l'authentification avec Comelit
   * Supporte deux méthodes:
   * 1. Email + Password (prioritaire, recommandé)
   * 2. Token + DeviceUuid + ApartmentId (manuel)
   */
  private async initializeAuthentication(): Promise<void> {
    try {
      if (!this.config.email || !this.config.password) {
        throw new Error('❌ Configuration invalide: email et password sont obligatoires');
      }

      let token: string;
      let deviceUuid: string;
      let apartmentId: string;

      this.log.info('🔐 Authentification avec email/password...');
      
      // Vérifier si le cache est valide
      const cached = this.config._cachedCredentials;
      if (cached && !isTokenExpired(cached.expirySeconds)) {
        this.log.info('✅ Utilisation du token en cache (valide)');
        token = cached.token;
        deviceUuid = cached.deviceUuid;
        apartmentId = cached.apartmentId;
      } else {
        // Authentifier et récupérer les credentials
        this.log.info('🔄 Récupération d\'un nouveau token...');
        const credentials = await authenticateWithComelit(
          this.config.email,
          this.config.password,
          this.config.baseURL || DEFAULT_CONFIG.baseURL!,
        );

        token = credentials.token;
        deviceUuid = credentials.deviceUuid;
        apartmentId = credentials.apartmentId;

        // Sauvegarder en cache
        this.config._cachedCredentials = credentials;
        
        const expiryDate = new Date(credentials.expirySeconds * 1000).toLocaleDateString('fr-FR');
        this.log.info(`✅ Authentification réussie (token valide jusqu'au ${expiryDate})`);
        this.log.debug(`📋 Device UUID: ${deviceUuid}`);
        this.log.debug(`📋 Apartment ID: ${apartmentId}`);
      }

      // Initialiser l'API Comelit avec les credentials
      this.comelitAPI = new ComelitAPI(
        this.config.baseURL || DEFAULT_CONFIG.baseURL!,
        token,
        deviceUuid,
        apartmentId,
      );

      this.log.info('✅ API Comelit initialisée');

    } catch (error: any) {
      this.log.error('❌ Erreur lors de l\'authentification:', error.message);
      throw error;
    }
  }

  /**
   * Restaure un accessoire depuis le cache
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Chargement de l\'accessoire depuis le cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  /**
   * Découvre les dispositifs Comelit via l'Address Book
   * 
   * Processus de découverte conforme à Comelit:
   * 1. Connexion à l'API avec CCS Token
   * 2. Récupération des endpoints via /devicecom/endpoints/discovery
   * 3. Analyse des displayCategories et capabilities:
   *    - LOCK_GENERIC + PowerController = Opendoor (serrure)
   *    - CAMERA + DoorbellEventSource + RTCSessionController = External Unit (sonnette/caméra)
   *    - INTERCOM + DoorbellEventSource = Internal Unit (intercom)
   * 4. Création des accessoires HomeKit correspondants
   */
  async discoverDevices() {
    try {
      // Vérifier la connexion
      const connected = await this.comelitAPI.checkConnection();
      if (!connected) {
        this.log.error('❌ Impossible de se connecter à l\'API Comelit');
        return;
      }

      this.log.info('✅ Connecté à l\'API Comelit');

      // Découvrir les dispositifs
      const devices = await this.comelitAPI.discoverDevices();
      this.log.info(`${devices.length} dispositif(s) découvert(s)`);

      // Parse ignored devices list
      const ignoredDevicesList = (this.config.ignoredDevices || '')
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (ignoredDevicesList.length > 0) {
        this.log.info(`Dispositifs ignorés configurés: ${ignoredDevicesList.join(', ')}`);
      }

      // Traiter chaque dispositif
      for (const device of devices) {
        const deviceName = device.friendlyName;
        const displayCategories = device.displayCategories || [];
        const capabilities = device.capabilities || [];

        this.log.info(`Dispositif: ${deviceName} (${displayCategories.join(', ')})`);

        // Skip ignored devices
        if (ignoredDevicesList.includes(deviceName)) {
          this.log.info(`⏭️ Dispositif ignoré: ${deviceName}`);
          continue;
        }

        // Serrure
        if (displayCategories.includes('LOCK_GENERIC') || displayCategories.includes('VIP_ACTUATOR')) {
          if (capabilities.includes('PowerController')) {
            this.addLockAccessory(device);
          }
        }

        // Sonnette avec caméra - seulement les vrais CAMERA avec RTCSessionController
        if (displayCategories.includes('CAMERA')) {
          if (capabilities.includes('RTCSessionController')) {
            this.addDoorbellAccessory(device);
          }
        }
      }

      this.log.info('✅ Découverte des dispositifs terminée');

    } catch (error) {
      this.log.error('❌ Erreur lors de la découverte des dispositifs:', error);
    }
  }

  /**
   * Ajoute une serrure
   */
  private addLockAccessory(device: any) {
    const uuid = this.api.hap.uuid.generate(device.endpointId);
    const existingAccessory = this.accessories.find(acc => acc.UUID === uuid);

    if (existingAccessory) {
      this.log.info('Restauration de la serrure:', device.friendlyName);
      existingAccessory.context.device = device;
      this.api.updatePlatformAccessories([existingAccessory]);
      new ComelitLockAccessory(this, existingAccessory);
    } else {
      this.log.info('Ajout de la serrure:', device.friendlyName);
      const accessory = new this.api.platformAccessory(device.friendlyName, uuid);
      accessory.context.device = device;
      new ComelitLockAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  /**
   * Ajoute une sonnette/caméra
   */
  private addDoorbellAccessory(device: any) {
    const uuid = this.api.hap.uuid.generate(device.endpointId);
    const existingAccessory = this.accessories.find(acc => acc.UUID === uuid);

    if (existingAccessory) {
      this.log.info('Restauration de la sonnette:', device.friendlyName);
      existingAccessory.context.device = device;
      this.api.updatePlatformAccessories([existingAccessory]);
      new ComelitDoorbellAccessory(this, existingAccessory);
    } else {
      this.log.info('Ajout de la sonnette:', device.friendlyName);
      const accessory = new this.api.platformAccessory(device.friendlyName, uuid);
      accessory.context.device = device;
      new ComelitDoorbellAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }
}
