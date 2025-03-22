import { VerificationStatus } from './types';
import { EmbeddingService } from './embedding-service';
import { VerificationConfig, SystemConfig } from './config';

/**
 * Interface pour les entrées de vérification
 */
interface VerificationEntry {
  id: string;               // Identifiant unique
  text: string;             // Texte de l'information vérifiée
  embedding?: number[];     // Vecteur d'embedding pour recherche vectorielle
  status: VerificationStatus; // Statut de vérification
  confidence: number;       // Niveau de confiance
  sources: string[];        // Sources utilisées
  timestamp: Date;          // Horodatage
  sessionId: string;        // ID de session
  expiresAt: Date;          // Date d'expiration
}

/**
 * Résultat d'une recherche de vérification
 */
export interface VerificationSearchResult {
  id: string;
  status: VerificationStatus;
  confidence: number;
  sources: string[];
  timestamp: Date;
  similarity: number;
  text: string;
}

/**
 * Classe qui gère la mémoire des vérifications avec recherche vectorielle efficace
 * pour assurer leur persistance à travers les différentes étapes du raisonnement
 * AMÉLIORÉ: Meilleure gestion des similarités et persistance des vérifications
 */
export class VerificationMemory {
  private static instance: VerificationMemory;
  private embeddingService?: EmbeddingService;
  
  // Structure pour stocker les vérifications avec index pour recherche efficace
  private verifications: Map<string, VerificationEntry> = new Map();
  
  // Index par session pour accès rapide
  private sessionIndex: Map<string, Set<string>> = new Map();
  
  // NOUVEAU: Cache de similarité pour éviter de recalculer les similitudes entre les mêmes textes
  private similarityCache: Map<string, Map<string, number>> = new Map();
  
  /**
   * Méthode statique pour implémenter le singleton
   * 
   * @returns L'instance unique de VerificationMemory
   */
  public static getInstance(): VerificationMemory {
    if (!VerificationMemory.instance) {
      VerificationMemory.instance = new VerificationMemory();
    }
    return VerificationMemory.instance;
  }
  
  /**
   * Constructeur privé pour empêcher l'instanciation directe
   */
  private constructor() {
    // Configurer le nettoyage périodique des entrées expirées
    setInterval(() => this.cleanExpiredEntries(), VerificationConfig.MEMORY.CACHE_EXPIRATION / 2);
    
    // NOUVEAU: Nettoyer également le cache de similarité périodiquement pour éviter les fuites de mémoire
    setInterval(() => this.cleanSimilarityCache(), VerificationConfig.MEMORY.CACHE_EXPIRATION);
    
    console.error('VerificationMemory: Système de mémoire de vérification initialisé');
  }
  
  /**
   * Définit le service d'embedding à utiliser pour la similarité sémantique
   * 
   * @param embeddingService Service d'embedding à utiliser
   */
  public setEmbeddingService(embeddingService: EmbeddingService): void {
    this.embeddingService = embeddingService;
    console.error('VerificationMemory: Service d\'embedding configuré');
  }
  
  /**
   * Ajoute une nouvelle vérification à la mémoire
   * AMÉLIORÉ: Meilleure détection des duplicatas avec cache de similarité
   * 
   * @param text Texte de l'information vérifiée
   * @param status Statut de vérification
   * @param confidence Niveau de confiance
   * @param sources Sources utilisées pour la vérification
   * @param sessionId Identifiant de la session
   * @param ttl Durée de vie en millisecondes (optionnel)
   * @returns Identifiant de la vérification ajoutée
   */
  public async addVerification(
    text: string,
    status: VerificationStatus,
    confidence: number,
    sources: string[] = [],
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID,
    ttl: number = VerificationConfig.MEMORY.DEFAULT_SESSION_TTL
  ): Promise<string> {
    console.error(`VerificationMemory: Ajout d'une vérification avec statut ${status}, confiance ${confidence.toFixed(2)}`);
    
    // Vérifier si une entrée très similaire existe déjà dans cette session
    const existingEntry = await this.findExactDuplicate(text, sessionId);
    if (existingEntry) {
      console.error(`VerificationMemory: Entrée similaire trouvée, mise à jour plutôt que création`);
      
      // Mettre à jour l'entrée existante au lieu d'en créer une nouvelle
      this.verifications.set(existingEntry.id, {
        ...existingEntry,
        status,
        confidence,
        sources,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + ttl)
      });
      return existingEntry.id;
    }
    
