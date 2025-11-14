"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComelitWebRTCAdapter = void 0;
const nodeDataChannel = __importStar(require("node-datachannel"));
/**
 * Gère la connexion WebRTC avec l'API Comelit via libdatachannel
 */
class ComelitWebRTCAdapter {
    constructor(config, log) {
        this.config = config;
        this.log = log;
        this.localPort = 0;
        this.isConnected = false;
    }
    /**
     * Initialise la connexion WebRTC
     */
    async initialize() {
        try {
            this.log.debug('[WebRTC] Initialisation avec libdatachannel...');
            // Créer PeerConnection avec configuration Comelit
            this.peerConnection = new nodeDataChannel.PeerConnection('ComelitCamera', {
                iceServers: this.config.iceServers,
                disableAutoNegotiation: false, // Laisser la négociation auto
                forceMediaTransport: true, // Forcer le transport média
                portRangeBegin: 50000,
                portRangeEnd: 51000,
            });
            this.log.debug('[WebRTC] PeerConnection créée');
            // Configurer les callbacks
            this.setupCallbacks();
        }
        catch (error) {
            this.log.error('[WebRTC] Erreur initialisation:', error);
            throw error;
        }
    }
    /**
     * Configure les callbacks WebRTC
     */
    setupCallbacks() {
        if (!this.peerConnection) {
            return;
        }
        // Local Description (SDP Offer)
        this.peerConnection.onLocalDescription((sdp, type) => {
            this.log.debug('[WebRTC] Local Description:', type);
            this.localSDP = sdp;
            // Envoyer le SDP à l'API Comelit
            this.sendOfferToComelit(sdp, type).catch(err => {
                this.log.error('[WebRTC] Erreur envoi SDP à Comelit:', err);
            });
        });
        // Local Candidate (ICE)
        this.peerConnection.onLocalCandidate((candidate, mid) => {
            this.log.debug('[WebRTC] Local Candidate:', candidate);
        });
        // State Change
        this.peerConnection.onStateChange((state) => {
            this.log.info('[WebRTC] État:', state);
            if (state === 'connected' || state === 'completed') {
                this.isConnected = true;
            }
            else if (state === 'failed' || state === 'closed') {
                this.isConnected = false;
            }
        });
        // Gathering State
        this.peerConnection.onGatheringStateChange((state) => {
            this.log.debug('[WebRTC] Gathering:', state);
        });
    }
    /**
     * Crée un track vidéo pour recevoir le flux Comelit
     */
    async createVideoTrack() {
        if (!this.peerConnection) {
            throw new Error('PeerConnection non initialisée');
        }
        try {
            this.log.debug('[WebRTC] Création video track...');
            // Créer track vidéo avec codec H.264 (compatible Comelit)
            // Direction: 'RecvOnly' pour recevoir uniquement (caméra -> HomeKit)
            this.videoTrack = new nodeDataChannel.Video('video', 'RecvOnly');
            // Ajouter le track à la PeerConnection
            // Note: node-datachannel utilise addTrack de libdatachannel
            if (typeof this.peerConnection.addTrack === 'function') {
                this.peerConnection.addTrack(this.videoTrack);
                this.log.debug('[WebRTC] Video track ajouté');
            }
            else {
                this.log.warn('[WebRTC] addTrack non disponible, tentative alternative...');
            }
        }
        catch (error) {
            this.log.error('[WebRTC] Erreur création video track:', error);
            throw error;
        }
    }
    /**
     * Envoie le SDP Offer à l'API Comelit
     */
    async sendOfferToComelit(sdp, type) {
        const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
        try {
            // Encoder l'endpoint ID (# -> %23)
            const encodedEndpoint = this.config.endpointId.replace(/#/g, '%23');
            const url = `${this.config.apiUrl}/devicecom/endpoint/${encodedEndpoint}/rtc/offer`;
            this.log.debug('[WebRTC] Envoi SDP Offer à:', url);
            const response = await axios.put(url, {
                sessionId: this.config.sessionId,
                offer: sdp,
            }, {
                headers: {
                    'Authorization': `ccstoken ${this.config.apiToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.status === 200 && response.data.answer) {
                this.log.info('[WebRTC] SDP Answer reçu de Comelit');
                this.remoteSDP = response.data.answer;
                await this.setRemoteAnswer(response.data.answer);
            }
            else {
                this.log.error('[WebRTC] Réponse Comelit invalide:', response.data);
            }
        }
        catch (error) {
            this.log.error('[WebRTC] Erreur API Comelit:', error.response?.data || error.message);
            throw error;
        }
    }
    /**
     * Configure la réponse SDP de Comelit
     */
    async setRemoteAnswer(sdp) {
        if (!this.peerConnection) {
            throw new Error('PeerConnection non initialisée');
        }
        try {
            this.log.debug('[WebRTC] Configuration Remote Description...');
            this.peerConnection.setRemoteDescription(sdp, 'Answer');
            this.log.info('[WebRTC] Remote Description configurée');
        }
        catch (error) {
            this.log.error('[WebRTC] Erreur setRemoteDescription:', error);
            throw error;
        }
    }
    /**
     * Récupère les informations de streaming
     */
    getStreamInfo() {
        // Récupérer le port local utilisé par libdatachannel
        // Pour l'instant, on retourne un port fictif car libdatachannel gère le transport
        return {
            localPort: 50000, // Port de base de la range
        };
    }
    /**
     * Vérifie si la connexion est établie
     */
    isConnectionEstablished() {
        return this.isConnected;
    }
    /**
     * Obtient le SDP local
     */
    getLocalSDP() {
        return this.localSDP;
    }
    /**
     * Obtient le SDP distant
     */
    getRemoteSDP() {
        return this.remoteSDP;
    }
    /**
     * Ferme la connexion WebRTC
     */
    async close() {
        this.log.debug('[WebRTC] Fermeture connexion...');
        try {
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = undefined;
            }
            this.videoTrack = undefined;
            this.isConnected = false;
            this.localSDP = undefined;
            this.remoteSDP = undefined;
            this.log.info('[WebRTC] Connexion fermée');
        }
        catch (error) {
            this.log.error('[WebRTC] Erreur fermeture:', error);
        }
    }
    /**
     * Génère un UUID v4 pour sessionId
     */
    static generateSessionId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
exports.ComelitWebRTCAdapter = ComelitWebRTCAdapter;
//# sourceMappingURL=ComelitWebRTCAdapter.js.map