"use strict";
/**
 * Configuration et constantes du plugin Homebridge Comelit People
 * Aligné sur la documentation officielle Comelit Group API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.PLUGIN_NAME = exports.PLATFORM_NAME = void 0;
exports.PLATFORM_NAME = 'ComelitPeoplePlatform';
exports.PLUGIN_NAME = 'homebridge-comelit-people';
exports.DEFAULT_CONFIG = {
    baseURL: 'https://api.comelitgroup.com/servicerest',
    pollInterval: 10000,
    enableCamera: true,
    ignoredDevices: 'Actionneur Générique',
    snapshotRefreshInterval: 0,
};
//# sourceMappingURL=settings.js.map