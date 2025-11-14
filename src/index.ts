import { API } from 'homebridge';
import { ComelitPlatform } from './platform';
import { PLATFORM_NAME } from './settings';

/**
 * Point d'entrée du plugin Homebridge Comelit
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, ComelitPlatform);
};
