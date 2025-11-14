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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComelitWebRTCAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * ComelitWebRTCAdapter
 *
 * Gère les connexions WebRTC avec les caméras Comelit en générant
 * manuellement des SDP Offers compatibles avec l'API Comelit.
 *
 * DÉCOUVERTE CRITIQUE: Comelit EXIGE audio + video, même pour caméras.
 * L'ajout de la piste audio est obligatoire pour que l'API accepte l'offer.
 */
class ComelitWebRTCAdapter {
    constructor(log, token, baseUrl = 'https://api.comelitgroup.com/servicerest') {
        this.log = log;
        this.token = token;
        this.baseUrl = baseUrl;
    }
    /**
     * Génère un SDP Offer compatible Comelit
     * Format basé sur l'analyse des traces réseau iOS:
     * - Audio: opus/48000, PCMA/8000, PCMU/8000 (sendrecv)
     * - Video: H.264 profiles 640c29, 42e029 (recvonly)
     * - BUNDLE audio+video
     * - ICE candidates (au moins 1 par média)
     */
    generateSdpOffer() {
        // Générer identifiants uniques
        const sessionId = this.generateUUID();
        const sessionIdNum = Math.floor(Math.random() * 9e15) + 1e15;
        const msid = this.generateUUID();
        // Générer credentials ICE/DTLS
        const iceUfrag = this.generateRandomString(4);
        const icePwd = this.generateRandomString(22);
        const fingerprint = this.generateFingerprint();
        // Générer SSRCs aléatoires
        const audioSSRC = this.random32bit();
        const audioCname = this.generateRandomString(16);
        // Adresse IP locale (placeholder - pourrait être détectée)
        const localIp = '192.168.1.100';
        const audioPort = 50000 + Math.floor(Math.random() * 1000);
        const videoPort = audioPort + 1;
        const sdp = `v=0
o=- ${sessionIdNum} 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1
a=extmap-allow-mixed
a=msid-semantic: WMS
m=audio 9 UDP/TLS/RTP/SAVPF 111 8 0
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=candidate:1 1 udp 2130706431 ${localIp} ${audioPort} typ host generation 0
a=ice-ufrag:${iceUfrag}
a=ice-pwd:${icePwd}
a=ice-options:trickle renomination
a=fingerprint:sha-256 ${fingerprint}
a=setup:actpass
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=sendrecv
a=msid:- ${msid}
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:8 PCMA/8000
a=rtpmap:0 PCMU/8000
a=ssrc:${audioSSRC} cname:${audioCname}
a=ssrc:${audioSSRC} msid:- ${msid}
m=video 9 UDP/TLS/RTP/SAVPF 96 98
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=candidate:1 1 udp 2130706431 ${localIp} ${videoPort} typ host generation 0
a=ice-ufrag:${iceUfrag}
a=ice-pwd:${icePwd}
a=ice-options:trickle renomination
a=fingerprint:sha-256 ${fingerprint}
a=setup:actpass
a=mid:1
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:13 urn:3gpp:video-orientation
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
a=recvonly
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:96 H264/90000
a=rtcp-fb:96 goog-remb
a=rtcp-fb:96 transport-cc
a=rtcp-fb:96 ccm fir
a=rtcp-fb:96 nack
a=rtcp-fb:96 nack pli
a=fmtp:96 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640c29
a=rtpmap:98 H264/90000
a=rtcp-fb:98 goog-remb
a=rtcp-fb:98 transport-cc
a=rtcp-fb:98 ccm fir
a=rtcp-fb:98 nack
a=rtcp-fb:98 nack pli
a=fmtp:98 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e029
`;
        return { sessionId, sdp };
    }
    /**
     * Ferme une session WebRTC active sur une caméra
     * @param cameraId Identifiant de la caméra
     * @param sessionId ID de la session à fermer (optionnel)
     */
    async closeSession(cameraId, sessionId) {
        try {
            const encodedCameraId = encodeURIComponent(cameraId);
            if (sessionId) {
                // Fermer une session spécifique
                this.log.info(`[WebRTC] 🔒 Fermeture session ${sessionId}`);
                await axios_1.default.delete(`${this.baseUrl}/devicecom/endpoint/${encodedCameraId}/rtc/${sessionId}`, {
                    headers: {
                        'Authorization': `ccstoken ${this.token}`,
                    },
                });
            }
            else {
                // Fermer toutes les sessions actives (tentative générique)
                this.log.info('[WebRTC] 🔒 Tentative fermeture sessions actives...');
                try {
                    await axios_1.default.delete(`${this.baseUrl}/devicecom/endpoint/${encodedCameraId}/rtc`, {
                        headers: {
                            'Authorization': `ccstoken ${this.token}`,
                        },
                    });
                }
                catch (error) {
                    // Ignorer les erreurs 404 (pas de session active)
                    if (axios_1.default.isAxiosError(error) && error.response?.status !== 404) {
                        throw error;
                    }
                }
            }
            this.log.info('[WebRTC] ✅ Session(s) fermée(s)');
        }
        catch (error) {
            this.log.warn(`[WebRTC] ⚠️ Erreur fermeture session: ${error}`);
            // Ne pas throw - permettre de continuer même si fermeture échoue
        }
    }
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
    async connectToCamera(cameraId) {
        try {
            // Fermer toute session existante d'abord
            await this.closeSession(cameraId);
            // Attendre un peu pour que Comelit libère les ressources
            await new Promise(resolve => setTimeout(resolve, 500));
            this.log.info(`[WebRTC] 🚀 Connexion à caméra ${cameraId}`);
            // PHASE 1: Lancer le proxy Go et récupérer l'offer Pion
            const pionOffer = await this.startProxyAndGetOffer();
            // PHASE 2: Envoyer l'offer Pion à Comelit
            const sessionId = this.generateUUID();
            const encodedCameraId = encodeURIComponent(cameraId);
            this.log.info('[WebRTC] 📤 Envoi de l\'offer Pion à Comelit...');
            this.log.info(`[WebRTC] 📋 SessionID: ${sessionId}`);
            this.log.info(`[WebRTC] 📋 SDP complet (${pionOffer.length} chars):\n${pionOffer}`);
            const response = await axios_1.default.put(`${this.baseUrl}/devicecom/endpoint/${encodedCameraId}/rtc/offer`, {
                sessionId,
                offer: pionOffer,
            }, {
                headers: {
                    'Authorization': `ccstoken ${this.token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
            }
            // Parser la réponse
            const answer = response.data.answer;
            this.log.info('[WebRTC] 📥 Answer reçu de Comelit');
            // PHASE 3: Envoyer l'answer au proxy Go
            this.log.info('[WebRTC] 📤 Envoi de l\'answer au proxy...');
            this.webrtcProxyProcess?.stdin?.write(JSON.stringify({ answer }) + '\n');
            // Extraire informations de connexion
            const connection = this.parseAnswer(answer);
            connection.sessionId = sessionId;
            connection.localOffer = pionOffer;
            connection.remoteAnswer = answer;
            connection.cameraId = cameraId;
            this.log.info(`[WebRTC] TURN relay: ${connection.turnServer}:${connection.turnPort}`);
            this.log.info(`[WebRTC] Video codec: H.264 profile ${connection.videoProfile}`);
            this.log.info('[WebRTC] ✅ 2-way handshake complet, attente connexion ICE/DTLS...');
            return connection;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                this.log.error(`[WebRTC] ❌ Erreur API: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
            }
            else {
                this.log.error(`[WebRTC] ❌ Erreur: ${error}`);
            }
            throw error;
        }
    }
    /**
     * Détermine le nom du binaire proxy selon la plateforme
     */
    getProxyBinaryName() {
        const platform = os.platform();
        const arch = os.arch();
        if (platform === 'linux') {
            // Linux: AMD64 ou ARM64
            return arch === 'arm64' ? 'webrtc-proxy-linux-arm64' : 'webrtc-proxy-linux-amd64';
        }
        else if (platform === 'darwin') {
            // macOS: webrtc-proxy standard (ARM64)
            return 'webrtc-proxy';
        }
        else {
            // Autres plateformes: tenter le binaire standard
            this.log.warn(`[WebRTC] Plateforme non reconnue: ${platform}/${arch}, utilisation du binaire par défaut`);
            return 'webrtc-proxy';
        }
    }
    /**
     * Démarre le proxy Go et récupère l'offer SDP généré par Pion
     * @returns SDP Offer généré par le proxy Pion
     */
    async startProxyAndGetOffer() {
        try {
            this.log.info('[WebRTC] 🔐 Lancement proxy Go pour générer offer...');
            // Chemin vers le binaire Go compilé (détection auto de la plateforme)
            const binaryName = this.getProxyBinaryName();
            const proxyPath = path.join(__dirname, '../webrtc-proxy', binaryName);
            // Configuration initiale (juste output UDP)
            const proxyConfig = {
                outputHost: '127.0.0.1',
                outputPort: 55000,
            };
            this.log.info('[WebRTC] Config proxy:', JSON.stringify(proxyConfig));
            // Lancer le proxy Go
            this.webrtcProxyProcess = (0, child_process_1.spawn)(proxyPath, [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: process.env,
            });
            // Envoyer la configuration initiale au proxy via stdin
            this.webrtcProxyProcess.stdin?.write(JSON.stringify(proxyConfig) + '\n');
            // Attendre l'offer SDP du proxy (première ligne JSON sur stdout)
            const pionOffer = await new Promise((resolve, reject) => {
                let offerReceived = false;
                const timeout = setTimeout(() => {
                    if (!offerReceived) {
                        reject(new Error('Timeout: Offer non reçu du proxy Go'));
                    }
                }, 5000);
                this.webrtcProxyProcess.stdout?.once('data', (data) => {
                    offerReceived = true;
                    clearTimeout(timeout);
                    try {
                        const lines = data.toString().split('\n');
                        const firstLine = lines.find((l) => l.trim().startsWith('{'));
                        if (!firstLine) {
                            reject(new Error('Pas de JSON dans stdout'));
                            return;
                        }
                        const offerData = JSON.parse(firstLine);
                        this.log.info('[WebRTC] 📥 Offer reçu du proxy Go');
                        resolve(offerData.offer);
                    }
                    catch (error) {
                        reject(error);
                    }
                });
                // Logger stderr en arrière-plan
                this.webrtcProxyProcess.stderr?.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    lines.forEach((line) => {
                        if (line.trim()) {
                            this.log.info('[Proxy GO]', line.trim());
                        }
                    });
                });
                this.webrtcProxyProcess.on('error', (error) => {
                    reject(error);
                });
                this.webrtcProxyProcess.on('exit', (code, signal) => {
                    if (code !== 0 && !offerReceived) {
                        reject(new Error(`Proxy exit code ${code}, signal ${signal}`));
                    }
                });
            });
            return pionOffer;
        }
        catch (error) {
            this.log.error('[WebRTC] ❌ Erreur démarrage proxy:', error);
            // Nettoyer le processus en cas d'erreur
            if (this.webrtcProxyProcess) {
                this.webrtcProxyProcess.kill('SIGTERM');
                this.webrtcProxyProcess = undefined;
            }
            throw error;
        }
    }
    /**
     * Arrête le proxy WebRTC Go
     */
    stopWebRTCProxy() {
        if (this.webrtcProxyProcess) {
            this.log.info('[WebRTC] Arrêt du proxy Go');
            this.webrtcProxyProcess.kill('SIGTERM');
            this.webrtcProxyProcess = undefined;
        }
    }
    /**
     * Ferme la session WebRTC côté Comelit (DELETE sur l'API)
     */
    async closeComelitSession(cameraId, sessionId) {
        try {
            const encodedCameraId = encodeURIComponent(cameraId);
            this.log.info(`[WebRTC] 🔌 Fermeture session Comelit: ${sessionId.substring(0, 8)}...`);
            const response = await axios_1.default.delete(`${this.baseUrl}/devicecom/endpoint/${encodedCameraId}/rtc/${sessionId}`, {
                headers: {
                    'Authorization': `ccstoken ${this.token}`,
                },
            });
            if (response.status === 200 || response.status === 204) {
                this.log.info('[WebRTC] ✅ Session Comelit fermée');
            }
            else {
                this.log.warn(`[WebRTC] ⚠️ Fermeture session: HTTP ${response.status}`);
            }
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                // 404 = session déjà fermée, pas grave
                if (error.response?.status === 404) {
                    this.log.debug('[WebRTC] Session déjà fermée côté Comelit');
                }
                else {
                    this.log.error(`[WebRTC] ❌ Erreur fermeture session: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
                }
            }
            else {
                this.log.error(`[WebRTC] ❌ Erreur fermeture: ${error}`);
            }
        }
    }
    /**
     * Enregistre un callback pour recevoir les données vidéo RTP
     */
    onVideoData(callback) {
        this.onVideoDataCallback = callback;
    }
    /**
     * Ferme la connexion WebRTC
     */
    close() {
        if (this.videoTrack) {
            this.videoTrack.close();
            this.videoTrack = undefined;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = undefined;
        }
        this.log.debug('[WebRTC] Connexion fermée');
    }
    /**
     * Parse le SDP Answer de Comelit pour extraire les informations de connexion
     */
    parseAnswer(sdp) {
        const connection = {
            sessionId: '',
            audioCodec: '',
            videoCodec: '',
            videoProfile: '',
            turnServer: '',
            turnPort: 0,
            iceUfrag: '',
            icePwd: '',
            fingerprint: '',
            audioSSRC: 0,
            videoSSRC: 0,
        };
        const lines = sdp.split('\n');
        let inAudio = false;
        let inVideo = false;
        for (const line of lines) {
            const trimmed = line.trim();
            // Détecter sections
            if (trimmed.startsWith('m=audio')) {
                inAudio = true;
                inVideo = false;
                // Extraire port
                const match = trimmed.match(/m=audio (\d+)/);
                if (match) {
                    connection.turnPort = parseInt(match[1]);
                }
            }
            else if (trimmed.startsWith('m=video')) {
                inVideo = true;
                inAudio = false;
            }
            // Connection info
            if (trimmed.startsWith('c=IN IP4')) {
                const match = trimmed.match(/c=IN IP4 ([\d.]+)/);
                if (match) {
                    connection.turnServer = match[1];
                }
            }
            // ICE credentials
            if (trimmed.startsWith('a=ice-ufrag:')) {
                connection.iceUfrag = trimmed.split(':')[1];
            }
            if (trimmed.startsWith('a=ice-pwd:')) {
                connection.icePwd = trimmed.split(':')[1];
            }
            // DTLS fingerprint
            if (trimmed.startsWith('a=fingerprint:')) {
                connection.fingerprint = trimmed.substring('a=fingerprint:'.length);
            }
            // Codecs
            if (inAudio && trimmed.startsWith('a=rtpmap:')) {
                const match = trimmed.match(/a=rtpmap:\d+ ([A-Z0-9]+)\//);
                if (match && !connection.audioCodec) {
                    connection.audioCodec = match[1];
                }
            }
            if (inVideo && trimmed.startsWith('a=rtpmap:')) {
                const match = trimmed.match(/a=rtpmap:\d+ ([A-Z0-9]+)\//);
                if (match && !connection.videoCodec) {
                    connection.videoCodec = match[1];
                }
            }
            // H.264 profile
            if (inVideo && trimmed.startsWith('a=fmtp:') && trimmed.includes('profile-level-id=')) {
                const match = trimmed.match(/profile-level-id=([a-f0-9]+)/);
                if (match) {
                    connection.videoProfile = match[1];
                }
            }
            // SSRCs
            if (trimmed.startsWith('a=ssrc:')) {
                const match = trimmed.match(/a=ssrc:(\d+)/);
                if (match) {
                    const ssrc = parseInt(match[1]);
                    if (inAudio && connection.audioSSRC === 0) {
                        connection.audioSSRC = ssrc;
                    }
                    else if (inVideo && connection.videoSSRC === 0) {
                        connection.videoSSRC = ssrc;
                    }
                }
            }
        }
        return connection;
    }
    // ============================================================================
    // Utilitaires de génération
    // ============================================================================
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16).toUpperCase();
        });
    }
    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    generateFingerprint() {
        const bytes = crypto.randomBytes(32);
        return bytes.toString('hex')
            .toUpperCase()
            .match(/.{1,2}/g)
            .join(':');
    }
    random32bit() {
        return Math.floor(Math.random() * 0xFFFFFFFF);
    }
}
exports.ComelitWebRTCAdapter = ComelitWebRTCAdapter;
//# sourceMappingURL=ComelitWebRTCAdapter.js.map