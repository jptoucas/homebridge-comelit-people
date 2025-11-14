/**
 * Configuration et constantes du plugin Homebridge Comelit People
 * Aligné sur la documentation officielle Comelit Group API
 */
export declare const PLATFORM_NAME = "ComelitPeoplePlatform";
export declare const PLUGIN_NAME = "homebridge-comelit-people";
export interface ComelitPlatformConfig {
    platform: string;
    name?: string;
    email?: string;
    password?: string;
    token?: string;
    deviceUuid?: string;
    apartmentId?: string;
    baseURL?: string;
    pollInterval?: number;
    lockIds?: string[];
    enableCamera?: boolean;
    videoConfig?: {
        maxWidth?: number;
        maxHeight?: number;
        maxFPS?: number;
        maxBitrate?: number;
        forceMax?: boolean;
        vcodec?: string;
        audio?: boolean;
    };
    _cachedCredentials?: {
        token: string;
        deviceUuid: string;
        apartmentId: string;
        expirySeconds: number;
    };
}
export declare const DEFAULT_CONFIG: {
    baseURL: string;
    pollInterval: number;
    enableCamera: boolean;
    videoConfig: {
        maxWidth: number;
        maxHeight: number;
        maxFPS: number;
        maxBitrate: number;
        forceMax: boolean;
        vcodec: string;
        audio: boolean;
    };
};
//# sourceMappingURL=settings.d.ts.map