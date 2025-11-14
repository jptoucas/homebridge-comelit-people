import { PlatformAccessory, PrepareStreamCallback, PrepareStreamRequest, SnapshotRequest, SnapshotRequestCallback, StreamingRequest, StreamRequestCallback, CameraStreamingDelegate } from 'homebridge';
import { ComelitPlatform } from '../platform';
/**
 * Accessoire Sonnette/Caméra Comelit
 */
export declare class ComelitDoorbellAccessory implements CameraStreamingDelegate {
    private readonly platform;
    private readonly accessory;
    private readonly doorbellService;
    private readonly motionService;
    private cameraController?;
    private cameraId;
    private endpointId;
    private pendingSessions;
    private ongoingSessions;
    constructor(platform: ComelitPlatform, accessory: PlatformAccessory);
    /**
     * Configure la caméra
     */
    private setupCamera;
    /**
     * Polling pour détecter les événements de sonnerie
     */
    private startDoorbellPolling;
    /**
     * Déclenche un événement de sonnerie
     */
    private triggerDoorbellEvent;
    /**
     * Gère les snapshots (images fixes)
     */
    handleSnapshotRequest(request: SnapshotRequest, callback: SnapshotRequestCallback): Promise<void>;
    /**
     * Prépare le stream vidéo
     */
    prepareStream(request: PrepareStreamRequest, callback: PrepareStreamCallback): Promise<void>;
    /**
     * Gère les requêtes de streaming
     */
    handleStreamRequest(request: StreamingRequest, callback: StreamRequestCallback): Promise<void>;
    /**
     * Démarre le streaming vidéo avec WebRTC (génération SDP manuelle)
     */
    private startStream;
    /**
     * Génère un SDP Offer pour Comelit
     */
    private generateSDPOffer;
    /**
     * Démarre FFmpeg pour lire depuis un socket UDP local (RTP déchiffré par werift)
     */
    private startFFmpegFromLocalSocket;
    /**
     * Démarre FFmpeg pour transcoder le flux Comelit vers HomeKit
     */
    private startFFmpegTranscoding;
    /**
     * Démarre un flux placeholder (image noire) si le flux réel échoue
     */
    private startPlaceholderStream;
    /**
     * Démarre FFmpeg pour lire le RTP déchiffré depuis le proxy Go (UDP:55000)
     * et l'envoyer vers HomeKit en SRTP
     */
    private startFFmpegFromUDP;
    /**
     * Arrête le streaming vidéo
     */
    private stopStream;
}
//# sourceMappingURL=doorbell.d.ts.map