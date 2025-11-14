/**
 * Client API pour communiquer avec l'API Comelit Group
 *
 * Basé sur la documentation officielle Comelit:
 * - https://dev1.cloud.comelitgroup.com/
 * - Architecture: Address Book (External Units, Opendoors, Actuators, Cameras)
 * - Authentification: ccstoken (CCS - Comelit Cloud Services)
 */
export declare class ComelitAPI {
    private readonly axios;
    private readonly token;
    private readonly deviceUuid;
    private readonly apartmentId;
    constructor(baseURL: string, token: string, deviceUuid: string, apartmentId: string);
    /**
     * Retourne le token pour usage externe
     */
    getToken(): string;
    /**
     * Récupère les ressources du répertoire (Address Book)
     * Retourne les informations sur l'appartement, le bâtiment et les dispositifs
     *
     * Terminologie Comelit:
     * - External Units: Panneaux d'entrée extérieurs (Quadra, Ikall, etc.)
     * - Internal Units: Moniteurs intérieurs (Mini, Icona, etc.)
     * - Opendoors: Relais de serrure (2 relais embarqués)
     * - Actuators: Dispositifs commandables (ex: 1443)
     * - Cameras: Caméras IP
     */
    getResources(): Promise<any>;
    /**
     * Découvre tous les dispositifs disponibles (Address Book Elements)
     * Retourne les endpoints avec leurs capacités:
     * - CAMERA: External Units avec DoorbellEventSource et RTCSessionController
     * - LOCK_GENERIC: Opendoors avec PowerController
     * - VIP_ACTUATOR: Actuators avec PowerController
     * - INTERCOM: Internal Units avec DoorbellEventSource
     */
    discoverDevices(): Promise<any>;
    /**
     * Construit l'ID d'endpoint pour un dispositif selon le format Comelit
     * Format: _DA_{apartmentId}_{deviceUuid}_VIP#{type}#{deviceId}
     *
     * Types Comelit officiels:
     * - OD: Opendoor (relais de serrure)
     * - EN: External Unit (panneau d'entrée avec caméra)
     * - IC: Internal Unit (intercom)
     * - CA: Camera (caméra IP)
     * - AC: Actuator (actionneur)
     */
    private buildEndpointId;
    /**
     * Encode l'endpoint ID pour l'URL (# -> %23 pour éviter que axios le supprime)
     */
    private encodeEndpointId;
    /**
     * Contrôle un dispositif Comelit (Opendoor, Actuator)
     *
     * Selon la documentation Comelit:
     * - Méthode: POST sur /devicecom/endpoint/{endpointId}/power
     * - Payload: { "powerState": "ON" | "OFF" }
     * - Usage: Ouvrir une porte (Opendoor) ou activer un actionneur
     *
     * Equivalent de l'API CGModule.call(id)
     */
    controlDevice(type: string, deviceId: string, state: 'ON' | 'OFF'): Promise<any>;
    /**
     * Déverrouille une porte (Opendoor)
     *
     * Selon la documentation Comelit:
     * - Les panneaux d'entrée ont 2 relais embarqués
     * - Type: OD (Opendoor)
     * - Commande: PowerController avec état "ON"
     * - Le relais se désactive automatiquement après un délai
     * - Méthode HTTP: PUT (pas POST !)
     * - Payload: { "value": true } (booléen, pas string)
     *
     * @param endpointId - L'endpoint ID complet fourni par discovery
     */
    unlockDoor(endpointId: string): Promise<any>;
    /**
     * Démarre une session vidéo WebRTC (External Unit)
     *
     * Selon la documentation Comelit:
     * - Type: EN (External Unit)
     * - Capacité: RTCSessionController
     * - Protocole: WebRTC avec SDP Offer/Answer
     * - Codec: H264 pour vidéo, PCMA pour audio
     * - STUN/TURN: Infrastructure Comelit
     * - Méthode: PUT (pas POST)
     * - CRITIQUE: Nécessite sessionId (UUID v4) + endpointId complet depuis discovery
     */
    startVideoSession(endpointId: string, sessionId: string, sdpOffer: string): Promise<any>;
    /**
     * Récupère les messages/événements du centre de messages
     *
     * Selon la documentation Comelit:
     * - Endpoint: /messagecenter/v2/message/read
     * - Categories: VIP_EVENT (événements d'interphone), TECHNICAL_ALARM
     * - EventTypes: MEMO (mémo), DOORBELL (sonnette)
     * - Utilisé pour détecter les appels entrants (DoorbellEventSource)
     */
    getMessages(category?: string, eventType?: string, limit?: number): Promise<any>;
    /**
     * Récupère les canaux de notifications push
     *
     * Selon la documentation Comelit:
     * - Service: channelservice
     * - Type: PUSH_MOBILE (FCM pour Android, APNs pour iOS)
     * - Utilisé pour recevoir les événements de sonnette en temps réel
     * - Alternative au polling pour une réactivité optimale
     */
    getPushChannels(): Promise<any>;
    /**
     * Vérifie la connexion à l'API
     */
    checkConnection(): Promise<boolean>;
}
//# sourceMappingURL=api.d.ts.map