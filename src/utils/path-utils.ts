/**
 * Utilitaires pour gérer les chemins de fichiers de manière cross-plateforme
 * Compatible avec Windows, Mac et Linux
 */
import * as path from 'path';
import { platform } from 'os';
import * as fs from 'fs';

/**
 * Classe d'utilitaires pour gérer les chemins de fichiers de manière cross-plateforme
 */
export class PathUtils {
  private static isWindows = platform() === 'win32';
  private static isMac = platform() === 'darwin';
  private static isLinux = platform() === 'linux';

  /**
   * Normalise un chemin pour qu'il soit compatible avec la plateforme actuelle
   * @param inputPath Chemin d'entrée
   * @returns Chemin normalisé
   */
  public static normalizePath(inputPath: string): string {
    if (!inputPath) return inputPath;
    
    // Normaliser le chemin selon la plateforme
    let normalizedPath = path.normalize(inputPath);
    
    if (this.isWindows) {
      // Convertir tous les backslashes en forward slashes pour être cohérent
      normalizedPath = normalizedPath.replace(/\\/g, '/');
      
      // Gérer les chemins UNC Windows (commençant par \\)
      if (normalizedPath.startsWith('//')) {
        return normalizedPath;
      }
      
      // Gérer les chemins de style WSL comme /mnt/c/...
      if (normalizedPath.startsWith('/mnt/')) {
        const driveLetter = normalizedPath.charAt(5);
        if (/[a-z]/i.test(driveLetter)) {
          return `${driveLetter.toUpperCase()}:${normalizedPath.slice(6)}`;
        }
      }
    }
    
    return normalizedPath;
  }

  /**
   * Obtient le chemin absolu d'un fichier
   * @param relativePath Chemin relatif
   * @returns Chemin absolu
   */
  public static getAbsolutePath(relativePath: string): string {
    return path.resolve(relativePath);
  }

  /**
   * Obtient le répertoire de données du serveur
   * @returns Chemin du répertoire de données
   */
  public static getDataDirectory(): string {
    const dataDir = path.join(process.cwd(), 'data');
    console.error(`Smart-Thinking: Répertoire de données configuré: ${dataDir}`);
    return dataDir;
  }

  /**
   * Obtient le répertoire de configuration selon la plateforme
   * @returns Chemin du répertoire de configuration
   */
  public static getConfigDirectory(): string {
    if (this.isWindows) {
      return process.env.APPDATA 
        ? path.join(process.env.APPDATA, 'Smart-Thinking') 
        : path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'Smart-Thinking');
    } else if (this.isMac) {
      return path.join(process.env.HOME || '', 'Library', 'Application Support', 'Smart-Thinking');
    } else {
      return path.join(process.env.HOME || '', '.smart-thinking');
    }
  }

  /**
   * Vérifie si un chemin est absolu
   * @param filePath Chemin à vérifier
   * @returns true si le chemin est absolu
   */
  public static isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }
  
  /**
   * Crée un répertoire s'il n'existe pas déjà
   * @param dirPath Chemin du répertoire à créer
   * @returns Promise qui se résout quand le répertoire existe
   */
  public static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
      console.error(`Smart-Thinking: Répertoire créé ou confirmé: ${dirPath}`);
    } catch (error) {
      console.error(`Smart-Thinking: Erreur lors de la création du répertoire: ${error}`);
      
      // Essayer un répertoire alternatif sur Windows en cas d'échec
      if (this.isWindows) {
        try {
          const altDir = path.join(process.env.USERPROFILE || '', 'Documents', 'Smart-Thinking');
          await fs.promises.mkdir(altDir, { recursive: true });
          console.error(`Smart-Thinking: Création d'un répertoire alternatif: ${altDir}`);
          return;
        } catch (altError) {
          throw new Error(`Impossible de créer le répertoire de données: ${altError}`);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Obtient le chemin d'installation de Node.js
   * Utile pour les configurations spécifiques à NVM
   * @returns Chemin d'installation de Node.js
   */
  public static getNodeInstallPath(): string {
    // Obtenir le chemin du processus Node en cours d'exécution
    const nodePath = process.execPath;
    console.error(`Smart-Thinking: Chemin Node.js détecté: ${nodePath}`);
    return nodePath;
  }
}
