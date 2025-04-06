/**
 * Utilitaires pour gérer les chemins de fichiers de manière cross-plateforme
 * Compatible avec Windows, Mac et Linux
 */
import * as path from 'path';
import { platform } from 'os';
import * as fs from 'fs';

// Constante pour contrôler l'affichage des logs de débogage
const DEBUG_MODE = false;

/**
 * Classe d'utilitaires pour gérer les chemins de fichiers de manière cross-plateforme
 */
export class PathUtils {
  private static isWindows = platform() === 'win32';
  private static isMac = platform() === 'darwin';
  private static isLinux = platform() === 'linux';

  /**
   * Fonction de log pour le débogage uniquement
   * @param message Message à logger
   */
  private static debugLog(message: string): void {
    if (DEBUG_MODE) {
      console.error(`Smart-Thinking Debug: ${message}`);
    }
  }

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
   * Obtient un chemin absolu pour le home directory de l'utilisateur
   * @returns Chemin absolu du home directory
   */
  public static getHomeDirectory(): string {
    // Garantir un chemin valide même si HOME/USERPROFILE n'est pas défini
    let homeDir = '';
    
    if (this.isWindows) {
      const userProfile = process.env.USERPROFILE;
      const homeDrive = process.env.HOMEDRIVE || '';
      const homePath = process.env.HOMEPATH || '';
      
      if (userProfile) {
        homeDir = userProfile;
      } else if (homeDrive && homePath) {
        homeDir = homeDrive + homePath;
      } else {
        homeDir = 'C:\\Users\\Default';
      }
    } else {
      homeDir = process.env.HOME || '/tmp';
    }
    
    return homeDir;
  }

  /**
   * Obtient le répertoire de données du serveur
   * @returns Chemin absolu du répertoire de données
   */
  public static getDataDirectory(): string {
    // Toujours utiliser des chemins absolus
    const homeDir = this.getHomeDirectory();
    let dataDir: string;
    
    if (this.isWindows) {
      // Sur Windows, utiliser AppData\Roaming ou Documents
      const appData = process.env.APPDATA;
      
      if (appData) {
        dataDir = path.join(appData, 'Smart-Thinking', 'data');
      } else {
        dataDir = path.join(homeDir, 'Documents', 'Smart-Thinking', 'data');
      }
    } else if (this.isMac) {
      // Sur Mac, utiliser ~/Library/Application Support
      dataDir = path.join(homeDir, 'Library', 'Application Support', 'Smart-Thinking', 'data');
    } else {
      // Sur Linux et autres, utiliser ~/.smart-thinking
      dataDir = path.join(homeDir, '.smart-thinking', 'data');
    }
    
    this.debugLog(`Répertoire de données configuré: ${dataDir}`);
    return dataDir;
  }

  /**
   * Obtient le répertoire de configuration selon la plateforme
   * @returns Chemin du répertoire de configuration
   */
  public static getConfigDirectory(): string {
    const homeDir = this.getHomeDirectory();
    
    if (this.isWindows) {
      const appData = process.env.APPDATA;
      if (appData) {
        return path.join(appData, 'Smart-Thinking');
      } else {
        return path.join(homeDir, 'AppData', 'Roaming', 'Smart-Thinking');
      }
    } else if (this.isMac) {
      return path.join(homeDir, 'Library', 'Application Support', 'Smart-Thinking');
    } else {
      return path.join(homeDir, '.smart-thinking');
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
   * Crée un répertoire et ses parents s'ils n'existent pas déjà
   * @param dirPath Chemin du répertoire à créer
   * @returns Promise qui se résout quand le répertoire existe
   */
  public static async ensureDirectoryExists(dirPath: string): Promise<void> {
    // S'assurer que le chemin est absolu
    if (!path.isAbsolute(dirPath)) {
      dirPath = path.resolve(dirPath);
    }
    
    try {
      // Créer récursivement tous les répertoires parents
      await fs.promises.mkdir(dirPath, { recursive: true, mode: 0o755 });
      this.debugLog(`Répertoire créé ou confirmé: ${dirPath}`);
    } catch (error) {
      // Log d'erreur important - garder
      console.error(`Smart-Thinking: Erreur lors de la création du répertoire: ${dirPath}`, error);
      
      // Essayer un répertoire alternatif en cas d'échec
      try {
        const homeDir = this.getHomeDirectory();
        const tempDir = this.isWindows ? 
          path.join(homeDir, 'AppData', 'Local', 'Temp', 'Smart-Thinking') : 
          path.join('/tmp', 'Smart-Thinking');
        
        await fs.promises.mkdir(tempDir, { recursive: true, mode: 0o777 });
        this.debugLog(`Utilisation du répertoire temporaire: ${tempDir}`);
        return; 
      } catch (fallbackError) {
        throw new Error(`Impossible de créer de répertoire de données, même dans le dossier temporaire: ${fallbackError}`);
      }
    }
  }
  
  /**
   * Obtient le répertoire temporaire spécifique à la plateforme
   * @returns Chemin du répertoire temporaire
   */
  public static getTempDirectory(): string {
    const tempBase = this.isWindows ? 
      process.env.TEMP || process.env.TMP || 'C:\\Temp' : 
      '/tmp';
    
    return path.join(tempBase, 'Smart-Thinking');
  }
  
  /**
   * Obtient le chemin d'installation de Node.js
   * Utile pour les configurations spécifiques à NVM
   * @returns Chemin d'installation de Node.js
   */
  public static getNodeInstallPath(): string {
    // Obtenir le chemin du processus Node en cours d'exécution
    const nodePath = process.execPath;
    this.debugLog(`Chemin Node.js détecté: ${nodePath}`);
    return nodePath;
  }
}