import { FeatureFlags } from './feature-flags';
import { VerificationConfig } from './config';

/**
 * Interface pour les entrées du cache d'embeddings avec expiration
 */
interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

/**
 * Service d'embeddings local sans dépendance externe.
 *
 * Phase 1 retire les appels Cohere et remplace la génération de vecteurs
 * par une représentation déterministe construite à partir du texte.
 */
export class EmbeddingService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheSize = 0;
  private maxCacheSize = VerificationConfig.MEMORY.MAX_CACHE_SIZE;
  private cacheExpiration = VerificationConfig.MEMORY.CACHE_EXPIRATION;
  private static warnedExternalUsage = false;

  constructor() {
    if (FeatureFlags.externalEmbeddingEnabled && !EmbeddingService.warnedExternalUsage) {
      console.warn(
        'FeatureFlags.externalEmbeddingEnabled est à true mais aucun fournisseur externe n\'est disponible. ' +
        'Réglez le flag à false ou implémentez un fournisseur local.'
      );
      EmbeddingService.warnedExternalUsage = true;
    }
  }

  /**
   * Génère un embedding déterministe à partir du texte (analyse de fréquence).
   */
  private buildLocalEmbedding(text: string): number[] {
    const normalised = text.toLowerCase();
    const vector = new Array(32).fill(0);

    for (let i = 0; i < normalised.length; i++) {
      const code = normalised.charCodeAt(i);
      // Regrouper les caractères par classe (a-z, chiffres, autre)
      if (code >= 97 && code <= 122) {
        vector[code - 97] += 1;
      } else if (code >= 48 && code <= 57) {
        vector[26 + (code - 48)] += 1;
      } else if (!Number.isNaN(code)) {
        vector[31] += 1;
      }
    }

    // Normaliser par la longueur pour rester comparable
    const length = normalised.length || 1;
    return vector.map(value => value / length);
  }

  private warnFeatureDisabled(): void {
    if (!FeatureFlags.externalEmbeddingEnabled && !EmbeddingService.warnedExternalUsage) {
      console.warn('EmbeddingService fonctionne en mode local; aucun appel API externe ne sera effectué.');
      EmbeddingService.warnedExternalUsage = true;
    }
  }

  private addToCache(text: string, embedding: number[]): void {
    if (this.cache.has(text)) {
      this.cache.delete(text);
      this.cache.set(text, {
        embedding,
        timestamp: Date.now()
      });
      return;
    }

    if (this.cacheSize >= this.maxCacheSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
        this.cacheSize--;
      }
    }

    this.cache.set(text, {
      embedding,
      timestamp: Date.now()
    });
    this.cacheSize++;
  }

  /**
   * Génère un embedding pour un texte donné.
   */
  async getEmbedding(text: string): Promise<number[]> {
    this.warnFeatureDisabled();
    const truncatedText = text.length > 1000 ? text.substring(0, 1000) : text;
    const cached = this.cache.get(truncatedText);

    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiration) {
      cached.timestamp = Date.now();
      this.cache.delete(truncatedText);
      this.cache.set(truncatedText, cached);
      return cached.embedding;
    }

    const embedding = this.buildLocalEmbedding(truncatedText);
    this.addToCache(truncatedText, embedding);
    return embedding;
  }

  /**
   * Génère des embeddings pour plusieurs textes.
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.getEmbedding(text)));
  }

  /**
   * Calcule la similarité cosinus entre deux vecteurs.
   */
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
      return 0;
    }

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

    if (normA === 0 || normB === 0) {
      return 0;
    }

    const similarity = dotProduct / (normA * normB);
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Trouve les textes les plus similaires.
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

    const referenceEmbedding = await this.getEmbedding(referenceText);
    if (referenceEmbedding.length === 0) {
      return [];
    }

    const candidateEmbeddings = await this.getEmbeddings(candidateTexts);
    const similarities = candidateEmbeddings.map((embedding, index) => ({
      text: candidateTexts[index],
      score: this.calculateCosineSimilarity(referenceEmbedding, embedding)
    }));

    return similarities
      .filter(item => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Efface le cache ou supprime les entrées expirées.
   */
  clearCache(all: boolean = false): void {
    if (all) {
      this.cache.clear();
      this.cacheSize = 0;
      return;
    }

    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheExpiration) {
        this.cache.delete(key);
        this.cacheSize--;
      }
    }
  }

  /**
   * Ajuste les paramètres du cache.
   */
  configureCacheParams(maxSize?: number, expiration?: number): void {
    if (maxSize !== undefined) {
      this.maxCacheSize = maxSize;
    }

    if (expiration !== undefined) {
      this.cacheExpiration = expiration;
    }

    if (this.cacheSize > this.maxCacheSize) {
      while (this.cacheSize > this.maxCacheSize) {
        const oldest = this.cache.keys().next().value;
        if (oldest === undefined) break;
        this.cache.delete(oldest);
        this.cacheSize--;
      }
    }
  }

  /**
   * Paramètres de batch conservés pour compatibilité (aucun effet en mode local).
   */
  configureBatchParams(_batchSize?: number, _batchDelay?: number): void {
    console.warn('configureBatchParams n\'a pas d\'effet lorsque les embeddings externes sont désactivés.');
  }
}
