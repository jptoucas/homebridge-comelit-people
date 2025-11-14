"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GStreamerWebRTC = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
/**
 * Wrapper pour utiliser GStreamer webrtcbin pour gérer WebRTC avec Comelit
 * GStreamer va:
 * 1. Créer une connexion WebRTC
 * 2. Établir la connexion DTLS avec le TURN relay Comelit
 * 3. Déchiffrer les paquets SRTP
 * 4. Envoyer le RTP en clair sur un port UDP local
 * 5. FFmpeg pourra ensuite lire depuis ce port UDP
 */
class GStreamerWebRTC extends events_1.EventEmitter {
    constructor(config, log) {
        super();
        this.config = {
            outputHost: '127.0.0.1',
            ...config,
        };
        this.log = log;
    }
    /**
     * Démarre GStreamer en mode WebRTC
     * Pipeline: webrtcbin ! rtph264depay ! h264parse ! udpsink
     */
    async start() {
        if (!this.config.remoteSdp) {
            throw new Error('remoteSdp requis avant de démarrer GStreamer');
        }
        this.log.info('[GStreamer] Démarrage pipeline WebRTC');
        // Pipeline GStreamer:
        // webrtcbin: Gère WebRTC (ICE, DTLS, SRTP)
        // rtph264depay: Extrait H.264 depuis RTP
        // h264parse: Parse le stream H.264
        // udpsink: Envoie sur UDP local
        const pipeline = [
            'webrtcbin', 'name=sendrecv',
            '!', 'rtph264depay',
            '!', 'h264parse',
            '!', 'udpsink',
            `host=${this.config.outputHost}`,
            `port=${this.config.outputPort}`,
        ];
        this.log.info('[GStreamer] Pipeline:', pipeline.join(' '));
        // Lancer GStreamer
        this.process = (0, child_process_1.spawn)('gst-launch-1.0', pipeline, {
            env: process.env,
        });
        // Log stdout
        this.process.stdout?.on('data', (data) => {
            this.log.debug('[GStreamer OUT]', data.toString());
        });
        // Log stderr (GStreamer log tout sur stderr)
        this.process.stderr?.on('data', (data) => {
            const msg = data.toString();
            this.log.debug('[GStreamer ERR]', msg);
            // Détecter les événements importants
            if (msg.includes('ICE connection state:')) {
                this.log.info('[GStreamer] ICE:', msg.trim());
            }
            if (msg.includes('DTLS connection state:')) {
                this.log.info('[GStreamer] DTLS:', msg.trim());
            }
        });
        // Erreurs
        this.process.on('error', (error) => {
            this.log.error('[GStreamer] Erreur:', error);
            this.emit('error', error);
        });
        // Exit
        this.process.on('exit', (code, signal) => {
            if (code !== 0) {
                this.log.error(`[GStreamer] Exit code ${code}`);
            }
            this.emit('exit', code, signal);
        });
        // Attendre un peu que GStreamer démarre
        await new Promise(resolve => setTimeout(resolve, 1000));
        // TODO: Envoyer les SDP via les signaux GStreamer
        // Pour l'instant, on va utiliser une approche plus simple
        this.log.info('[GStreamer] Pipeline démarré');
    }
    /**
     * Arrête GStreamer
     */
    stop() {
        if (this.process) {
            this.log.info('[GStreamer] Arrêt du pipeline');
            this.process.kill('SIGTERM');
            this.process = undefined;
        }
    }
    /**
     * Vérifie si GStreamer est en cours d'exécution
     */
    isRunning() {
        return this.process !== undefined && !this.process.killed;
    }
}
exports.GStreamerWebRTC = GStreamerWebRTC;
//# sourceMappingURL=GStreamerWebRTC.js.map