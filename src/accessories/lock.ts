import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ComelitPlatform } from '../platform';

/**
 * Accessoire Serrure Comelit
 */
export class ComelitLockAccessory {
  private service: Service;
  private endpointId: string;

  constructor(
    private readonly platform: ComelitPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // Utiliser l'endpoint ID complet fourni par discovery
    // Format: _DA_{apartmentId}_{deviceUuid}_VIP#OD#{lockId}
    this.endpointId = accessory.context.device.endpointId;
    
    // Extraire juste le lockId pour l'affichage
    const parts = this.endpointId.split('#');
    const lockId = parts[parts.length - 1];

    // Informations de l'accessoire
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Comelit Group S.p.a.')
      .setCharacteristic(this.platform.Characteristic.Model, 'Lock')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, lockId);

    // Service de serrure
    this.service = this.accessory.getService(this.platform.Service.LockMechanism)
      || this.accessory.addService(this.platform.Service.LockMechanism);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.friendlyName,
    );

    // État actuel de la serrure
    this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.getLockCurrentState.bind(this));

    // État cible de la serrure
    this.service.getCharacteristic(this.platform.Characteristic.LockTargetState)
      .onGet(this.getLockTargetState.bind(this))
      .onSet(this.setLockTargetState.bind(this));

    this.platform.log.info('Serrure initialisée:', accessory.context.device.friendlyName);
  }

  /**
   * Obtient l'état actuel de la serrure
   * Note: Comelit ne fournit pas d'état, on assume toujours verrouillé
   */
  async getLockCurrentState(): Promise<CharacteristicValue> {
    return this.platform.Characteristic.LockCurrentState.SECURED;
  }

  /**
   * Obtient l'état cible de la serrure
   */
  async getLockTargetState(): Promise<CharacteristicValue> {
    return this.platform.Characteristic.LockTargetState.SECURED;
  }

  /**
   * Définit l'état cible de la serrure
   */
  async setLockTargetState(value: CharacteristicValue) {
    const targetState = value as number;

    if (targetState === this.platform.Characteristic.LockTargetState.UNSECURED) {
      this.platform.log.info('🔓 Déverrouillage de la porte:', this.accessory.context.device.friendlyName);

      try {
        // Appeler l'API pour déverrouiller avec l'endpoint ID complet
        await this.platform.comelitAPI.unlockDoor(this.endpointId);

        this.platform.log.info('✅ Porte déverrouillée avec succès');

        // Mettre à jour l'état actuel
        this.service.updateCharacteristic(
          this.platform.Characteristic.LockCurrentState,
          this.platform.Characteristic.LockCurrentState.UNSECURED,
        );

        // Après 5 secondes, remettre à verrouillé (la porte se verrouille automatiquement)
        setTimeout(() => {
          this.platform.log.info('🔒 Porte reverrouillée automatiquement');
          
          this.service.updateCharacteristic(
            this.platform.Characteristic.LockCurrentState,
            this.platform.Characteristic.LockCurrentState.SECURED,
          );
          
          this.service.updateCharacteristic(
            this.platform.Characteristic.LockTargetState,
            this.platform.Characteristic.LockTargetState.SECURED,
          );
        }, 5000);

      } catch (error) {
        this.platform.log.error('❌ Erreur lors du déverrouillage:', error);
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
    } else {
      // Verrouiller: ne rien faire (automatique)
      this.platform.log.info('🔒 Verrouillage (automatique)');
    }
  }
}
