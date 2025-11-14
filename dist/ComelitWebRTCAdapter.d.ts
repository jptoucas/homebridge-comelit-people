import { Logger } from 'homebridge';
/**
 * ComelitWebRTCAdapter
 *
 * Gère les connexions WebRTC avec les caméras Comelit en générant
 * manuellement des SDP Offers compatibles avec l'API Comelit.
 *
 * DÉCOUVERTE CRITIQUE: Comelit EXIGE audio + video, même pour caméras.
 * L'ajout de la piste audio est obligatoire pour que l'API accepte l'offer.
 */
export declare class ComelitWebRTCAdapter {
    private readonly log;
    private readonly token;
    private readonly baseUrl;
    private peerConnection?;
    private videoTrack?;
    private webrtcProxyProcess?;
    private onVideoDataCallback?;
    constructor(log: Logger, token: string, baseUrl?: string);
    /**
     * Génère un SDP Offer compatible Comelit
     * Format basé sur l'analyse des traces réseau iOS:
     * - Audio: opus/48000, PCMA/8000, PCMU/8000 (sendrecv)
     * - Video: H.264 profiles 640c29, 42e029 (recvonly)
     * - BUNDLE audio+video
     * - ICE candidates (au moins 1 par média)
     */
    private generateSdpOffer;
    /**
     * Ferme une session WebRTC active sur une caméra
     * @param cameraId Identifiant de la caméra
     * @param sessionId ID de la session à fermer (optionnel)
     */
    closeSession(cameraId: string, sessionId?: string): Promise<void>;
    /**
     * Établit une session WebRTC avec une caméra Comelit
     * NOUVELLE ARCHITECTURE (2-way handshake):
     * 1. Fermer sessions existantes
     * 2. Lancer proxy Go (génère offer Pion)
     * 3. Récupérer offer via stdout
     * 4. Envoyer offer à Comelit
     * 5. Recevoir answer de Comelit
     * 6. Envoyer answer au proxy via stdin
     * 7. Proxy finalise connexion ICE/DTLS/SRTP
     *
     * @param cameraId Identifiant de la caméra (format: _DA_xxx...xxx)
     * @returns Informations de connexion (SDP Answer, ICE, TURN)
     */
    connectToCamera(cameraId: string): Promise<WebRTCConnection>;
    /**
     * Détermine le nom du binaire proxy selon la plateforme
     */
    private getProxyBinaryName;
    /**
     * Démarre le proxy Go et récupère l'offer SDP généré par Pion
     * @returns SDP Offer généré par le proxy Pion
     */
    private startProxyAndGetOffer;
    /**
     * Arrête le proxy WebRTC Go
     */
    stopWebRTCProxy(): void;
    /**
     * Ferme la session WebRTC côté Comelit (DELETE sur l'API)
     */
    closeComelitSession(cameraId: string, sessionId: string): Promise<void>;
    /**
     * Enregistre un callback pour recevoir les données vidéo RTP
     */
    onVideoData(callback: (data: Buffer) => void): void;
    /**
     * Ferme la connexion WebRTC
     */
    close(): void;
    /**
     * Parse le SDP Answer de Comelit pour extraire les informations de connexion
     */
    private parseAnswer;
    private generateUUID;
    private generateRandomString;
    private generateFingerprint;
    private random32bit;
}
/**
 * Informations de connexion WebRTC extraites du SDP Answer
 */
export interface WebRTCConnection {
    sessionId: string;
    audioCodec: string;
    videoCodec: string;
    videoProfile: string;
    turnServer: string;
    turnPort: number;
    iceUfrag: string;
    icePwd: string;
    fingerprint: string;
    audioSSRC: number;
    videoSSRC: number;
    localOffer?: string;
    remoteAnswer?: string;
    peerConnection?: any;
    videoTrack?: any;
    cameraId?: string;
}
//# sourceMappingURL=ComelitWebRTCAdapter.d.ts.map