    // Si le service d'embedding est disponible, générer l'embedding
    let embedding: number[] | undefined = undefined;
    
    if (this.embeddingService) {
      try {
        embedding = await this.embeddingService.getEmbedding(text);
        console.error(`VerificationMemory: Embedding généré avec succès (${embedding.length} dimensions)`);
      } catch (error) {
        console.error('VerificationMemory: Erreur lors de la génération de l\'embedding:', error);
      }
    } else {
      console.error('VerificationMemory: Aucun service d\'embedding disponible');
    }
    
    // Générer un identifiant unique
    const id = `verification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Calculer la date d'expiration
    const expiresAt = new Date(Date.now() + ttl);
    
    // Créer l'entrée
    const entry: VerificationEntry = {
      id,
      text,
      embedding,
      status,
      confidence,
      sources,
      timestamp: new Date(),
      sessionId,
      expiresAt
    };
    
    // Ajouter à la mémoire des vérifications
    this.verifications.set(id, entry);
    
    // Mettre à jour l'index par session
    if (!this.sessionIndex.has(sessionId)) {
      this.sessionIndex.set(sessionId, new Set());
    }
    this.sessionIndex.get(sessionId)!.add(id);
    
    console.error(`VerificationMemory: Vérification ajoutée avec succès, ID: ${id}`);
    
    return id;
  }
  
  /**
   * Recherche une vérification existante identique pour éviter les doublons
   * AMÉLIORÉ: Utilisation du cache de similarité pour des recherches plus rapides
   * 
   * @param text Texte à rechercher
   * @param sessionId ID de session
   * @returns L'entrée existante si trouvée, null sinon
   */
  private async findExactDuplicate(
    text: string,
    sessionId: string
  ): Promise<VerificationEntry | null> {
    console.error(`VerificationMemory: Recherche de duplicata pour "${text.substring(0, 30)}..."`);
    
    // Si pas de service d'embedding, recherche textuelle exacte uniquement
    if (!this.embeddingService) {
      const sessionEntries = this.getSessionEntriesArray(sessionId);
      return sessionEntries.find(entry => entry.text === text) || null;
    }
    
    try {
      // Générer l'embedding pour le texte
      const embedding = await this.embeddingService.getEmbedding(text);
      
      // Obtenir les entrées pour cette session
      const sessionEntries = this.getSessionEntriesArray(sessionId);
      
      // AMÉLIORÉ: Utiliser le cache de similarité pour des recherches plus rapides
      for (const entry of sessionEntries) {
        if (!entry.embedding) continue;
        
        // Vérifier si la similarité est déjà dans le cache
        const cacheKey = `${text.substring(0, 50)}_${entry.id}`;
        let similarity: number;
        
        if (this.getCachedSimilarity(cacheKey)) {
          similarity = this.getCachedSimilarity(cacheKey)!;
        } else {
          similarity = this.embeddingService.calculateCosineSimilarity(embedding, entry.embedding);
          this.setCachedSimilarity(cacheKey, similarity);
        }
        
        // AMÉLIORÉ: Seuil de similarité plus bas pour capturer plus de correspondances
        const similarityThreshold = VerificationConfig.SIMILARITY.MEDIUM_SIMILARITY;
        
        if (similarity >= similarityThreshold) {
          console.error(`VerificationMemory: Duplicata trouvé avec similarité ${similarity.toFixed(3)}`);
          return entry;
        }
      }
    } catch (error) {
      console.error('VerificationMemory: Erreur lors de la recherche de duplicata:', error);
    }
    
    console.error('VerificationMemory: Aucun duplicata trouvé');
    return null;
  }
  
  /**
   * NOUVEAU: Obtient une similarité mise en cache
   * 
   * @param key Clé du cache
   * @returns Similarité mise en cache ou undefined si non trouvée
   */
  private getCachedSimilarity(key: string): number | undefined {
    for (const [prefix, similarities] of this.similarityCache.entries()) {
      if (key.startsWith(prefix)) {
        return similarities.get(key);
      }
    }
    return undefined;
  }
  
  /**
   * NOUVEAU: Définit une similarité dans le cache
   * 
   * @param key Clé du cache
   * @param similarity Valeur de similarité à mettre en cache
   */
  private setCachedSimilarity(key: string, similarity: number): void {
    const prefix = key.split('_')[0];
    
    if (!this.similarityCache.has(prefix)) {
      this.similarityCache.set(prefix, new Map());
    }
    
    this.similarityCache.get(prefix)!.set(key, similarity);
  }
  
  /**
   * Recherche une vérification existante similaire à l'information fournie
   * AMÉLIORÉ: Recherche plus efficace avec seuils de similarité ajustés
   * 
   * @param text Texte de l'information à rechercher
   * @param sessionId Identifiant de la session
   * @param similarityThreshold Seuil de similarité
   * @returns La vérification trouvée, ou null si aucune correspondance
   */
  public async findVerification(
    text: string,
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID,
    similarityThreshold: number = VerificationConfig.SIMILARITY.LOW_SIMILARITY
  ): Promise<VerificationSearchResult | null> {
    console.error(`VerificationMemory: Recherche de vérification pour "${text.substring(0, 30)}..." (seuil: ${similarityThreshold})`);
    
    // Obtenir les ID des vérifications pour cette session
    const sessionIds = this.sessionIndex.get(sessionId);
    
    if (!sessionIds || sessionIds.size === 0) {
      console.error(`VerificationMemory: Aucune vérification pour la session ${sessionId}`);
      return null;
    }
    
    console.error(`VerificationMemory: ${sessionIds.size} vérifications disponibles pour cette session`);
    
    // Si le service d'embedding est disponible, utiliser la recherche vectorielle
    if (this.embeddingService) {
      try {
        // Générer l'embedding pour le texte de recherche
        const queryEmbedding = await this.embeddingService.getEmbedding(text);
        
        // Obtenir les entrées pour cette session
        const sessionEntries = this.getSessionEntriesArray(sessionId);
        
        // Ne considérer que les vérifications avec embedding
        const entriesWithEmbeddings = sessionEntries.filter(entry => 
          entry.embedding && entry.embedding.length > 0
        );
        
        if (entriesWithEmbeddings.length === 0) {
          console.error('VerificationMemory: Aucune entrée avec embedding, utilisation de la recherche textuelle');
          return this.fallbackToTextSearch(text, sessionId);
        }
        
        // Calculer les similarités en utilisant des calculs vectoriels optimisés
        const similarities = entriesWithEmbeddings.map(entry => {
          // Utiliser le cache de similarité si disponible
          const cacheKey = `${text.substring(0, 50)}_${entry.id}`;
          let similarity: number;
          
          if (this.getCachedSimilarity(cacheKey)) {
            similarity = this.getCachedSimilarity(cacheKey)!;
          } else {
            similarity = this.embeddingService!.calculateCosineSimilarity(
              queryEmbedding, 
              entry.embedding!
            );
            this.setCachedSimilarity(cacheKey, similarity);
          }
          
          return {
            entry,
            similarity
          };
        });
        
        // Trier par similarité décroissante
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // AMÉLIORÉ: Afficher les meilleures correspondances pour le débogage
        if (similarities.length > 0) {
          console.error(`VerificationMemory: Meilleure correspondance - similarité: ${similarities[0].similarity.toFixed(3)}, texte: "${similarities[0].entry.text.substring(0, 50)}..."`);
        }
        
        // Retourner la plus similaire si elle dépasse le seuil
        if (similarities.length > 0 && similarities[0].similarity >= similarityThreshold) {
          const bestMatch = similarities[0].entry;
          console.error(`VerificationMemory: Vérification trouvée avec similarité ${similarities[0].similarity.toFixed(3)}`);
          
          return {
            id: bestMatch.id,
            status: bestMatch.status,
            confidence: bestMatch.confidence,
            sources: bestMatch.sources,
            timestamp: bestMatch.timestamp,
            similarity: similarities[0].similarity,
            text: bestMatch.text
          };
        } else if (similarities.length > 0) {
          console.error(`VerificationMemory: Meilleure correspondance (${similarities[0].similarity.toFixed(3)}) en dessous du seuil (${similarityThreshold})`);
        }
      } catch (error) {
        console.error('VerificationMemory: Erreur lors de la recherche par similarité vectorielle:', error);
        return this.fallbackToTextSearch(text, sessionId);
      }
    } else {
      // Si pas de service d'embedding, utiliser la recherche textuelle
      console.error('VerificationMemory: Aucun service d\'embedding, utilisation de la recherche textuelle');
      return this.fallbackToTextSearch(text, sessionId);
    }
    
    console.error('VerificationMemory: Aucune vérification trouvée');
    return null;
  }
  
  /**
   * Méthode de secours pour la recherche basée sur le texte
   * AMÉLIORÉ: Recherche textuelle plus flexible
   * 
   * @param text Texte à rechercher
   * @param sessionId ID de session
   * @returns Résultat de recherche ou null
   */
  private fallbackToTextSearch(
    text: string,
    sessionId: string
  ): VerificationSearchResult | null {
    console.error('VerificationMemory: Utilisation de la recherche textuelle');
    
    // Obtenir les entrées pour cette session
    const sessionEntries = this.getSessionEntriesArray(sessionId);
    
    // Recherche exacte par texte
    const exactMatch = sessionEntries.find(entry => entry.text === text);
    if (exactMatch) {
      console.error('VerificationMemory: Correspondance exacte trouvée');
      return {
        id: exactMatch.id,
        status: exactMatch.status,
        confidence: exactMatch.confidence,
        sources: exactMatch.sources,
        timestamp: exactMatch.timestamp,
        similarity: 1.0,
        text: exactMatch.text
      };
    }
    
    // AMÉLIORÉ: Normaliser les textes pour une meilleure correspondance
    const normalizedText = this.normalizeText(text);
    
    // AMÉLIORÉ: Recherche par inclusion de mots-clés significatifs
    const keywordsMatches = sessionEntries.map(entry => {
      const normalizedEntry = this.normalizeText(entry.text);
      
      // Extraire les mots significatifs (plus de 3 caractères)
      const textWords = new Set(normalizedText.split(/\s+/).filter(w => w.length > 3));
      const entryWords = new Set(normalizedEntry.split(/\s+/).filter(w => w.length > 3));
      
      // Compter les mots en commun et les mots uniques
      const commonWords = Array.from(textWords).filter(word => entryWords.has(word)).length;
      const totalUniqueWords = new Set([...textWords, ...entryWords]).size;
      
      // Calculer similitude Jaccard (intersection/union)
      const similarity = totalUniqueWords > 0 ? commonWords / totalUniqueWords : 0;
      
      // NOUVEAU: Bonus pour séquences communes
      let sequenceBonus = 0;
      // Chercher des séquences de 3+ mots consécutifs identiques
      const textChunks = normalizedText.split(/[.!?;]/).filter(s => s.trim().length > 0);
      const entryChunks = normalizedEntry.split(/[.!?;]/).filter(s => s.trim().length > 0);
      
      for (const chunk of textChunks) {
        if (entryChunks.some(ec => ec.includes(chunk) && chunk.split(/\s+/).length >= 3)) {
          sequenceBonus = 0.2; // Bonus pour séquences communes significatives
          break;
        }
      }
      
      return {
        entry,
        similarity: Math.min(similarity + sequenceBonus, 0.95) // Plafond à 0.95
      };
    });
    
    // Trier par similarité décroissante
    keywordsMatches.sort((a, b) => b.similarity - a.similarity);
    
    // AMÉLIORÉ: Seuil de similarité pour les correspondances textuelles
    const textSimilarityThreshold = VerificationConfig.SIMILARITY.TEXT_MATCH * 0.9; // Seuil légèrement réduit
    
    if (keywordsMatches.length > 0 && keywordsMatches[0].similarity >= textSimilarityThreshold) {
      const bestMatch = keywordsMatches[0].entry;
      console.error(`VerificationMemory: Correspondance textuelle trouvée avec similarité ${keywordsMatches[0].similarity.toFixed(3)}`);
      
      return {
        id: bestMatch.id,
        status: bestMatch.status,
        confidence: bestMatch.confidence,
        sources: bestMatch.sources,
        timestamp: bestMatch.timestamp,
        similarity: keywordsMatches[0].similarity,
        text: bestMatch.text
      };
    }
    
    console.error('VerificationMemory: Aucune correspondance textuelle trouvée');
    return null;
  }
  
  /**
   * NOUVEAU: Normalise un texte pour la recherche textuelle
   * 
   * @param text Texte à normaliser
   * @returns Texte normalisé
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]|_/g, ' ')  // Remplacer ponctuation et underscore par espaces
      .replace(/\s+/g, ' ')        // Normaliser les espaces
      .replace(/\d+/g, 'NUM')      // Normaliser les nombres
      .trim();
  }
  
  /**
   * Récupère les entrées pour une session donnée
   * 
   * @param sessionId ID de session
   * @returns Tableau des entrées pour cette session
   */
  private getSessionEntriesArray(sessionId: string): VerificationEntry[] {
    console.error(`VerificationMemory: Récupération des entrées pour la session ${sessionId}`);
    
    const sessionIds = this.sessionIndex.get(sessionId);
    if (!sessionIds) {
      console.error(`VerificationMemory: Aucune entrée pour cette session`);
      return [];
    }
    
    const entries: VerificationEntry[] = [];
    for (const id of sessionIds) {
      const entry = this.verifications.get(id);
      if (entry) {
        entries.push(entry);
      }
    }
    
    console.error(`VerificationMemory: ${entries.length} entrées récupérées`);
    return entries;
  }
  
  /**
   * Récupère toutes les vérifications pour une session donnée
   * avec pagination et filtrage
   * 
   * @param sessionId Identifiant de la session
   * @param offset Position de départ (pour pagination)
   * @param limit Nombre maximum de résultats
   * @param statusFilter Filtre sur le statut (optionnel)
   * @returns Tableau des vérifications pour cette session
   */
  public getSessionVerifications(
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID,
    offset: number = 0,
    limit: number = 100,
    statusFilter?: VerificationStatus
  ): {
    text: string;
    status: VerificationStatus;
    confidence: number;
    sources: string[];
    timestamp: Date;
    id: string;
  }[] {
    // Obtenir les entrées pour cette session
    let sessionEntries = this.getSessionEntriesArray(sessionId);
    
    // Appliquer le filtre de statut si fourni
    if (statusFilter) {
      sessionEntries = sessionEntries.filter(entry => entry.status === statusFilter);
    }
    
    // Trier par date (plus récent d'abord)
    sessionEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Appliquer pagination
    return sessionEntries
      .slice(offset, offset + limit)
      .map(entry => ({
        id: entry.id,
        text: entry.text,
        status: entry.status,
        confidence: entry.confidence,
        sources: entry.sources,
        timestamp: entry.timestamp
      }));
  }
  
  /**
   * Recherche des vérifications par similarité vectorielle
   * 
   * @param text Texte de référence
   * @param sessionId ID de session
   * @param limit Nombre maximum de résultats
   * @param minSimilarity Seuil minimal de similarité
   * @returns Liste de résultats triés par similarité
   */
  public async searchSimilarVerifications(
    text: string,
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID,
    limit: number = 5,
    minSimilarity: number = VerificationConfig.SIMILARITY.MEDIUM_SIMILARITY
  ): Promise<VerificationSearchResult[]> {
    if (!this.embeddingService) {
      return [];
    }
    
    try {
      // Générer l'embedding pour le texte de recherche
      const queryEmbedding = await this.embeddingService.getEmbedding(text);
      
      // Obtenir les entrées pour cette session
      const sessionEntries = this.getSessionEntriesArray(sessionId);
      
      // Ne considérer que les vérifications avec embedding
      const entriesWithEmbeddings = sessionEntries.filter(entry => 
        entry.embedding && entry.embedding.length > 0
      );
      
      if (entriesWithEmbeddings.length === 0) {
        return [];
      }
      
      // Calculer les similarités
      const similarities = entriesWithEmbeddings.map(entry => {
        const similarity = this.embeddingService!.calculateCosineSimilarity(
          queryEmbedding, 
          entry.embedding!
        );
        
        return {
          id: entry.id,
          status: entry.status,
          confidence: entry.confidence,
          sources: entry.sources,
          timestamp: entry.timestamp,
          similarity,
          text: entry.text
        };
      });
      
      // Filtrer par seuil de similarité et trier
      return similarities
        .filter(result => result.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Erreur lors de la recherche de vérifications similaires:', error);
      return [];
    }
  }
  
  /**
   * Nettoie les vérifications d'une session spécifique
   * 
   * @param sessionId Identifiant de la session à nettoyer
   */
  public clearSession(sessionId: string): void {
    const sessionIds = this.sessionIndex.get(sessionId);
    if (!sessionIds) return;
    
    // Supprimer chaque entrée
    for (const id of sessionIds) {
      this.verifications.delete(id);
    }
    
    // Supprimer l'index de session
    this.sessionIndex.delete(sessionId);
    
    console.error(`VerificationMemory: Session ${sessionId} nettoyée`);
  }
  
  /**
   * Nettoie les entrées expirées
   */
  private cleanExpiredEntries(): void {
    const now = new Date();
    const expiredIds = new Set<string>();
    
    // Identifier les entrées expirées
    for (const [id, entry] of this.verifications.entries()) {
      if (entry.expiresAt < now) {
        expiredIds.add(id);
      }
    }
    
    if (expiredIds.size === 0) return;
    
    // Supprimer les entrées expirées
    for (const id of expiredIds) {
      const entry = this.verifications.get(id);
      if (entry) {
        // Mettre à jour l'index de session
        const sessionIds = this.sessionIndex.get(entry.sessionId);
        if (sessionIds) {
          sessionIds.delete(id);
          // Si la session est vide, supprimer son index
          if (sessionIds.size === 0) {
            this.sessionIndex.delete(entry.sessionId);
          }
        }
        
        // Supprimer l'entrée
        this.verifications.delete(id);
      }
    }
    
    console.error(`VerificationMemory: ${expiredIds.size} entrées expirées supprimées`);
  }
  
  /**
   * NOUVEAU: Nettoie le cache de similarité
   */
  private cleanSimilarityCache(): void {
    const cacheSize = Array.from(this.similarityCache.values())
      .reduce((total, map) => total + map.size, 0);
    
    if (cacheSize === 0) return;
    
    // Vider le cache
    this.similarityCache.clear();
    
    console.error(`VerificationMemory: Cache de similarité nettoyé (${cacheSize} entrées)`);
  }
  
  /**
   * Nettoie toutes les vérifications (utilisé pour les tests)
   */
  public clearAll(): void {
    this.verifications.clear();
    this.sessionIndex.clear();
    this.similarityCache.clear();
    console.error('VerificationMemory: Mémoire de vérification entièrement nettoyée');
  }
  
  /**
   * Obtient des statistiques sur la mémoire de vérification
   */
  public getStats(): {
    totalEntries: number;
    sessionCount: number;
    cacheSize: number;
    entriesByStatus: Record<VerificationStatus, number>;
  } {
    const entriesByStatus: Record<VerificationStatus, number> = {
      verified: 0,
      partially_verified: 0,
      unverified: 0,
      contradicted: 0,
      inconclusive: 0
    };
    
    // Compter les entrées par statut
    for (const entry of this.verifications.values()) {
      entriesByStatus[entry.status] = (entriesByStatus[entry.status] || 0) + 1;
    }
    
    // Calculer la taille du cache
    const cacheSize = Array.from(this.similarityCache.values())
      .reduce((total, map) => total + map.size, 0);
    
    return {
      totalEntries: this.verifications.size,
      sessionCount: this.sessionIndex.size,
      cacheSize,
      entriesByStatus
    };
  }
}