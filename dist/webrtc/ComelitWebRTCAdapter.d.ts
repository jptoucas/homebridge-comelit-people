/**
 * Adaptateur WebRTC pour Comelit utilisant node-datachannel (libdatachannel)
 * Alternative à werift avec support natif des media tracks
 */
import { Logging } from 'homebridge';
export interface ComelitWebRTCConfig {
    iceServers: string[];
    sessionId: string;
    endpointId: string;
    apiToken: string;
    apiUrl: string;
}
export interface ComelitStreamInfo {
    localPort: number;
    remoteAddress?: string;
    remotePort?: number;
}
/**
 * Gère la connexion WebRTC avec l'API Comelit via libdatachannel
 */
export declare class ComelitWebRTCAdapter {
    private readonly config;
    private readonly log;
    private peerConnection?;
    private videoTrack?;
    private localSDP?;
    private remoteSDP?;
    private localPort;
    private isConnected;
    constructor(config: ComelitWebRTCConfig, log: Logging);
    /**
     * Initialise la connexion WebRTC
     */
    initialize(): Promise<void>;
    /**
     * Configure les callbacks WebRTC
     */
    private setupCallbacks;
    /**
     * Crée un track vidéo pour recevoir le flux Comelit
     */
    createVideoTrack(): Promise<void>;
    /**
     * Envoie le SDP Offer à l'API Comelit
     */
    private sendOfferToComelit;
    /**
     * Configure la réponse SDP de Comelit
     */
    private setRemoteAnswer;
    /**
     * Récupère les informations de streaming
     */
    getStreamInfo(): ComelitStreamInfo;
    /**
     * Vérifie si la connexion est établie
     */
    isConnectionEstablished(): boolean;
    /**
     * Obtient le SDP local
     */
    getLocalSDP(): string | undefined;
    /**
     * Obtient le SDP distant
     */
    getRemoteSDP(): string | undefined;
    /**
     * Ferme la connexion WebRTC
     */
    close(): Promise<void>;
    /**
     * Génère un UUID v4 pour sessionId
     */
    static generateSessionId(): string;
}
//# sourceMappingURL=ComelitWebRTCAdapter.d.ts.map