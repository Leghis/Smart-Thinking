/**
 * config.ts
 * 
 * Fichier de configuration centralisé pour Smart-Thinking
 * Contient les seuils, paramètres et constantes utilisés dans tout le système
 */
import { platform } from 'os';
import * as path from 'path';

/**
 * Configuration pour les seuils de vérification et similarité
 */
export const VerificationConfig = {
  // Seuils de confiance pour la vérification
  CONFIDENCE: {
    MINIMUM_THRESHOLD: 0.7,        // Seuil minimum de confiance pour considérer une information fiable
    VERIFICATION_REQUIRED: 0.5,     // Seuil en dessous duquel une vérification est toujours requise
    HIGH_CONFIDENCE: 0.85,          // Seuil considéré comme haute confiance
    LOW_CONFIDENCE: 0.4             // Seuil considéré comme basse confiance
  },
  
  // Seuils de similarité pour la comparaison vectorielle
  SIMILARITY: {
    EXACT_MATCH: 0.95,              // Seuil pour considérer deux informations comme identiques
    HIGH_SIMILARITY: 0.80,          // Seuil pour considérer deux informations comme très similaires (réduit de 0.85 à 0.80)
    MEDIUM_SIMILARITY: 0.65,        // Seuil pour considérer deux informations comme significativement similaires (réduit de 0.75 à 0.65)
    LOW_SIMILARITY: 0.55,           // Seuil pour considérer deux informations comme faiblement similaires (réduit de 0.6 à 0.55)
    TEXT_MATCH: 0.65                // Seuil pour la correspondance textuelle (sans embeddings) (réduit de 0.7 à 0.65)
  },
  
  // Paramètres pour la mémoire de vérification
  MEMORY: {
    MAX_CACHE_SIZE: 1000,           // Nombre maximum d'entrées dans le cache
    CACHE_EXPIRATION: 3600000,      // Durée de validité du cache en millisecondes (1h par défaut)
    DEFAULT_SESSION_TTL: 86400000   // Durée de vie d'une session par défaut (24h)
  }
};

/**
 * Constantes générales du système
 */
export const SystemConfig = {
  DEFAULT_SESSION_ID: 'default',
  MAX_THOUGHT_LENGTH: 10000,          // Longueur maximale d'une pensée en caractères
  MAX_CONNECTIONS: 50                 // Nombre maximum de connexions par pensée
};

/**
 * Configuration spécifique à la plateforme
 * Détecte automatiquement l'environnement d'exécution et ajuste les paramètres
 */
export const PlatformConfig = {
  IS_WINDOWS: platform() === 'win32',
  IS_MAC: platform() === 'darwin',
  IS_LINUX: platform() === 'linux',
  
  /**
   * Obtient le répertoire de configuration selon la plateforme
   */
  getConfigPath: (): string => {
    if (platform() === 'win32') {
      return process.env.APPDATA 
        ? path.join(process.env.APPDATA, 'Smart-Thinking') 
        : path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'Smart-Thinking');
    } else if (platform() === 'darwin') {
      return path.join(process.env.HOME || '', 'Library', 'Application Support', 'Smart-Thinking');
    } else {
      return path.join(process.env.HOME || '', '.smart-thinking');
    }
  },
  
  /**
   * Obtient le répertoire temporaire selon la plateforme
   */
  getTempPath: (): string => {
    return path.join(
      platform() === 'win32' ? (process.env.TEMP || 'C:/Temp') : '/tmp',
      'smart-thinking'
    );
  },
  
  /**
   * Vérifie si Node.js est installé via NVM
   * Utile pour ajuster les chemins sur Windows avec NVM
   */
  isNvmEnvironment: (): boolean => {
    const nodePath = process.execPath.toLowerCase();
    return nodePath.includes('nvm') || 
           (platform() === 'win32' && nodePath.includes('appdata\\roaming\\nvm'));
  },
  
  /**
   * Obtient le chemin de base de NVM si applicable
   * Important pour les configurations sur Windows avec NVM
   */
  getNvmBasePath: (): string | null => {
    if (!PlatformConfig.isNvmEnvironment()) {
      return null;
    }
    
    if (platform() === 'win32') {
      const nvmPath = process.execPath.split('\\node.exe')[0];
      return nvmPath;
    } else {
      // Pour Unix, essayer de détecter le chemin NVM
      const nvmDir = process.env.NVM_DIR;
      if (nvmDir) {
        return nvmDir;
      }
    }
    
    return null;
  }
};
