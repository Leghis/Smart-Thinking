/**
 * Cross-platform path helpers for Smart-Thinking data storage.
 */
import * as path from 'path';
import { platform } from 'os';
import * as fs from 'fs';

export class PathUtils {
  private static isWindows = platform() === 'win32';
  private static isMac = platform() === 'darwin';

  public static getHomeDirectory(): string {
    if (this.isWindows) {
      const userProfile = process.env.USERPROFILE;
      const homeDrive = process.env.HOMEDRIVE || '';
      const homePath = process.env.HOMEPATH || '';

      if (userProfile) {
        return userProfile;
      }
      if (homeDrive && homePath) {
        return homeDrive + homePath;
      }
      return 'C:\\Users\\Default';
    }

    return process.env.HOME || '/tmp';
  }

  public static getDataDirectory(): string {
    const homeDir = this.getHomeDirectory();

    if (this.isWindows) {
      const appData = process.env.APPDATA;
      return appData
        ? path.join(appData, 'Smart-Thinking', 'data')
        : path.join(homeDir, 'Documents', 'Smart-Thinking', 'data');
    }

    if (this.isMac) {
      return path.join(homeDir, 'Library', 'Application Support', 'Smart-Thinking', 'data');
    }

    return path.join(homeDir, '.smart-thinking', 'data');
  }

  /**
   * Resolves the data directory: explicit override, then env var, then platform default.
   */
  public static resolveDataDirectory(override?: string): string {
    const explicit = override?.trim();
    if (explicit) {
      return explicit;
    }

    const envOverride = process.env.SMART_THINKING_DATA_DIR?.trim();
    if (envOverride) {
      return envOverride;
    }

    return this.getDataDirectory();
  }

  public static async ensureDirectoryExists(dirPath: string): Promise<void> {
    const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.resolve(dirPath);

    try {
      await fs.promises.mkdir(absolutePath, { recursive: true, mode: 0o755 });
    } catch (error) {
      console.error(`Smart-Thinking: Erreur lors de la création du répertoire: ${absolutePath}`, error);

      try {
        await fs.promises.mkdir(this.getTempDirectory(), { recursive: true, mode: 0o777 });
        return;
      } catch (fallbackError) {
        throw new Error(`Impossible de créer le répertoire de données, même dans le dossier temporaire: ${fallbackError}`);
      }
    }
  }

  public static getTempDirectory(): string {
    const tempBase = this.isWindows
      ? process.env.TEMP || process.env.TMP || 'C:\\Temp'
      : '/tmp';

    return path.join(tempBase, 'Smart-Thinking');
  }
}
