import { ToolIntegrator } from '../tool-integrator';
import { MetricsCalculator } from '../metrics-calculator';
import { VerificationMemory } from '../verification-memory';
import { VerificationService } from './verification-service';
import { IVerificationService } from './verification-service.interface';
import { SimilarityEngine } from '../similarity-engine';

type ServiceRegistry = {
  toolIntegrator: ToolIntegrator;
  metricsCalculator: MetricsCalculator;
  similarityEngine: SimilarityEngine;
  verificationMemory: VerificationMemory;
  verificationService: IVerificationService;
};

/**
 * Conteneur de services pour l'injection de dependances.
 *
 * Note: l'API singleton est conservee pour compatibilite, mais les enregistrements
 * sont desormais fortement types.
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private readonly services = new Map<keyof ServiceRegistry | string, unknown>();

  private constructor() {
    // constructeur prive pour conserver le singleton
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  public initializeServices(
    toolIntegrator: ToolIntegrator,
    metricsCalculator: MetricsCalculator,
    similarityEngine: SimilarityEngine,
  ): void {
    this.services.clear();

    this.services.set('toolIntegrator', toolIntegrator);
    this.services.set('metricsCalculator', metricsCalculator);
    this.services.set('similarityEngine', similarityEngine);

    const verificationMemory = VerificationMemory.getInstance();
    verificationMemory.setSimilarityEngine(similarityEngine);
    this.services.set('verificationMemory', verificationMemory);

    const verificationService = new VerificationService(
      toolIntegrator,
      metricsCalculator,
      verificationMemory,
    );

    this.services.set('verificationService', verificationService);
    console.info('Service Container: service de verification initialise');
  }

  public getService<K extends keyof ServiceRegistry>(serviceName: K): ServiceRegistry[K] | null {
    const service = this.services.get(serviceName) as ServiceRegistry[K] | undefined;
    if (!service) {
      console.warn(`Service Container: service indisponible: ${String(serviceName)}`);
      return null;
    }

    return service;
  }

  public getVerificationService(): IVerificationService {
    const service = this.getService('verificationService');
    if (!service) {
      throw new Error('Service Container: service de verification indisponible. Appelez initializeServices() avant usage.');
    }

    return service;
  }

  public registerService(serviceName: string, serviceInstance: unknown): void {
    this.services.set(serviceName, serviceInstance);
    console.info(`Service Container: service enregistre: ${serviceName}`);
  }

  public hasService(serviceName: keyof ServiceRegistry | string): boolean {
    return this.services.has(serviceName);
  }

  public static resetInstance(): void {
    ServiceContainer.instance = new ServiceContainer();
  }

  public listServices(): string[] {
    return Array.from(this.services.keys(), key => String(key));
  }
}
