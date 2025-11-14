import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ComelitPlatform } from '../platform';
/**
 * Accessoire Serrure Comelit
 */
export declare class ComelitLockAccessory {
    private readonly platform;
    private readonly accessory;
    private service;
    private endpointId;
    constructor(platform: ComelitPlatform, accessory: PlatformAccessory);
    /**
     * Obtient l'état actuel de la serrure
     * Note: Comelit ne fournit pas d'état, on assume toujours verrouillé
     */
    getLockCurrentState(): Promise<CharacteristicValue>;
    /**
     * Obtient l'état cible de la serrure
     */
    getLockTargetState(): Promise<CharacteristicValue>;
    /**
     * Définit l'état cible de la serrure
     */
    setLockTargetState(value: CharacteristicValue): Promise<void>;
}
//# sourceMappingURL=lock.d.ts.map