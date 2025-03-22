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
 */
export class VerificationMemory {
  private static instance: VerificationMemory;
  private embeddingService?: EmbeddingService;
  
  // Structure pour stocker les vérifications avec index pour recherche efficace
  private verifications: Map<string, VerificationEntry> = new Map();
  
  // Index par session pour accès rapide
  private sessionIndex: Map<string, Set<string>> = new Map();
  
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
  }
  
  /**
   * Définit le service d'embedding à utiliser pour la similarité sémantique
   * 
   * @param embeddingService Service d'embedding à utiliser
   */
  public setEmbeddingService(embeddingService: EmbeddingService): void {
    this.embeddingService = embeddingService;
  }
  
  /**
   * Ajoute une nouvelle vérification à la mémoire
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
    // Vérifier si une entrée très similaire existe déjà dans cette session
    const existingEntry = await this.findExactDuplicate(text, sessionId);
    if (existingEntry) {
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
      } catch (error) {
        console.error('Erreur lors de la génération de l\'embedding pour la vérification:', error);
      }
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
    
    return id;
  }
  
  /**
   * Recherche une vérification existante identique pour éviter les doublons
   * 
   * @param text Texte à rechercher
   * @param sessionId ID de session
   * @returns L'entrée existante si trouvée, null sinon
   */
  private async findExactDuplicate(
    text: string,
    sessionId: string
  ): Promise<VerificationEntry | null> {
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
      
      // Rechercher une correspondance avec similarité très élevée
      for (const entry of sessionEntries) {
        if (entry.embedding && this.embeddingService.calculateCosineSimilarity(
          embedding, entry.embedding
        ) >= VerificationConfig.SIMILARITY.EXACT_MATCH) {
          return entry;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de duplicata exact:', error);
    }
    
    return null;
  }
  
  /**
   * Recherche une vérification existante similaire à l'information fournie
   * Utilise une recherche vectorielle optimisée
   * 
   * @param text Texte de l'information à rechercher
   * @param sessionId Identifiant de la session
   * @param similarityThreshold Seuil de similarité (utilise la valeur de config par défaut)
   * @returns La vérification trouvée, ou null si aucune correspondance
   */
  public async findVerification(
    text: string,
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID,
    similarityThreshold: number = VerificationConfig.SIMILARITY.HIGH_SIMILARITY
  ): Promise<VerificationSearchResult | null> {
    // Obtenir les ID des vérifications pour cette session
    const sessionIds = this.sessionIndex.get(sessionId);
    
    if (!sessionIds || sessionIds.size === 0) {
      return null;
    }
    
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
          return this.fallbackToTextSearch(text, sessionId);
        }
        
        // Calculer les similarités en utilisant des calculs vectoriels optimisés
        const similarities = entriesWithEmbeddings.map(entry => {
          const similarity = this.embeddingService!.calculateCosineSimilarity(
            queryEmbedding, 
            entry.embedding!
          );
          
          return {
            entry,
            similarity
          };
        });
        
        // Trier par similarité décroissante
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // Retourner la plus similaire si elle dépasse le seuil
        if (similarities.length > 0 && similarities[0].similarity >= similarityThreshold) {
          const bestMatch = similarities[0].entry;
          return {
            id: bestMatch.id,
            status: bestMatch.status,
            confidence: bestMatch.confidence,
            sources: bestMatch.sources,
            timestamp: bestMatch.timestamp,
            similarity: similarities[0].similarity,
            text: bestMatch.text
          };
        }
      } catch (error) {
        console.error('Erreur lors de la recherche par similarité vectorielle:', error);
        return this.fallbackToTextSearch(text, sessionId);
      }
    } else {
      // Si pas de service d'embedding, utiliser la recherche textuelle
      return this.fallbackToTextSearch(text, sessionId);
    }
    
    return null;
  }
  
  /**
   * Méthode de secours pour la recherche basée sur le texte
   * 
   * @param text Texte à rechercher
   * @param sessionId ID de session
   * @returns Résultat de recherche ou null
   */
  private fallbackToTextSearch(
    text: string,
    sessionId: string
  ): VerificationSearchResult | null {
    // Obtenir les entrées pour cette session
    const sessionEntries = this.getSessionEntriesArray(sessionId);
    
    // Recherche exacte par texte
    const exactMatch = sessionEntries.find(entry => entry.text === text);
    if (exactMatch) {
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
    
    // Recherche par sous-chaîne avec un seuil plus élevé
    const partialMatches = sessionEntries.filter(entry => 
      entry.text.includes(text) || text.includes(entry.text)
    );
    
    if (partialMatches.length > 0) {
      // Calculer un score de similarité basé sur la longueur relative
      partialMatches.sort((a, b) => {
        const lenA = a.text.length;
        const lenB = b.text.length;
        const lenText = text.length;
        
        const ratioA = Math.min(lenA, lenText) / Math.max(lenA, lenText);
        const ratioB = Math.min(lenB, lenText) / Math.max(lenB, lenText);
        
        return ratioB - ratioA;
      });
      
      const bestMatch = partialMatches[0];
      const similarity = Math.min(
        bestMatch.text.length, 
        text.length
      ) / Math.max(bestMatch.text.length, text.length);
      
      if (similarity >= VerificationConfig.SIMILARITY.TEXT_MATCH) {
        return {
          id: bestMatch.id,
          status: bestMatch.status,
          confidence: bestMatch.confidence,
          sources: bestMatch.sources,
          timestamp: bestMatch.timestamp,
          similarity,
          text: bestMatch.text
        };
      }
    }
    
    return null;
  }
  
  /**
   * Récupère les entrées pour une session donnée
   * 
   * @param sessionId ID de session
   * @returns Tableau des entrées pour cette session
   */
  private getSessionEntriesArray(sessionId: string): VerificationEntry[] {
    const sessionIds = this.sessionIndex.get(sessionId);
    if (!sessionIds) return [];
    
    const entries: VerificationEntry[] = [];
    for (const id of sessionIds) {
      const entry = this.verifications.get(id);
      if (entry) {
        entries.push(entry);
      }
    }
    
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
    
    if (expiredIds.size > 0) {
      console.log(`Nettoyage: ${expiredIds.size} entrées expirées supprimées`);
    }
  }
  
  /**
   * Nettoie toutes les vérifications (utilisé pour les tests)
   */
  public clearAll(): void {
    this.verifications.clear();
    this.sessionIndex.clear();
  }
  
  /**
   * Obtient des statistiques sur la mémoire de vérification
   */
  public getStats(): {
    totalEntries: number;
    sessionCount: number;
    entriesByStatus: Record<VerificationStatus, number>;
  } {
    const entriesByStatus: Record<VerificationStatus, number> = {
      verified: 0,
      partially_verified: 0,
      unverified: 0,
      contradicted: 0,
      inconclusive: 0,
      // verification_in_progress n'est pas dans VerificationStatus
      // Commenté pour éviter l'erreur
    };
    
    // Compter les entrées par statut
    for (const entry of this.verifications.values()) {
      entriesByStatus[entry.status] = (entriesByStatus[entry.status] || 0) + 1;
    }
    
    return {
      totalEntries: this.verifications.size,
      sessionCount: this.sessionIndex.size,
      entriesByStatus
    };
  }
}