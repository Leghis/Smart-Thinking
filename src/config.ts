/**
 * config.ts
 * 
 * Fichier de configuration centralisé pour Smart-Thinking
 * Contient les seuils, paramètres et constantes utilisés dans tout le système
 */

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
 * Configuration pour le service d'embeddings
 */
export const EmbeddingConfig = {
  MODEL: 'embed-multilingual-v3.0',  // Modèle d'embedding à utiliser
  INPUT_TYPE: 'search_document',      // Type d'entrée pour l'API d'embeddings
  BATCH_SIZE: 20,                     // Taille maximale des lots pour les requêtes d'embedding
  RETRY_ATTEMPTS: 3,                  // Nombre de tentatives en cas d'échec
  RETRY_DELAY: 1000                   // Délai entre les tentatives en milliseconds
};

/**
 * Constantes générales du système
 */
export const SystemConfig = {
  DEFAULT_SESSION_ID: 'default',
  MAX_THOUGHT_LENGTH: 10000,          // Longueur maximale d'une pensée en caractères
  MAX_CONNECTIONS: 50                 // Nombre maximum de connexions par pensée
};
