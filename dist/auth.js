"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateWithComelit = authenticateWithComelit;
exports.isTokenExpired = isTokenExpired;
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
/**
 * Authentifie l'utilisateur auprès de l'API Comelit et récupère les credentials
 * @param email Email de l'utilisateur
 * @param password Mot de passe
 * @param baseURL URL de base de l'API (optionnel)
 * @returns Credentials complets (token, deviceUuid, apartmentId)
 */
async function authenticateWithComelit(email, password, baseURL = 'https://api.comelitgroup.com/servicerest') {
    // Générer un clientId unique pour cette instance
    const clientId = (0, uuid_1.v4)().toUpperCase();
    // ÉTAPE 1: Login et récupération du token
    const loginResponse = await axios_1.default.post(`${baseURL}/eps/rtk`, {
        ccapi: {
            version: '1.1.0',
            login: {
                provider: 'NATIVE',
                providerData: {
                    id: email,
                    password: password,
                },
            },
            endpoint: {
                requuid: Math.floor(Math.random() * 1000000000).toString(),
                service: 'eps/rtk',
                version: '1.1.0',
            },
            body: {
                userAgent: {
                    clientId: clientId,
                    type: 'comelit-app',
                    os: 'homebridge',
                    osVersion: 'Node.js',
                    appId: 'com.homebridge.comelit',
                    appVersion: '1.0.0',
                    deviceVendor: 'homebridge',
                    deviceType: 'server',
                },
            },
        },
    }, {
        headers: {
            'Accept': 'application/json,application/xml,text/xml',
            'Content-Type': 'application/json',
            'Accept-Charset': 'UTF-8',
            'User-Agent': 'homebridge-comelit',
        },
    });
    // Vérifier la réponse
    if (loginResponse.data?.ccapi?.error?.code !== 0) {
        const errorMsg = loginResponse.data?.ccapi?.error?.message || 'Authentication failed';
        throw new Error(`Comelit login error: ${errorMsg}`);
    }
    const token = loginResponse.data.ccapi.body.token;
    const expirySeconds = parseInt(loginResponse.data.ccapi.body.expirySeconds);
    if (!token) {
        throw new Error('No token received from Comelit API');
    }
    // ÉTAPE 2: Récupérer les ressources (apartments et devices)
    const resourcesResponse = await axios_1.default.get(`${baseURL}/directory/resources`, {
        headers: {
            'Accept': 'application/json,application/xml,text/xml',
            'Content-Type': 'application/json',
            'Accept-Charset': 'UTF-8',
            'Authorization': `ccstoken ${token}`,
            'User-Agent': 'homebridge-comelit',
        },
    });
    // Extraire apartmentId et deviceUuid
    const apartments = resourcesResponse.data?.apartments;
    if (!apartments || apartments.length === 0) {
        throw new Error('No apartments found for this user');
    }
    // Prendre le premier appartement (la plupart des utilisateurs n'en ont qu'un)
    const firstApartment = apartments[0];
    const apartmentId = firstApartment.aptInfo?.authId;
    // Prendre le premier device (généralement il y en a un seul)
    const devices = firstApartment.devices;
    if (!devices || devices.length === 0) {
        throw new Error('No devices found in apartment');
    }
    const deviceUuid = devices[0].uuid;
    if (!apartmentId || !deviceUuid) {
        throw new Error('Could not extract apartmentId or deviceUuid from API response');
    }
    return {
        token,
        deviceUuid,
        apartmentId,
        expirySeconds,
    };
}
/**
 * Vérifie si le token est expiré
 * @param expirySeconds Timestamp d'expiration (en secondes)
 * @returns true si le token est expiré ou va expirer dans les 24h
 */
function isTokenExpired(expirySeconds) {
    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = 86400; // 24 heures de marge
    return now >= (expirySeconds - bufferSeconds);
}
//# sourceMappingURL=auth.js.map