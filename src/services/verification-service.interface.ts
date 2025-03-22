import { ThoughtNode, VerificationResult, VerificationStatus, CalculationVerificationResult, VerificationDetailedStatus } from '../types';
import { VerificationSearchResult } from '../verification-memory';

/**
 * Interface pour le résultat de vérification préliminaire
 */
export interface PreliminaryVerificationResult {
  verifiedCalculations?: CalculationVerificationResult[];
  initialVerification: boolean;
  verificationInProgress: boolean;
  preverifiedThought: string;
}

/**
 * Interface pour le résultat de vérification existante
 */
export interface PreviousVerificationResult {
  previousVerification: VerificationSearchResult | null;
  verification?: VerificationResult;
  isVerified: boolean;
  verificationStatus: VerificationDetailedStatus;
  certaintySummary: string;
}

/**
 * Interface pour le service de vérification
 * 
 * Cette interface définit toutes les méthodes nécessaires pour vérifier des informations
 * et gérer la persistance des vérifications entre les sessions.
 */
export interface IVerificationService {
  /**
   * Effectue une vérification préliminaire d'une pensée (détection de calculs)
   * 
   * @param content Le contenu de la pensée à vérifier
   * @param explicitlyRequested Si la vérification est explicitement demandée
   * @returns Le résultat de la vérification préliminaire
   */
  performPreliminaryVerification(
    content: string,
    explicitlyRequested?: boolean
  ): Promise<PreliminaryVerificationResult>;
  
  /**
   * Recherche une vérification similaire existante
   * 
   * @param content Le contenu de la pensée à vérifier
   * @param sessionId L'identifiant de la session
   * @param thoughtType Le type de pensée (regular, conclusion, etc.)
   * @param connectedThoughtIds IDs des pensées connectées
   * @returns Le résultat de la recherche de vérification existante
   */
  checkPreviousVerification(
    content: string,
    sessionId?: string,
    thoughtType?: string,
    connectedThoughtIds?: string[]
  ): Promise<PreviousVerificationResult>;
  
  /**
   * Effectue une vérification approfondie d'une pensée
   * 
   * @param thought La pensée à vérifier
   * @param containsCalculations Si la pensée contient des calculs à vérifier
   * @param forceVerification Forcer une nouvelle vérification même si déjà vérifiée
   * @param sessionId L'identifiant de la session
   * @returns Le résultat de la vérification
   */
  deepVerify(
    thought: ThoughtNode,
    containsCalculations?: boolean,
    forceVerification?: boolean,
    sessionId?: string
  ): Promise<VerificationResult>;
  
  /**
   * Détecte et vérifie les calculs dans un texte
   * 
   * @param content Le texte à vérifier
   * @returns Les résultats de vérification des calculs
   */
  detectAndVerifyCalculations(
    content: string
  ): Promise<CalculationVerificationResult[]>;
  
  /**
   * Annote une pensée avec les résultats de vérification
   * 
   * @param content Le contenu de la pensée
   * @param verifications Les résultats de vérification
   * @returns Le contenu annoté
   */
  annotateThoughtWithVerifications(
    content: string,
    verifications: CalculationVerificationResult[]
  ): string;
  
  /**
   * Stocke une vérification dans la mémoire
   * 
   * @param content Le contenu vérifié
   * @param status Le statut de vérification
   * @param confidence Le niveau de confiance
   * @param sources Les sources utilisées
   * @param sessionId L'identifiant de la session
   * @returns L'identifiant de la vérification stockée
   */
  storeVerification(
    content: string,
    status: VerificationStatus,
    confidence: number,
    sources: string[],
    sessionId?: string
  ): Promise<string>;
}