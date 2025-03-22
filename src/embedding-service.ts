import { CohereClient } from 'cohere-ai';
import { EmbeddingConfig, VerificationConfig } from './config';

/**
 * Interface pour les entrées du cache d'embeddings avec expiration
 */
interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

/**
 * Service qui gère les embeddings vectoriels avec l'API Cohere
 * Version optimisée avec batching et LRU cache avec expiration
 */
export class EmbeddingService {
  private client: CohereClient;
  
  // Cache LRU avec expiration
  private cache: Map<string, CacheEntry> = new Map();
  private cacheSize: number = 0;
  private maxCacheSize: number = VerificationConfig.MEMORY.MAX_CACHE_SIZE;
  private cacheExpiration: number = VerificationConfig.MEMORY.CACHE_EXPIRATION;
  
  // File d'attente pour le batching
  private batchQueue: { text: string, resolve: (embedding: number[]) => void, reject: (error: Error) => void }[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchSize: number = EmbeddingConfig.BATCH_SIZE;
  private batchDelay: number = 50; // Délai en ms pour regrouper les requêtes
  
  constructor(apiKey: string) {
    this.client = new CohereClient({
      token: apiKey,
    });
  }
  
  /**
   * Génère un embedding pour un texte donné
   * Utilise une file d'attente pour regrouper les requêtes en batch
   * 
   * @param text Le texte pour lequel générer un embedding
   * @returns Un vecteur d'embedding
   */
  async getEmbedding(text: string): Promise<number[]> {
    // Tronquer le texte s'il est trop long
    const truncatedText = text.length > 1000 ? text.substring(0, 1000) : text;
    
    // Vérifier si l'embedding est déjà en cache et n'a pas expiré
    const cachedEntry = this.cache.get(truncatedText);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp) < this.cacheExpiration) {
      // Rafraîchir le timestamp pour l'algorithme LRU
      cachedEntry.timestamp = Date.now();
      this.cache.delete(truncatedText);
      this.cache.set(truncatedText, cachedEntry);
      return cachedEntry.embedding;
    }
    
