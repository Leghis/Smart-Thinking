import { PathUtils } from '../utils/path-utils';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('PathUtils', () => {
  const originalDataDir = process.env.SMART_THINKING_DATA_DIR;

  afterEach(() => {
    if (originalDataDir === undefined) {
      delete process.env.SMART_THINKING_DATA_DIR;
    } else {
      process.env.SMART_THINKING_DATA_DIR = originalDataDir;
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
    delete process.env.SMART_THINKING_DATA_DIR;
    const dataDir = PathUtils.getDataDirectory();
    expect(path.isAbsolute(dataDir)).toBe(true);
  });

  it('resolveDataDirectory privilégie l\'override puis la variable d\'environnement', () => {
    process.env.SMART_THINKING_DATA_DIR = '/tmp/smart-thinking-env';

    expect(PathUtils.resolveDataDirectory('/tmp/smart-thinking-override')).toBe('/tmp/smart-thinking-override');
    expect(PathUtils.resolveDataDirectory()).toBe('/tmp/smart-thinking-env');
    expect(PathUtils.resolveDataDirectory('   ')).toBe('/tmp/smart-thinking-env');

    delete process.env.SMART_THINKING_DATA_DIR;
    expect(PathUtils.resolveDataDirectory()).toBe(PathUtils.getDataDirectory());
  });

  it('expose un répertoire temporaire dédié', () => {
    expect(PathUtils.getTempDirectory()).toContain('Smart-Thinking');
  });
});
