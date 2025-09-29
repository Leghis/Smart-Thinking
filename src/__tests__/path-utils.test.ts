import { PathUtils } from '../utils/path-utils';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('PathUtils', () => {
  it('normalise les chemins WSL en chemins Windows', () => {
    const normalized = PathUtils.normalizePath('/mnt/c/Users/test/Documents');
    if (process.platform === 'win32') {
      expect(normalized).toBe('C:/Users/test/Documents');
    } else {
      expect(normalized).toBe('/mnt/c/Users/test/Documents');
    }
  });

  it('crée récursivement les répertoires demandés', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'smart-thinking-path-'));
    const target = path.join(base, 'niveau', 'deux', 'trois');

    await PathUtils.ensureDirectoryExists(target);

    expect(fs.existsSync(target)).toBe(true);

    fs.rmSync(base, { recursive: true, force: true });
  });

  it('fournit un répertoire de données absolu', () => {
    const dataDir = PathUtils.getDataDirectory();
    expect(path.isAbsolute(dataDir)).toBe(true);
  });
});
