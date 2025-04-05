/**
 * Transport StdioServer amélioré pour une meilleure compatibilité cross-plateforme
 * Compatible avec Windows, Mac et Linux
 */
import { platform } from 'os';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Transport StdioServer amélioré pour la compatibilité cross-plateforme
 * Gère spécifiquement les problèmes connus sur Windows
 */
export class EnhancedStdioServerTransport extends StdioServerTransport {
  constructor() {
    super();
    
    const currentPlatform = platform();
    console.error(`Smart-Thinking: Initialisation du transport stdio pour ${currentPlatform}`);
    
    // Configuration spécifique pour Windows
    if (currentPlatform === 'win32') {
      this.configureWindowsStdio();
    }
  }
  
  /**
   * Configure les flux stdin/stdout pour Windows
   * Résout plusieurs problèmes connus avec les flux sur Windows
   */
  private configureWindowsStdio(): void {
    try {
      // Définir l'encodage UTF-8 pour stdin/stdout
      process.stdin.setEncoding('utf8');
      process.stdout.setDefaultEncoding('utf8');
      
      // Éviter les problèmes de buffering sur Windows
      if (process.stdout._handle) {
        try {
          // @ts-ignore: Propriété non documentée mais nécessaire pour Windows
          process.stdout._handle.setBlocking(true);
        } catch (error) {
          console.error('Smart-Thinking: Impossible de configurer le mode bloquant pour stdout');
        }
      }
      
      if (process.stderr._handle) {
        try {
          // @ts-ignore: Propriété non documentée mais nécessaire pour Windows
          process.stderr._handle.setBlocking(true);
        } catch (error) {
          console.error('Smart-Thinking: Impossible de configurer le mode bloquant pour stderr');
        }
      }
      
      // Désactiver le buffering du stdout en définissant une taille de buffer de 0
      // Aide à résoudre les problèmes de communication sur Windows
      if (process.stdout._handle && typeof process.stdout._handle.setBlocking === 'function') {
        process.stdout._handle.setBlocking(true);
      }
      
      console.error('Smart-Thinking: Configuration Windows appliquée pour les flux stdio');
    } catch (error) {
      console.error(`Smart-Thinking: Erreur lors de la configuration des flux stdio: ${error}`);
    }
  }
}
