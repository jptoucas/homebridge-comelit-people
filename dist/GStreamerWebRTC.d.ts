import { EventEmitter } from 'events';
import { Logger } from 'homebridge';
export interface GStreamerConfig {
    sessionId: string;
    localSdp: string;
    remoteSdp?: string;
    outputPort: number;
    outputHost?: string;
}
/**
 * Wrapper pour utiliser GStreamer webrtcbin pour gérer WebRTC avec Comelit
 * GStreamer va:
 * 1. Créer une connexion WebRTC
 * 2. Établir la connexion DTLS avec le TURN relay Comelit
 * 3. Déchiffrer les paquets SRTP
 * 4. Envoyer le RTP en clair sur un port UDP local
 * 5. FFmpeg pourra ensuite lire depuis ce port UDP
 */
export declare class GStreamerWebRTC extends EventEmitter {
    private process?;
    private config;
    private log;
    constructor(config: GStreamerConfig, log: Logger);
    /**
     * Démarre GStreamer en mode WebRTC
     * Pipeline: webrtcbin ! rtph264depay ! h264parse ! udpsink
     */
    start(): Promise<void>;
    /**
     * Arrête GStreamer
     */
    stop(): void;
    /**
     * Vérifie si GStreamer est en cours d'exécution
     */
    isRunning(): boolean;
}
//# sourceMappingURL=GStreamerWebRTC.d.ts.map