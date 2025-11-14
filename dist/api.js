"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComelitAPI = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Client API pour communiquer avec l'API Comelit Group
 *
 * Basé sur la documentation officielle Comelit:
 * - https://dev1.cloud.comelitgroup.com/
 * - Architecture: Address Book (External Units, Opendoors, Actuators, Cameras)
 * - Authentification: ccstoken (CCS - Comelit Cloud Services)
 */
class ComelitAPI {
    constructor(baseURL, token, deviceUuid, apartmentId) {
        this.token = token;
        this.deviceUuid = deviceUuid;
        this.apartmentId = apartmentId;
        this.axios = axios_1.default.create({
            baseURL,
            headers: {
                'Host': 'api.comelitgroup.com',
                'Accept': 'application/json,application/xml,text/xml',
                'Content-Type': 'application/json',
                'Accept-Charset': 'UTF-8',
                'Authorization': `ccstoken ${token}`,
                'Accept-Language': 'fr-FR,fr;q=0.9',
                'User-Agent': 'homebridge-comelit',
            },
            timeout: 10000,
        });
    }
    /**
     * Retourne le token pour usage externe
     */
    getToken() {
        return this.token;
    }
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
    async getResources() {
        const response = await this.axios.get('/directory/resources');
        return response.data;
    }
    /**
     * Découvre tous les dispositifs disponibles (Address Book Elements)
     * Retourne les endpoints avec leurs capacités:
     * - CAMERA: External Units avec DoorbellEventSource et RTCSessionController
     * - LOCK_GENERIC: Opendoors avec PowerController
     * - VIP_ACTUATOR: Actuators avec PowerController
     * - INTERCOM: Internal Units avec DoorbellEventSource
     */
    async discoverDevices() {
        const response = await this.axios.get('/devicecom/endpoints/discovery');
        return response.data;
    }
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
    buildEndpointId(type, deviceId) {
        return `_DA_${this.apartmentId}_${this.deviceUuid}_VIP#${type}#${deviceId}`;
    }
    /**
     * Encode l'endpoint ID pour l'URL (# -> %23 pour éviter que axios le supprime)
     */
    encodeEndpointId(endpointId) {
        // Encoder # en %23 car axios supprime tout après # (le traite comme fragment)
        return endpointId.replace(/#/g, '%23');
    }
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
    async controlDevice(type, deviceId, state) {
        const endpointId = this.buildEndpointId(type, deviceId);
        const encodedId = this.encodeEndpointId(endpointId);
        const response = await this.axios.post(`/devicecom/endpoint/${encodedId}/power`, { powerState: state });
        return response.data;
    }
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
    async unlockDoor(endpointId) {
        const encodedId = this.encodeEndpointId(endpointId);
        const response = await this.axios.put(`/devicecom/endpoint/${encodedId}/power`, { value: true });
        return response.data;
    }
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
    async startVideoSession(endpointId, sessionId, sdpOffer) {
        // Utiliser l'endpoint ID complet fourni par /devicecom/endpoints/discovery
        const encodedId = this.encodeEndpointId(endpointId);
        console.log('🌐 Endpoint brut:', endpointId);
        console.log('🌐 Endpoint après encoding:', encodedId);
        const response = await this.axios.put(`/devicecom/endpoint/${encodedId}/rtc/offer`, {
            sessionId: sessionId,
            offer: sdpOffer
        });
        return response.data;
    }
    /**
     * Récupère les messages/événements du centre de messages
     *
     * Selon la documentation Comelit:
     * - Endpoint: /messagecenter/v2/message/read
     * - Categories: VIP_EVENT (événements d'interphone), TECHNICAL_ALARM
     * - EventTypes: MEMO (mémo), DOORBELL (sonnette)
     * - Utilisé pour détecter les appels entrants (DoorbellEventSource)
     */
    async getMessages(category = 'VIP_EVENT', eventType = 'MEMO', limit = 100) {
        const response = await this.axios.get('/messagecenter/v2/message/read', {
            params: {
                deviceUuid: this.deviceUuid,
                category,
                eventType,
                skip: 0,
                limit,
                sort: 'DATE_DESC',
            },
        });
        return response.data;
    }
    /**
     * Récupère les canaux de notifications push
     *
     * Selon la documentation Comelit:
     * - Service: channelservice
     * - Type: PUSH_MOBILE (FCM pour Android, APNs pour iOS)
     * - Utilisé pour recevoir les événements de sonnette en temps réel
     * - Alternative au polling pour une réactivité optimale
     */
    async getPushChannels() {
        const response = await this.axios.get('/channelservice/channels/bulk/PUSH_MOBILE');
        return response.data;
    }
    /**
     * Vérifie la connexion à l'API
     */
    async checkConnection() {
        try {
            await this.getResources();
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.ComelitAPI = ComelitAPI;
//# sourceMappingURL=api.js.map