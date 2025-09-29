import { ToolIntegrator } from '../tool-integrator';
import { MetricsCalculator } from '../metrics-calculator';
import { VerificationMemory } from '../verification-memory';
// Importer le service de vérification standard (sans le suffixe -improved)
import { VerificationService } from './verification-service';
import { IVerificationService } from './verification-service.interface';
import { SimilarityEngine } from '../similarity-engine';

/**
 * Conteneur de services amélioré pour l'injection de dépendances
 * Utilise le service de vérification amélioré
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  
  private services: Map<string, any> = new Map();
  
  /**
   * Constructeur privé pour implémenter le pattern Singleton
   */
  private constructor() {
    // Initialisation vide - les services seront ajoutés plus tard
  }
  
  /**
   * Méthode pour obtenir l'instance unique du conteneur
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
  
  /**
   * Initialise et enregistre les services principaux
   * 
   * @param toolIntegrator L'intégrateur d'outils existant
   * @param metricsCalculator Le calculateur de métriques existant
   * @param similarityEngine Le moteur de similarité existant
   */
  public initializeServices(
    toolIntegrator: ToolIntegrator,
    metricsCalculator: MetricsCalculator,
    similarityEngine: SimilarityEngine
  ): void {
    // Enregistrer les services existants
    this.services.set('toolIntegrator', toolIntegrator);
    this.services.set('metricsCalculator', metricsCalculator);
    this.services.set('similarityEngine', similarityEngine);
    
    // Obtenir l'instance singleton de VerificationMemory
    const verificationMemory = VerificationMemory.getInstance();
    this.services.set('verificationMemory', verificationMemory);
    
    // Injecter le moteur de similarité dans VerificationMemory
    verificationMemory.setSimilarityEngine(similarityEngine);
    
    // Créer le service de vérification amélioré avec ses dépendances
    const verificationService = new VerificationService(
      toolIntegrator,
      metricsCalculator,
      verificationMemory
    );
    this.services.set('verificationService', verificationService);
    
    console.error('Service Container: Service de vérification amélioré initialisé avec succès');
  }
  
  /**
   * Obtient un service par son nom
   * 
   * @param serviceName Le nom du service
   * @returns L'instance du service ou null s'il n'existe pas
   */
  public getService<T>(serviceName: string): T | null {
    const service = this.services.get(serviceName) as T;
    if (!service) {
      console.error(`Service Container: Le service "${serviceName}" n'est pas disponible. Vérifiez qu'il a été correctement initialisé.`);
      return null;
    }
    return service;
  }
  
  /**
   * Obtient le service de vérification
   * 
   * @returns Le service de vérification
   */
  public getVerificationService(): IVerificationService {
    const service = this.getService<IVerificationService>('verificationService');
    if (!service) {
      throw new Error('Service Container: Le service de vérification n\'est pas disponible. Assurez-vous d\'appeler initializeServices() avant d\'utiliser getVerificationService().');
    }
    return service;
  }
  
  /**
   * Enregistre un service
   * 
   * @param serviceName Le nom du service
   * @param serviceInstance L'instance du service
   */
  public registerService(serviceName: string, serviceInstance: any): void {
    this.services.set(serviceName, serviceInstance);
    console.error(`Service Container: Service "${serviceName}" enregistré avec succès`);
  }
  
  /**
   * Vérifie si un service est disponible
   * 
   * @param serviceName Le nom du service à vérifier
   * @returns true si le service est disponible, false sinon
   */
  public hasService(serviceName: string): boolean {
    return this.services.has(serviceName);
  }
  
  /**
   * Réinitialise le conteneur de services (utile pour les tests)
   */
  public static resetInstance(): void {
    ServiceContainer.instance = new ServiceContainer();
  }
  
  /**
   * Affiche la liste des services disponibles
   * Utile pour le débogage
   */
  public listServices(): string[] {
    return Array.from(this.services.keys());
  }
}
