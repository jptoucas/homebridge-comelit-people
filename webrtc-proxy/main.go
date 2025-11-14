package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"os"

	"github.com/pion/webrtc/v4"
)

// Config contient les informations de connexion WebRTC
type Config struct {
	LocalSDP    string `json:"localSdp"`    // Notre SDP Offer
	RemoteSDP   string `json:"remoteSdp"`   // SDP Answer de Comelit
	OutputHost  string `json:"outputHost"`  // Où envoyer le RTP déchiffré
	OutputPort  int    `json:"outputPort"`  // Port UDP pour le RTP
}

func main() {
	log.SetFlags(log.Ltime | log.Lmicroseconds)
	log.Println("[WebRTC Proxy] Démarrage...")

	// Lire la configuration depuis stdin
	var config Config
	decoder := json.NewDecoder(os.Stdin)
	if err := decoder.Decode(&config); err != nil {
		log.Fatalf("[ERROR] Impossible de lire la config: %v", err)
	}

	log.Printf("[Config] Output: %s:%d", config.OutputHost, config.OutputPort)

	// Créer une connexion UDP pour envoyer le RTP déchiffré
	udpAddr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", config.OutputHost, config.OutputPort))
	if err != nil {
		log.Fatalf("[ERROR] UDP addr: %v", err)
	}

	udpConn, err := net.DialUDP("udp", nil, udpAddr)
	if err != nil {
		log.Fatalf("[ERROR] UDP dial: %v", err)
	}
	defer udpConn.Close()
	log.Println("[UDP] Connexion établie")

	// Configuration WebRTC
	config_webrtc := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			// Les ICE servers seront dans le SDP Answer
		},
	}

	// Créer PeerConnection
	peerConnection, err := webrtc.NewPeerConnection(config_webrtc)
	if err != nil {
		log.Fatalf("[ERROR] PeerConnection: %v", err)
	}
	defer peerConnection.Close()

	log.Println("[WebRTC] PeerConnection créée")

	// Handler pour les tracks (audio/vidéo)
	peerConnection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		codec := track.Codec()
		log.Printf("[Track] Reçu: %s (PT: %d, Clock: %d)", codec.MimeType, codec.PayloadType, codec.ClockRate)

		// Lire les paquets RTP et les envoyer sur UDP
		go func() {
			packetCount := 0
			for {
				rtp, _, readErr := track.ReadRTP()
				if readErr != nil {
					if readErr == io.EOF {
						log.Println("[Track] EOF")
						return
					}
					log.Printf("[ERROR] ReadRTP: %v", readErr)
					continue
				}

				packetCount++
				if packetCount%100 == 0 {
					log.Printf("[RTP] %d paquets reçus (SSRC: %d, PT: %d, Seq: %d)",
						packetCount, rtp.SSRC, rtp.PayloadType, rtp.SequenceNumber)
				}

				// Marshaler le paquet RTP et l'envoyer sur UDP
				payload, err := rtp.Marshal()
				if err != nil {
					log.Printf("[ERROR] Marshal RTP: %v", err)
					continue
				}

				_, err = udpConn.Write(payload)
				if err != nil {
					log.Printf("[ERROR] UDP write: %v", err)
				}
			}
		}()
	})

	// Handler pour l'état de la connexion ICE
	peerConnection.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("[ICE] État: %s", state.String())
	})

	// Handler pour l'état de la connexion peer
	peerConnection.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("[Peer] État: %s", state.String())
		if state == webrtc.PeerConnectionStateFailed || state == webrtc.PeerConnectionStateClosed {
			log.Println("[Peer] Connexion fermée, arrêt")
			os.Exit(0)
		}
	})

	// Définir le SDP Answer distant (de Comelit)
	answer := webrtc.SessionDescription{
		Type: webrtc.SDPTypeAnswer,
		SDP:  config.RemoteSDP,
	}

	log.Println("[SDP] Configuration remote description...")
	if err = peerConnection.SetRemoteDescription(answer); err != nil {
		log.Fatalf("[ERROR] SetRemoteDescription: %v", err)
	}

	// Créer notre Offer local
	offer := webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  config.LocalSDP,
	}

	log.Println("[SDP] Configuration local description...")
	if err = peerConnection.SetLocalDescription(offer); err != nil {
		log.Fatalf("[ERROR] SetLocalDescription: %v", err)
	}

	log.Println("[WebRTC] Connexion établie, en attente de paquets RTP...")

	// Garder le programme actif
	select {}
}
