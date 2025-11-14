# Comelit People - Plugin Homebridge

Ce répertoire contient le plugin Homebridge pour le système d'interphonie Comelit People.

## 📦 Structure

```
comelit-people/
├── src/                      # Code source TypeScript
│   ├── index.ts             # Point d'entrée du plugin
│   ├── platform.ts          # Plateforme Homebridge principale
│   ├── settings.ts          # Configuration et constantes
│   ├── api.ts               # Client API REST Comelit
│   └── accessories/         # Accessoires HomeKit
│       ├── lock.ts         # Serrures/Relais (Opendoors)
│       └── doorbell.ts     # Sonnettes/Caméras (External Units)
├── package.json             # Configuration npm du plugin
├── tsconfig.json            # Configuration TypeScript
├── config.schema.json       # Schéma pour Homebridge Config UI X
└── dist/                    # Code JavaScript compilé (généré)
```

## 🚀 Installation locale

### 1. Installer les dépendances

```bash
cd ~/Desktop/ComelitHomekit/comelit-people
npm install
```

### 2. Compiler le TypeScript

```bash
npm run build
```

### 3. Créer un lien npm global

```bash
sudo npm link
```

Cela rend le plugin disponible pour Homebridge sous le nom `homebridge-comelit-people`.

## ⚙️ Configuration

Dans votre fichier `~/.homebridge/config.json` :

```json
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "platforms": [
    {
      "platform": "ComelitPeoplePlatform",
      "name": "Comelit People",
      "token": "VOTRE_TOKEN_CCS",
      "deviceUuid": "VOTRE_DEVICE_UUID",
      "apartmentId": "VOTRE_APARTMENT_ID",
      "pollInterval": 3000,
      "enableCamera": true
    }
  ]
}
```

## 📝 Obtenir les identifiants Comelit

Voir la documentation principale : `../docs/GUIDE_INSTALLATION.md`

## 🔧 Développement

### Compiler en mode watch

```bash
npm run watch
```

### Structure du code

- **index.ts** : Enregistre la plateforme auprès de Homebridge
- **platform.ts** : Gère la découverte des dispositifs via l'Address Book Comelit
- **api.ts** : Communication avec l'API REST Comelit (CCS Token)
- **accessories/lock.ts** : Implémente les serrures/relais (Opendoors)
- **accessories/doorbell.ts** : Implémente les sonnettes/caméras (External Units)

## 🏗️ Architecture Comelit

Le plugin utilise l'architecture officielle Comelit Group :

- **Address Book** : Structure hiérarchique des dispositifs
- **External Units** : Panneaux d'entrée avec sonnette et caméra
- **Opendoors** : Relais de serrure/gâche électrique
- **Internal Units** : Intercoms intérieurs
- **CCS Token** : Authentification Comelit Cloud Services

## 📚 Ressources

- [Documentation Homebridge](https://developers.homebridge.io/)
- [API Comelit Group](https://dev1.cloud.comelitgroup.com/)
- [HomeKit Accessory Protocol](https://developer.apple.com/homekit/)

## 📄 Licence

MIT
