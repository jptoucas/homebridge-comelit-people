import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { ComelitPlatformConfig } from './settings';
import { ComelitAPI } from './api';
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
export declare class ComelitPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly platformConfig: PlatformConfig;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly accessories: PlatformAccessory[];
    comelitAPI: ComelitAPI;
    readonly config: ComelitPlatformConfig;
    constructor(log: Logger, platformConfig: PlatformConfig, api: API);
    /**
     * Initialise l'authentification avec Comelit
     * Supporte deux méthodes:
     * 1. Email + Password (prioritaire, recommandé)
     * 2. Token + DeviceUuid + ApartmentId (manuel)
     */
    private initializeAuthentication;
    /**
     * Restaure un accessoire depuis le cache
     */
    configureAccessory(accessory: PlatformAccessory): void;
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
    discoverDevices(): Promise<void>;
    /**
     * Ajoute une serrure
     */
    private addLockAccessory;
    /**
     * Ajoute une sonnette/caméra
     */
    private addDoorbellAccessory;
}
//# sourceMappingURL=platform.d.ts.map