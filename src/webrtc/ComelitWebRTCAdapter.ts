/**
 * Adaptateur WebRTC pour Comelit utilisant node-datachannel (libdatachannel)
 * Alternative à werift avec support natif des media tracks
 */
import { Logging } from 'homebridge';
import * as nodeDataChannel from 'node-datachannel';

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
export class ComelitWebRTCAdapter {
  private peerConnection?: any; // PeerConnection de node-datachannel
  private videoTrack?: any; // Video track de node-datachannel
  private localSDP?: string;
  private remoteSDP?: string;
  private localPort = 0;
  private isConnected = false;

  constructor(
    private readonly config: ComelitWebRTCConfig,
    private readonly log: Logging,
  ) {}

  /**
   * Initialise la connexion WebRTC
   */
  async initialize(): Promise<void> {
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

    } catch (error) {
      this.log.error('[WebRTC] Erreur initialisation:', error);
      throw error;
    }
  }

  /**
   * Configure les callbacks WebRTC
   */
  private setupCallbacks(): void {
    if (!this.peerConnection) {
      return;
    }

    // Local Description (SDP Offer)
    this.peerConnection.onLocalDescription((sdp: string, type: string) => {
      this.log.debug('[WebRTC] Local Description:', type);
      this.localSDP = sdp;
      
      // Envoyer le SDP à l'API Comelit
      this.sendOfferToComelit(sdp, type).catch(err => {
        this.log.error('[WebRTC] Erreur envoi SDP à Comelit:', err);
      });
    });

    // Local Candidate (ICE)
    this.peerConnection.onLocalCandidate((candidate: string, mid: string) => {
      this.log.debug('[WebRTC] Local Candidate:', candidate);
    });

    // State Change
    this.peerConnection.onStateChange((state: string) => {
      this.log.info('[WebRTC] État:', state);
      if (state === 'connected' || state === 'completed') {
        this.isConnected = true;
      } else if (state === 'failed' || state === 'closed') {
        this.isConnected = false;
      }
    });

    // Gathering State
    this.peerConnection.onGatheringStateChange((state: string) => {
      this.log.debug('[WebRTC] Gathering:', state);
    });
  }

  /**
   * Crée un track vidéo pour recevoir le flux Comelit
   */
  async createVideoTrack(): Promise<void> {
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
      if (typeof (this.peerConnection as any).addTrack === 'function') {
        (this.peerConnection as any).addTrack(this.videoTrack);
        this.log.debug('[WebRTC] Video track ajouté');
      } else {
        this.log.warn('[WebRTC] addTrack non disponible, tentative alternative...');
      }

    } catch (error) {
      this.log.error('[WebRTC] Erreur création video track:', error);
      throw error;
    }
  }

  /**
   * Envoie le SDP Offer à l'API Comelit
   */
  private async sendOfferToComelit(sdp: string, type: string): Promise<void> {
    const axios = (await import('axios')).default;

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
      } else {
        this.log.error('[WebRTC] Réponse Comelit invalide:', response.data);
      }

    } catch (error: any) {
      this.log.error('[WebRTC] Erreur API Comelit:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Configure la réponse SDP de Comelit
   */
  private async setRemoteAnswer(sdp: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection non initialisée');
    }

    try {
      this.log.debug('[WebRTC] Configuration Remote Description...');
      this.peerConnection.setRemoteDescription(sdp, 'Answer');
      this.log.info('[WebRTC] Remote Description configurée');
    } catch (error) {
      this.log.error('[WebRTC] Erreur setRemoteDescription:', error);
      throw error;
    }
  }

  /**
   * Récupère les informations de streaming
   */
  getStreamInfo(): ComelitStreamInfo {
    // Récupérer le port local utilisé par libdatachannel
    // Pour l'instant, on retourne un port fictif car libdatachannel gère le transport
    return {
      localPort: 50000, // Port de base de la range
    };
  }

  /**
   * Vérifie si la connexion est établie
   */
  isConnectionEstablished(): boolean {
    return this.isConnected;
  }

  /**
   * Obtient le SDP local
   */
  getLocalSDP(): string | undefined {
    return this.localSDP;
  }

  /**
   * Obtient le SDP distant
   */
  getRemoteSDP(): string | undefined {
    return this.remoteSDP;
  }

  /**
   * Ferme la connexion WebRTC
   */
  async close(): Promise<void> {
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
    } catch (error) {
      this.log.error('[WebRTC] Erreur fermeture:', error);
    }
  }

  /**
   * Génère un UUID v4 pour sessionId
   */
  static generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
