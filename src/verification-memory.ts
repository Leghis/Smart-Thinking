import { VerificationStatus, VerificationResult } from './types';
import { EmbeddingService } from './embedding-service';

/**
 * Classe qui gère la mémoire des vérifications pour assurer leur persistance
 * à travers les différentes étapes du raisonnement
 */
export class VerificationMemory {
  private static instance: VerificationMemory;
  private embeddingService?: EmbeddingService;
  
  // Structure pour stocker les vérifications avec leur contenu sémantique
  private verifications: {
    text: string;
    embedding?: number[];
    status: VerificationStatus;
    confidence: number;
    sources: string[];
    timestamp: Date;
    sessionId: string;
  }[] = [];
  
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
  private constructor() {}
  
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
   */
  public async addVerification(
    text: string,
    status: VerificationStatus,
    confidence: number,
    sources: string[] = [],
    sessionId: string = 'default'
  ): Promise<void> {
    // Si le service d'embedding est disponible, générer l'embedding
    let embedding: number[] | undefined = undefined;
    
    if (this.embeddingService) {
      try {
        embedding = await this.embeddingService.getEmbedding(text);
      } catch (error) {
        console.error('Erreur lors de la génération de l\'embedding pour la vérification:', error);
      }
    }
    
    // Ajouter à la mémoire des vérifications
    this.verifications.push({
      text,
      embedding,
      status,
      confidence,
      sources,
      timestamp: new Date(),
      sessionId
    });
  }
  
  /**
   * Recherche une vérification existante similaire à l'information fournie
   * 
   * @param text Texte de l'information à rechercher
   * @param sessionId Identifiant de la session
   * @param similarityThreshold Seuil de similarité (0 à 1)
   * @returns La vérification trouvée, ou null si aucune correspondance
   */
  public async findVerification(
    text: string,
    sessionId: string = 'default',
    similarityThreshold: number = 0.85
  ): Promise<{
    status: VerificationStatus;
    confidence: number;
    sources: string[];
    timestamp: Date;
    similarity: number;
  } | null> {
    // Filtrer par session
    const sessionVerifications = this.verifications.filter(v => v.sessionId === sessionId);
    
    if (sessionVerifications.length === 0) {
      return null;
    }
    
    // Si le service d'embedding est disponible, utiliser la similarité sémantique
    if (this.embeddingService) {
      try {
        // Générer l'embedding pour le texte de recherche
        const queryEmbedding = await this.embeddingService.getEmbedding(text);
        
        // Ne considérer que les vérifications avec embedding
        const verifWithEmbeddings = sessionVerifications.filter(v => v.embedding !== undefined);
        
        if (verifWithEmbeddings.length === 0) {
          return null;
        }
        
        // Calculer les similarités
        const similarities = verifWithEmbeddings.map(verification => {
          const similarity = this.embeddingService!.calculateCosineSimilarity(
            queryEmbedding, 
            verification.embedding!
          );
          
          return {
            verification,
            similarity
          };
        });
        
        // Trier par similarité décroissante
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // Retourner la plus similaire si elle dépasse le seuil
        if (similarities[0].similarity >= similarityThreshold) {
          const bestMatch = similarities[0].verification;
          return {
            status: bestMatch.status,
            confidence: bestMatch.confidence,
            sources: bestMatch.sources,
            timestamp: bestMatch.timestamp,
            similarity: similarities[0].similarity
          };
        }
      } catch (error) {
        console.error('Erreur lors de la recherche par similarité sémantique:', error);
      }
    } else {
      // Si pas de service d'embedding, recherche exacte par texte
      const exactMatch = sessionVerifications.find(v => v.text === text);
      if (exactMatch) {
        return {
          status: exactMatch.status,
          confidence: exactMatch.confidence,
          sources: exactMatch.sources,
          timestamp: exactMatch.timestamp,
          similarity: 1.0
        };
      }
      
      // Recherche par sous-chaîne avec un seuil plus élevé
      const partialMatches = sessionVerifications.filter(v => 
        v.text.includes(text) || text.includes(v.text)
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
        
        if (similarity >= 0.7) { // Seuil de correspondance partielle
          return {
            status: bestMatch.status,
            confidence: bestMatch.confidence,
            sources: bestMatch.sources,
            timestamp: bestMatch.timestamp,
            similarity
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Récupère toutes les vérifications pour une session donnée
   * 
   * @param sessionId Identifiant de la session
   * @returns Tableau des vérifications pour cette session
   */
  public getSessionVerifications(sessionId: string = 'default'): {
    text: string;
    status: VerificationStatus;
    confidence: number;
    sources: string[];
    timestamp: Date;
  }[] {
    return this.verifications
      .filter(v => v.sessionId === sessionId)
      .map(v => ({
        text: v.text,
        status: v.status,
        confidence: v.confidence,
        sources: v.sources,
        timestamp: v.timestamp
      }));
  }
  
  /**
   * Nettoie les vérifications d'une session spécifique
   * 
   * @param sessionId Identifiant de la session à nettoyer
   */
  public clearSession(sessionId: string): void {
    this.verifications = this.verifications.filter(v => v.sessionId !== sessionId);
  }
  
  /**
   * Nettoie toutes les vérifications (utilisé pour les tests)
   */
  public clearAll(): void {
    this.verifications = [];
  }
}
