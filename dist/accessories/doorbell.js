"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComelitDoorbellAccessory = void 0;
const child_process_1 = require("child_process");
const ComelitWebRTCAdapter_1 = require("../ComelitWebRTCAdapter");
/**
 * Accessoire Sonnette/Caméra Comelit
 */
class ComelitDoorbellAccessory {
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        this.pendingSessions = new Map();
        this.ongoingSessions = new Map();
        // Stocker l'endpoint ID complet et extraire l'ID court
        this.endpointId = accessory.context.device.endpointId;
        const parts = this.endpointId.split('#');
        this.cameraId = parts[parts.length - 1];
        // Informations de l'accessoire
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Comelit Group S.p.a.')
            .setCharacteristic(this.platform.Characteristic.Model, 'Video Doorbell')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.cameraId);
        // Service de sonnette
        this.doorbellService = this.accessory.getService(this.platform.Service.Doorbell)
            || this.accessory.addService(this.platform.Service.Doorbell);
        this.doorbellService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.friendlyName);
        // Service de détection de mouvement
        this.motionService = this.accessory.getService(this.platform.Service.MotionSensor)
            || this.accessory.addService(this.platform.Service.MotionSensor);
        // Configuration de la caméra si activée
        if (this.platform.config.enableCamera) {
            this.setupCamera();
            // Capturer le premier snapshot au démarrage
            this.captureSnapshot().catch(err => this.platform.log.error('Erreur lors de la capture du snapshot initial:', err));
            // Configurer le rafraîchissement périodique si demandé
            const refreshInterval = this.platform.config.snapshotRefreshInterval || 0;
            if (refreshInterval > 0) {
                this.platform.log.info(`📸 Snapshots activés: rafraîchissement toutes les ${refreshInterval}s`);
                this.snapshotRefreshTimer = setInterval(() => {
                    this.captureSnapshot().catch(err => this.platform.log.error('Erreur lors du rafraîchissement du snapshot:', err));
                }, refreshInterval * 1000);
            }
            else {
                this.platform.log.info('📸 Snapshots: capture uniquement au démarrage');
            }
        }
        // Polling pour détecter les sonneries
        this.startDoorbellPolling();
        this.platform.log.info('Sonnette/Caméra initialisée:', accessory.context.device.friendlyName);
    }
    /**
     * Configure la caméra
     */
    setupCamera() {
        const options = {
            cameraStreamCount: 2, // Nombre de streams simultanés
            delegate: this,
            streamingOptions: {
                supportedCryptoSuites: [0], // HAP_CRYPTO_SUITE_NONE
                video: {
                    resolutions: [
                        [1920, 1080, 30],
                        [1280, 720, 30],
                        [640, 480, 30],
                        [320, 240, 15],
                    ],
                    codec: {
                        profiles: [0, 1, 2], // H264 profiles
                        levels: [0, 1, 2],
                    },
                },
                audio: {
                    twoWayAudio: false,
                    codecs: [
                        {
                            type: "AAC-eld" /* AudioStreamingCodecType.AAC_ELD */,
                            samplerate: 16 /* AudioStreamingSamplerate.KHZ_16 */,
                        },
                    ],
                },
            },
        };
        this.cameraController = new this.platform.api.hap.CameraController(options);
        this.accessory.configureController(this.cameraController);
        this.platform.log.info('Caméra configurée pour:', this.accessory.context.device.friendlyName);
    }
    /**
     * Polling pour détecter les événements de sonnerie
     */
    startDoorbellPolling() {
        const pollInterval = this.platform.config.pollInterval || 30000;
        setInterval(async () => {
            try {
                const messages = await this.platform.comelitAPI.getMessages('VIP_EVENT', 'DOORBELL', 1);
                if (messages && messages.length > 0) {
                    const lastMessage = messages[0];
                    const messageTime = new Date(lastMessage.timestamp).getTime();
                    const now = Date.now();
                    // Si le message est récent (moins de 1 minute)
                    if (now - messageTime < 60000) {
                        this.triggerDoorbellEvent();
                    }
                }
            }
            catch (error) {
                // Ignorer les erreurs de polling silencieusement
            }
        }, pollInterval);
    }
    /**
     * Déclenche un événement de sonnerie
     */
    triggerDoorbellEvent() {
        this.platform.log.info('🔔 Sonnerie détectée!');
        // Déclencher la sonnette
        this.doorbellService.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
        // Déclencher le détecteur de mouvement
        this.motionService.updateCharacteristic(this.platform.Characteristic.MotionDetected, true);
        // Réinitialiser le mouvement après 10 secondes
        setTimeout(() => {
            this.motionService.updateCharacteristic(this.platform.Characteristic.MotionDetected, false);
        }, 10000);
    }
    /**
     * Gère les snapshots (images fixes)
     */
    async handleSnapshotRequest(request, callback) {
        this.platform.log.debug('Snapshot demandé:', request);
        try {
            // Retourner le snapshot en cache s'il existe
            if (this.cachedSnapshot) {
                callback(undefined, this.cachedSnapshot);
            }
            else {
                // Si pas de cache, capturer maintenant
                this.platform.log.warn('Aucun snapshot en cache, capture en cours...');
                const snapshot = await this.captureSnapshot();
                callback(undefined, snapshot);
            }
        }
        catch (error) {
            this.platform.log.error('Erreur lors de la capture du snapshot:', error);
            callback(error);
        }
    }
    /**
     * Capture un snapshot depuis le flux WebRTC via FFmpeg
     *
     * NOTE: Pour l'instant génère un snapshot placeholder
     * TODO: Implémenter la vraie capture depuis WebRTC une fois que les sessions temporaires seront optimisées
     */
    async captureSnapshot() {
        return new Promise((resolve, reject) => {
            this.platform.log.debug('📸 Génération snapshot placeholder...');
            // Générer une image JPEG 640x480 grise avec texte (placeholder)
            // En production, ceci devrait capturer depuis le flux WebRTC
            const width = 640;
            const height = 480;
            const ffmpegArgs = [
                '-f', 'lavfi',
                '-i', `color=gray:s=${width}x${height}`,
                '-frames:v', '1',
                '-f', 'image2',
                '-vcodec', 'mjpeg',
                '-q:v', '5',
                'pipe:1',
            ];
            const chunks = [];
            const ffmpegProcess = (0, child_process_1.spawn)('ffmpeg', ffmpegArgs);
            ffmpegProcess.stdout?.on('data', (chunk) => {
                chunks.push(chunk);
            });
            ffmpegProcess.stderr?.on('data', (data) => {
                this.platform.log.debug('FFmpeg:', data.toString());
            });
            ffmpegProcess.on('close', (code) => {
                if (code === 0 && chunks.length > 0) {
                    const snapshot = Buffer.concat(chunks);
                    this.cachedSnapshot = snapshot;
                    this.platform.log.info(`✅ Snapshot capturé: ${(snapshot.length / 1024).toFixed(1)} KB (placeholder)`);
                    resolve(snapshot);
                }
                else {
                    reject(new Error(`FFmpeg failed with code ${code}`));
                }
            });
            ffmpegProcess.on('error', (error) => {
                this.platform.log.error('Erreur FFmpeg:', error);
                reject(error);
            });
            // Timeout de 5 secondes
            setTimeout(() => {
                if (ffmpegProcess && !ffmpegProcess.killed) {
                    ffmpegProcess.kill('SIGKILL');
                    reject(new Error('Timeout lors de la génération du snapshot'));
                }
            }, 5000);
        });
    }
    /**
     * Prépare le stream vidéo
     */
    async prepareStream(request, callback) {
        this.platform.log.info('📹 Préparation du stream vidéo...');
        const sessionId = request.sessionID;
        const targetAddress = request.targetAddress;
        const videoPort = request.video.port;
        const videoSrtpKey = request.video.srtp_key;
        const videoSrtpSalt = request.video.srtp_salt;
        const audioPort = request.audio.port;
        const audioSrtpKey = request.audio.srtp_key;
        const audioSrtpSalt = request.audio.srtp_salt;
        const response = {
            address: targetAddress,
            video: {
                port: videoPort,
                ssrc: 1,
                srtp_key: videoSrtpKey,
                srtp_salt: videoSrtpSalt,
            },
            audio: {
                port: audioPort,
                ssrc: 2,
                srtp_key: audioSrtpKey,
                srtp_salt: audioSrtpSalt,
            },
        };
        this.pendingSessions.set(sessionId, {
            request,
            response,
        });
        callback(undefined, response);
    }
    /**
     * Gère les requêtes de streaming
     */
    async handleStreamRequest(request, callback) {
        const sessionId = request.sessionID;
        switch (request.type) {
            case "start" /* StreamRequestTypes.START */:
                await this.startStream(sessionId, request);
                break;
            case "stop" /* StreamRequestTypes.STOP */:
                await this.stopStream(sessionId);
                break;
            case "reconfigure" /* StreamRequestTypes.RECONFIGURE */:
                this.platform.log.debug('Reconfiguration du stream demandée (ignoré)');
                break;
        }
        callback();
    }
    /**
     * Démarre le streaming vidéo avec WebRTC (génération SDP manuelle)
     */
    async startStream(sessionId, request) {
        const sessionInfo = this.pendingSessions.get(sessionId);
        if (!sessionInfo) {
            this.platform.log.error('Session inconnue:', sessionId);
            return;
        }
        const video = request.video;
        const audio = request.audio;
        this.platform.log.info(`🎥 Démarrage du stream: ${video.width}x${video.height} @ ${video.fps}fps`);
        try {
            // IMPORTANT: Démarrer FFmpeg AVANT WebRTC pour qu'il écoute sur UDP:55000
            // Sinon le proxy Go envoie vers un port fermé !
            this.platform.log.info('🎬 Pré-démarrage FFmpeg (écoute UDP:55000)...');
            const ffmpegProcess = this.startFFmpegFromUDP(sessionInfo.response.address, sessionInfo.response.video.port, sessionInfo.response.video.srtp_key, sessionInfo.response.video.srtp_salt, sessionInfo.response.video.ssrc, video.width, video.height, video.fps);
            // Attendre 500ms que FFmpeg ouvre le port UDP:55000
            await new Promise(resolve => setTimeout(resolve, 500));
            // Maintenant connecter WebRTC (le proxy Go pourra envoyer vers FFmpeg)
            this.platform.log.info('🔧 Connexion WebRTC à Comelit...');
            const webrtcAdapter = new ComelitWebRTCAdapter_1.ComelitWebRTCAdapter(this.platform.log, this.platform.comelitAPI.getToken());
            // Établir la connexion WebRTC avec la caméra (échange SDP + proxy Go DTLS)
            const connection = await webrtcAdapter.connectToCamera(this.endpointId);
            this.platform.log.info('✅ Connexion WebRTC établie avec Comelit');
            this.platform.log.info(`📡 TURN: ${connection.turnServer}:${connection.turnPort}`);
            this.platform.log.info(`🎬 Codecs: ${connection.audioCodec}/${connection.videoCodec}`);
            this.platform.log.info('🚀 Proxy Go → FFmpeg (UDP:55000) → HomeKit');
            this.ongoingSessions.set(sessionId, {
                ffmpegProcess,
                peerConnection: webrtcAdapter,
                webrtcSessionId: connection.sessionId,
            });
            this.pendingSessions.delete(sessionId);
            this.platform.log.info('✅ Pipeline vidéo complet démarré !');
        }
        catch (error) {
            this.platform.log.error('❌ Erreur lors du démarrage du stream:', error);
            // Démarrer quand même un flux placeholder pour éviter que HomeKit plante
            const ffmpegProcess = this.startPlaceholderStream(sessionInfo.response.address, sessionInfo.response.video.port, sessionInfo.response.video.srtp_key, sessionInfo.response.video.srtp_salt, sessionInfo.response.video.ssrc, video.width, video.height, video.fps);
            this.ongoingSessions.set(sessionId, {
                ffmpegProcess,
            });
            this.pendingSessions.delete(sessionId);
        }
    }
    /**
     * Génère un SDP Offer pour Comelit
     */
    generateSDPOffer(sessionInfo) {
        const sessionId = Date.now();
        const iceUfrag = Math.random().toString(36).substring(2, 10);
        const icePwd = Math.random().toString(36).substring(2, 26);
        const fingerprint = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase();
        // Générer des ports aléatoires pour les media
        const audioPort = Math.floor(Math.random() * (65535 - 49152) + 49152);
        const videoPort = Math.floor(Math.random() * (65535 - 49152) + 49152);
        const dataPort = Math.floor(Math.random() * (65535 - 49152) + 49152);
        // Obtenir l'IP locale (fallback vers 192.168.1.40 si problème)
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        let localIP = '192.168.1.40'; // Default
        for (const [name, nets] of Object.entries(networkInterfaces)) {
            if (!nets)
                continue;
            for (const net of nets) {
                // Chercher IPv4 non-interne (pas 127.0.0.1)
                if (net.family === 'IPv4' && !net.internal) {
                    localIP = net.address;
                    break;
                }
            }
            if (localIP !== '192.168.1.40')
                break;
        }
        // Générer un candidat ICE (foundation aléatoire)
        const foundation = Math.floor(Math.random() * 4000000000);
        // Générer un SDP Offer compatible avec l'app iOS/Comelit (basé sur vraie trace)
        // Format: \r\n comme séparateur de ligne (standard SDP)
        const sdpLines = [
            'v=0',
            `o=- ${sessionId} 2 IN IP4 127.0.0.1`,
            's=-',
            't=0 0',
            'a=group:BUNDLE 0 1 2',
            'a=extmap-allow-mixed',
            'a=msid-semantic: WMS',
            // Media audio (mid:0) - multiples codecs comme iOS
            `m=audio ${audioPort} UDP/TLS/RTP/SAVPF 111 0 8`,
            `c=IN IP4 ${localIP}`,
            'a=rtcp:9 IN IP4 0.0.0.0',
            `a=candidate:${foundation} 1 udp 2122129151 ${localIP} ${audioPort} typ host generation 0 network-id 1`,
            `a=ice-ufrag:${iceUfrag}`,
            `a=ice-pwd:${icePwd}`,
            'a=ice-options:trickle renomination',
            `a=fingerprint:sha-256 ${fingerprint}`,
            'a=setup:actpass',
            'a=mid:0',
            'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level',
            'a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
            'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
            'a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid',
            'a=sendrecv',
            'a=msid:- HOMEBRIDGE-AUDIO',
            'a=rtcp-mux',
            'a=rtpmap:111 opus/48000/2',
            'a=rtcp-fb:111 transport-cc',
            'a=fmtp:111 minptime=10;useinbandfec=1',
            'a=rtpmap:0 PCMU/8000',
            'a=rtpmap:8 PCMA/8000',
            // Media video (mid:1) - H264 comme iOS
            `m=video ${videoPort} UDP/TLS/RTP/SAVPF 96 98`,
            `c=IN IP4 ${localIP}`,
            'a=rtcp:9 IN IP4 0.0.0.0',
            `a=candidate:${foundation} 1 udp 2122129151 ${localIP} ${videoPort} typ host generation 0 network-id 1`,
            `a=ice-ufrag:${iceUfrag}`,
            `a=ice-pwd:${icePwd}`,
            'a=ice-options:trickle renomination',
            `a=fingerprint:sha-256 ${fingerprint}`,
            'a=setup:actpass',
            'a=mid:1',
            'a=extmap:14 urn:ietf:params:rtp-hdrext:toffset',
            'a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
            'a=extmap:13 urn:3gpp:video-orientation',
            'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
            'a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay',
            'a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type',
            'a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing',
            'a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space',
            'a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid',
            'a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id',
            'a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id',
            'a=recvonly',
            'a=rtcp-mux',
            'a=rtcp-rsize',
            'a=rtpmap:96 H264/90000',
            'a=rtcp-fb:96 goog-remb',
            'a=rtcp-fb:96 transport-cc',
            'a=rtcp-fb:96 ccm fir',
            'a=rtcp-fb:96 nack',
            'a=rtcp-fb:96 nack pli',
            'a=fmtp:96 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640c29',
            'a=rtpmap:98 H264/90000',
            'a=rtcp-fb:98 goog-remb',
            'a=rtcp-fb:98 transport-cc',
            'a=rtcp-fb:98 ccm fir',
            'a=rtcp-fb:98 nack',
            'a=rtcp-fb:98 nack pli',
            'a=fmtp:98 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e029',
            // Media datachannel (mid:2) - comme iOS
            `m=application ${dataPort} UDP/DTLS/SCTP webrtc-datachannel`,
            `c=IN IP4 ${localIP}`,
            `a=candidate:${foundation} 1 udp 2122129151 ${localIP} ${dataPort} typ host generation 0 network-id 1`,
            `a=ice-ufrag:${iceUfrag}`,
            `a=ice-pwd:${icePwd}`,
            'a=ice-options:trickle renomination',
            `a=fingerprint:sha-256 ${fingerprint}`,
            'a=setup:actpass',
            'a=mid:2',
            'a=sctp-port:5000',
            'a=max-message-size:262144',
        ];
        return {
            sdp: sdpLines.join('\r\n') + '\r\n',
            videoPort: videoPort,
        };
    }
    /**
     * Démarre FFmpeg pour lire depuis un socket UDP local (RTP déchiffré par werift)
     */
    startFFmpegFromLocalSocket(localPort, targetIP, targetPort, srtpKey, srtpSalt, ssrc, width, height, fps) {
        this.platform.log.info(`🎬 Démarrage FFmpeg depuis socket local 127.0.0.1:${localPort} -> ${targetIP}:${targetPort}`);
        // FFmpeg attend les paramètres SRTP au format: base64(key + salt)
        const srtpKeyAndSalt = Buffer.concat([srtpKey, srtpSalt]);
        const srtpParams = srtpKeyAndSalt.toString('base64');
        // FFmpeg lit le RTP déchiffré depuis le socket local
        const args = [
            '-protocol_whitelist', 'pipe,udp,rtp,file,crypto',
            '-i', `rtp://127.0.0.1:${localPort}?timeout=10000000`,
            '-map', '0:v',
            '-vcodec', 'copy',
            '-f', 'rtp',
            '-payload_type', '99',
            '-ssrc', ssrc.toString(),
            '-srtp_out_suite', 'AES_CM_128_HMAC_SHA1_80',
            '-srtp_out_params', srtpParams,
            `srtp://${targetIP}:${targetPort}?rtcpport=${targetPort}&pkt_size=1316`,
        ];
        this.platform.log.info('Commande FFmpeg:', 'ffmpeg ' + args.join(' '));
        const ffmpeg = (0, child_process_1.spawn)('ffmpeg', args, { env: process.env });
        ffmpeg.stdout?.on('data', (data) => {
            this.platform.log.info('FFmpeg stdout:', data.toString());
        });
        ffmpeg.stderr?.on('data', (data) => {
            this.platform.log.info('FFmpeg stderr:', data.toString());
        });
        ffmpeg.on('error', (error) => {
            this.platform.log.error('Erreur FFmpeg:', error);
        });
        ffmpeg.on('exit', (code, signal) => {
            if (code !== 0 && code !== null) {
                this.platform.log.error(`FFmpeg s'est arrêté avec le code ${code}`);
            }
        });
        return ffmpeg;
    }
    /**
     * Démarre FFmpeg pour transcoder le flux Comelit vers HomeKit
     */
    startFFmpegTranscoding(remoteIP, localPort, // Port local pour recevoir les paquets RTP
    targetIP, targetPort, srtpKey, srtpSalt, ssrc, width, height, fps) {
        this.platform.log.info(`🎬 Démarrage FFmpeg: écoute sur 0.0.0.0:${localPort} (remote: ${remoteIP}) -> ${targetIP}:${targetPort}`);
        // FFmpeg attend les paramètres SRTP au format: base64(key + salt)
        const srtpKeyAndSalt = Buffer.concat([srtpKey, srtpSalt]);
        const srtpParams = srtpKeyAndSalt.toString('base64');
        // FFmpeg doit écouter sur un port local (mode serveur UDP) au lieu de se connecter à l'IP relay
        // car le relay Comelit va nous envoyer les paquets RTP
        const args = [
            '-protocol_whitelist', 'pipe,udp,rtp,file,crypto',
            '-i', `rtp://0.0.0.0:${localPort}?timeout=5000000`, // Écouter sur toutes les interfaces
            '-map', '0:v',
            '-vcodec', 'copy',
            '-f', 'rtp',
            '-payload_type', '99',
            '-ssrc', ssrc.toString(),
            '-srtp_out_suite', 'AES_CM_128_HMAC_SHA1_80',
            '-srtp_out_params', srtpParams,
            `srtp://${targetIP}:${targetPort}?rtcpport=${targetPort}&pkt_size=1316`,
        ];
        this.platform.log.info('Commande FFmpeg:', 'ffmpeg ' + args.join(' '));
        const ffmpeg = (0, child_process_1.spawn)('ffmpeg', args, { env: process.env });
        ffmpeg.stdout?.on('data', (data) => {
            this.platform.log.info('FFmpeg stdout:', data.toString());
        });
        ffmpeg.stderr?.on('data', (data) => {
            this.platform.log.info('FFmpeg stderr:', data.toString());
        });
        ffmpeg.on('error', (error) => {
            this.platform.log.error('Erreur FFmpeg:', error);
        });
        ffmpeg.on('exit', (code, signal) => {
            if (code !== 0 && code !== null) {
                this.platform.log.error(`FFmpeg s'est arrêté avec le code ${code}`);
            }
        });
        return ffmpeg;
    }
    /**
     * Démarre un flux placeholder (image noire) si le flux réel échoue
     */
    startPlaceholderStream(targetIP, targetPort, srtpKey, srtpSalt, ssrc, width, height, fps) {
        // FFmpeg attend les paramètres SRTP au format: base64(key + salt)
        // La clé fait 16 bytes, le salt fait 14 bytes
        const srtpKeyAndSalt = Buffer.concat([srtpKey, srtpSalt]);
        const srtpParams = srtpKeyAndSalt.toString('base64');
        this.platform.log.debug(`SRTP Key: ${srtpKey.length} bytes, Salt: ${srtpSalt.length} bytes`);
        this.platform.log.debug(`SRTP Params (base64): ${srtpParams}`);
        // Générer une image noire avec un message
        const args = [
            '-f', 'lavfi',
            '-i', `color=black:s=${width}x${height}:r=${fps}`,
            '-vcodec', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-pix_fmt', 'yuv420p',
            '-b:v', '300k',
            '-f', 'rtp',
            '-payload_type', '99',
            '-ssrc', ssrc.toString(),
            '-srtp_out_suite', 'AES_CM_128_HMAC_SHA1_80',
            '-srtp_out_params', srtpParams,
            `srtp://${targetIP}:${targetPort}?rtcpport=${targetPort}&pkt_size=1316`,
        ];
        this.platform.log.debug('Flux placeholder avec FFmpeg');
        const ffmpeg = (0, child_process_1.spawn)('ffmpeg', args, { env: process.env });
        ffmpeg.stderr?.on('data', (data) => {
            this.platform.log.info('FFmpeg placeholder:', data.toString());
        });
        ffmpeg.on('error', (error) => {
            this.platform.log.error('Erreur FFmpeg placeholder:', error);
        });
        return ffmpeg;
    }
    /**
     * Démarre FFmpeg pour lire le RTP déchiffré depuis le proxy Go (UDP:55000)
     * et l'envoyer vers HomeKit en SRTP
     */
    startFFmpegFromUDP(targetIP, targetPort, srtpKey, srtpSalt, ssrc, width, height, fps) {
        this.platform.log.info(`🎬 FFmpeg: UDP:55000 (proxy Go) -> SRTP:${targetIP}:${targetPort}`);
        // FFmpeg attend les paramètres SRTP au format: base64(key + salt)
        const srtpKeyAndSalt = Buffer.concat([srtpKey, srtpSalt]);
        const srtpParams = srtpKeyAndSalt.toString('base64');
        // Lire depuis UDP:55000 (sortie du proxy Go)
        // Le proxy envoie du RTP H.264 déchiffré
        // Créer un fichier SDP pour que FFmpeg écoute en mode serveur
        const sdpPath = `/tmp/ffmpeg-${Date.now()}.sdp`;
        const sdpContent = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=RTP Stream
c=IN IP4 127.0.0.1
t=0 0
m=video 55000 RTP/AVP 96
a=rtpmap:96 H264/90000`;
        require('fs').writeFileSync(sdpPath, sdpContent);
        const args = [
            '-protocol_whitelist', 'file,udp,rtp,crypto',
            '-i', sdpPath, // FFmpeg lit le SDP et écoute sur port 55000
            '-vcodec', 'copy', // Copie directe, pas de transcodage
            '-f', 'rtp',
            '-payload_type', '99',
            '-ssrc', ssrc.toString(),
            '-srtp_out_suite', 'AES_CM_128_HMAC_SHA1_80',
            '-srtp_out_params', srtpParams,
            `srtp://${targetIP}:${targetPort}?rtcpport=${targetPort}&pkt_size=1316`,
        ];
        this.platform.log.info('Commande FFmpeg:', 'ffmpeg ' + args.join(' '));
        const ffmpeg = (0, child_process_1.spawn)('ffmpeg', args, { env: process.env });
        ffmpeg.stdout?.on('data', (data) => {
            this.platform.log.debug('FFmpeg stdout:', data.toString());
        });
        ffmpeg.stderr?.on('data', (data) => {
            this.platform.log.info('FFmpeg:', data.toString());
        });
        ffmpeg.on('error', (error) => {
            this.platform.log.error('Erreur FFmpeg:', error);
        });
        ffmpeg.on('exit', (code, signal) => {
            if (code !== 0 && code !== null) {
                this.platform.log.error(`FFmpeg s'est arrêté avec le code ${code}`);
            }
        });
        return ffmpeg;
    }
    /**
     * Arrête le streaming vidéo
     */
    async stopStream(sessionId) {
        this.platform.log.info('Arrêt du stream:', sessionId);
        const session = this.ongoingSessions.get(sessionId);
        if (session) {
            // Fermer la session WebRTC côté Comelit AVANT de tuer le proxy
            if (session.webrtcSessionId && session.peerConnection) {
                try {
                    await session.peerConnection.closeComelitSession(this.endpointId, session.webrtcSessionId);
                }
                catch (error) {
                    this.platform.log.error('Erreur fermeture session Comelit:', error);
                }
            }
            // Arrêter le proxy WebRTC Go
            if (session.peerConnection && typeof session.peerConnection.stopWebRTCProxy === 'function') {
                session.peerConnection.stopWebRTCProxy();
                this.platform.log.info('[WebRTC] Connexion fermée');
            }
            // Fermer le socket UDP
            if (session.udpSocket) {
                session.udpSocket.close();
                this.platform.log.debug('Socket UDP fermé');
            }
            // Tuer le processus FFmpeg
            if (session.ffmpegProcess) {
                session.ffmpegProcess.kill('SIGKILL');
                this.platform.log.debug('Processus FFmpeg arrêté');
            }
            this.ongoingSessions.delete(sessionId);
        }
        this.pendingSessions.delete(sessionId);
    }
    /**
     * Nettoie les ressources lors de la suppression de l'accessoire
     */
    cleanup() {
        if (this.snapshotRefreshTimer) {
            clearInterval(this.snapshotRefreshTimer);
            this.platform.log.debug('Timer de rafraîchissement des snapshots arrêté');
        }
    }
}
exports.ComelitDoorbellAccessory = ComelitDoorbellAccessory;
//# sourceMappingURL=doorbell.js.map