import path from 'path';

function loadPathUtilsWithPlatform(platformName: string, fsMock?: any) {
  jest.resetModules();

  jest.doMock('os', () => ({
    platform: () => platformName,
  }));

  if (fsMock) {
    jest.doMock('fs', () => fsMock);
  }

  const mod = require('../utils/path-utils');
  return mod.PathUtils as typeof import('../utils/path-utils').PathUtils;
}

describe('PathUtils platform variants', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.dontMock('fs');
    jest.dontMock('os');
    jest.resetModules();
  });

  it('couvre les chemins Windows (APPDATA + WSL normalization)', () => {
    process.env.APPDATA = 'C:/Users/test/AppData/Roaming';
    process.env.USERPROFILE = 'C:/Users/test';

    const PathUtils = loadPathUtilsWithPlatform('win32');

    expect(PathUtils.normalizePath('/mnt/c/Users/test/Documents')).toBe('C:/Users/test/Documents');
    expect(PathUtils.getDataDirectory()).toBe(path.join('C:/Users/test/AppData/Roaming', 'Smart-Thinking', 'data'));
    expect(PathUtils.getConfigDirectory()).toContain('Smart-Thinking');
    expect(PathUtils.getHomeDirectory()).toContain('C:/Users/test');
  });

  it('couvre les chemins macOS', () => {
    process.env.HOME = '/Users/runner';

    const PathUtils = loadPathUtilsWithPlatform('darwin');

    expect(PathUtils.getDataDirectory()).toBe(path.join('/Users/runner', 'Library', 'Application Support', 'Smart-Thinking', 'data'));
    expect(PathUtils.getConfigDirectory()).toBe(path.join('/Users/runner', 'Library', 'Application Support', 'Smart-Thinking'));
    expect(PathUtils.getTempDirectory()).toBe('/tmp/Smart-Thinking');
  });

  it('couvre les chemins Linux', () => {
    process.env.HOME = '/home/tester';

    const PathUtils = loadPathUtilsWithPlatform('linux');

    expect(PathUtils.getDataDirectory()).toBe(path.join('/home/tester', '.smart-thinking', 'data'));
    expect(PathUtils.getConfigDirectory()).toBe(path.join('/home/tester', '.smart-thinking'));
    expect(PathUtils.normalizePath('/tmp/demo')).toBe('/tmp/demo');
    expect(PathUtils.isAbsolutePath('/tmp/demo')).toBe(true);
  });

  it('couvre le fallback de création de dossier vers un répertoire temporaire', async () => {
    const mkdir = jest
      .fn()
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce(undefined);

    const fsMock = {
      promises: {
        mkdir,
      },
    };

    const PathUtils = loadPathUtilsWithPlatform('linux', fsMock);

    await expect(PathUtils.ensureDirectoryExists('/root/blocked/path')).resolves.toBeUndefined();

    expect(mkdir).toHaveBeenCalledTimes(2);
    expect(mkdir.mock.calls[1][0]).toContain('/tmp/Smart-Thinking');
  });

  it('retourne un fallback home Windows quand les variables sont absentes', () => {
    delete process.env.USERPROFILE;
    delete process.env.HOMEDRIVE;
    delete process.env.HOMEPATH;

    const PathUtils = loadPathUtilsWithPlatform('win32');
    expect(PathUtils.getHomeDirectory()).toBe('C:\\Users\\Default');
  });
});