    // Sinon, ajouter à la file d'attente pour traitement en batch
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        text: truncatedText,
        resolve,
        reject
      });
      
      // Planifier le traitement du batch s'il n'est pas déjà prévu
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.processBatch(), this.batchDelay);
      }
    });
  }
  
  /**
   * Traite la file d'attente des embeddings en lot
   */
  private async processBatch(): Promise<void> {
    // Réinitialiser le timeout
    this.batchTimeout = null;
    
    // Prendre les éléments de la file jusqu'à la taille maximale du batch
    const batch = this.batchQueue.splice(0, this.batchSize);
    if (batch.length === 0) return;
    
    const texts = batch.map(item => item.text);
    
    try {
      // Définir une variable pour les tentatives
      let retryAttempts = EmbeddingConfig.RETRY_ATTEMPTS;
      let embeddings: number[][] = [];
      
      // Boucle de tentatives avec délai exponentiel
      while (retryAttempts > 0) {
        try {
          const response = await this.client.embed({
            texts,
            model: EmbeddingConfig.MODEL,
            inputType: EmbeddingConfig.INPUT_TYPE as 'search_document',
          });
          
          // Type guard pour gérer les différents formats de réponse possibles
          embeddings = Array.isArray(response.embeddings) && 
            Array.isArray(response.embeddings[0]) ? 
            response.embeddings as number[][] : 
            (response.embeddings as any) as number[][];
          
          break; // Sortir de la boucle si réussi
        } catch (error) {
          retryAttempts--;
          
          if (retryAttempts === 0) {
            throw error; // Relancer l'erreur si toutes les tentatives ont échoué
          }
          
          // Attendre avec un délai exponentiel avant de réessayer
          await new Promise(resolve => 
            setTimeout(resolve, EmbeddingConfig.RETRY_DELAY * (EmbeddingConfig.RETRY_ATTEMPTS - retryAttempts))
          );
        }
      }
      
      // Mettre en cache et résoudre les promesses pour chaque texte
      batch.forEach((item, index) => {
        const embedding = embeddings[index] || [];
        
        // Ajouter au cache avec horodatage pour l'expiration
        this.addToCache(item.text, embedding);
        
        // Résoudre la promesse
        item.resolve(embedding);
      });
    } catch (error) {
      console.error('Erreur lors de la génération des embeddings en batch:', error);
      
      // Rejeter toutes les promesses avec l'erreur
      batch.forEach(item => {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
    
    // Traiter le batch suivant s'il reste des éléments dans la file
    if (this.batchQueue.length > 0) {
      this.batchTimeout = setTimeout(() => this.processBatch(), this.batchDelay);
    }
  }
  
  /**
   * Ajoute un embedding au cache LRU avec expiration
   * 
   * @param text Le texte clé
   * @param embedding Le vecteur à mettre en cache
   */
  private addToCache(text: string, embedding: number[]): void {
    // Si le cache est plein, supprimer l'entrée la plus ancienne (LRU)
    if (this.cacheSize >= this.maxCacheSize && !this.cache.has(text)) {
      // Trouver l'entrée la plus ancienne
      let oldestKey = '';
      let oldestTime = Infinity;
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }
      
      // Supprimer l'entrée la plus ancienne
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.cacheSize--;
      }
    }
    
    // Ajouter ou mettre à jour dans le cache
    this.cache.set(text, {
      embedding,
      timestamp: Date.now()
    });
    
    // Mettre à jour la taille du cache uniquement si c'est une nouvelle entrée
    if (!this.cache.has(text)) {
      this.cacheSize++;
    }
  }
  
  /**
   * Génère des embeddings pour plusieurs textes
   * avec gestion optimisée des batchs et du cache
   * 
   * @param texts Les textes pour lesquels générer des embeddings
   * @returns Un tableau de vecteurs d'embedding
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    // Effectuer les requêtes d'embedding en parallèle
    const promises = texts.map(text => this.getEmbedding(text));
    return Promise.all(promises);
  }
  
  /**
   * Calcule la similarité cosinus entre deux vecteurs
   * 
   * @param vecA Premier vecteur
   * @param vecB Second vecteur
   * @returns Score de similarité entre 0 et 1
   */
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
      return 0;
    }
    
    // Calcul optimisé du produit scalaire et des normes
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    // Éviter la division par zéro
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    // Similarité cosinus
    const similarity = dotProduct / (normA * normB);
    
    // Assurer que la similarité est dans l'intervalle [0, 1]
    return Math.max(0, Math.min(1, similarity));
  }
  
  /**
   * Trouve les textes les plus similaires à un texte de référence
   * Utilise KNN pour la recherche de similarité
   * 
   * @param referenceText Texte de référence
   * @param candidateTexts Textes candidats
   * @param limit Nombre maximum de résultats
   * @param threshold Seuil de similarité minimum (optionnel)
   * @returns Les textes les plus similaires avec leurs scores
   */
  async findSimilarTexts(
    referenceText: string,
    candidateTexts: string[],
    limit: number = 5,
    threshold: number = VerificationConfig.SIMILARITY.LOW_SIMILARITY
  ): Promise<Array<{ text: string; score: number }>> {
    if (candidateTexts.length === 0) {
      return [];
    }
    
    // Générer l'embedding pour le texte de référence
    const referenceEmbedding = await this.getEmbedding(referenceText);
    
    if (referenceEmbedding.length === 0) {
      return [];
    }
    
    // Générer les embeddings pour tous les textes candidats
    const candidateEmbeddings = await this.getEmbeddings(candidateTexts);
    
    // Calculer les scores de similarité
    const similarities = candidateEmbeddings.map((embedding, index) => ({
      text: candidateTexts[index],
      score: this.calculateCosineSimilarity(referenceEmbedding, embedding)
    }));
    
    // Trier par score de similarité décroissant et limiter les résultats
    return similarities
      .filter(item => item.score >= threshold) // Filtrer par seuil
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  /**
   * Efface le cache d'embeddings ou supprime les entrées expirées
   * 
   * @param all Si true, efface tout le cache, sinon seulement les entrées expirées
   */
  clearCache(all: boolean = false): void {
    if (all) {
      this.cache.clear();
      this.cacheSize = 0;
      return;
    }
    
    // Supprimer uniquement les entrées expirées
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheExpiration) {
        this.cache.delete(key);
        this.cacheSize--;
      }
    }
  }
  
  /**
   * Ajuste les paramètres du cache
   * 
   * @param maxSize Taille maximale du cache
   * @param expiration Durée de validité en millisecondes
   */
  configureCacheParams(maxSize?: number, expiration?: number): void {
    if (maxSize !== undefined) {
      this.maxCacheSize = maxSize;
    }
    
    if (expiration !== undefined) {
      this.cacheExpiration = expiration;
    }
    
    // Si la nouvelle taille maximale est inférieure à la taille actuelle,
    // supprimer les entrées les plus anciennes
    if (this.cacheSize > this.maxCacheSize) {
      this.reduceCache();
    }
  }
  
  /**
   * Réduit la taille du cache en supprimant les entrées les plus anciennes
   */
  private reduceCache(): void {
    const entriesToRemove = this.cacheSize - this.maxCacheSize;
    if (entriesToRemove <= 0) return;
    
    // Trier les entrées par timestamp
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Supprimer les plus anciennes
    for (let i = 0; i < entriesToRemove; i++) {
      if (i < entries.length) {
        this.cache.delete(entries[i][0]);
      }
    }
    
    this.cacheSize = Math.min(this.cacheSize, this.maxCacheSize);
  }
  
  /**
   * Configure les paramètres de batch
   * 
   * @param batchSize Taille maximale des lots
   * @param batchDelay Délai en ms pour regrouper les requêtes
   */
  configureBatchParams(batchSize?: number, batchDelay?: number): void {
    if (batchSize !== undefined) {
      this.batchSize = batchSize;
    }
    
    if (batchDelay !== undefined) {
      this.batchDelay = batchDelay;
    }
  }
}