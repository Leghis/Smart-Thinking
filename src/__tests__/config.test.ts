const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.resetModules();
  jest.dontMock('os');
});

async function loadConfigForPlatform(platformName: NodeJS.Platform, env: Record<string, string | undefined> = {}) {
  jest.resetModules();
  jest.doMock('os', () => ({ platform: jest.fn(() => platformName) }));
  process.env = { ...process.env, ...env };
  // Utiliser require pour éviter la dépendance au support ESM expérimental dans Jest.
  return Promise.resolve(require('../config'));
}

describe('Configuration Smart-Thinking', () => {
  it('fournit des chemins spécifiques pour Windows', async () => {
    const { PlatformConfig } = await loadConfigForPlatform('win32', {
      APPDATA: 'C:/Users/Test/AppData/Roaming',
    });

    const configPath = PlatformConfig.getConfigPath();
    expect(configPath).toContain('Smart-Thinking');
    expect(configPath.toLowerCase()).toContain('appdata');
    expect(PlatformConfig.getTempPath().toLowerCase()).toContain('smart-thinking');
  });

  it('définit un identifiant de session par défaut et des seuils cohérents', async () => {
    const { SystemConfig, VerificationConfig, PlatformConfig } = await loadConfigForPlatform(process.platform as NodeJS.Platform);

    expect(SystemConfig.DEFAULT_SESSION_ID).toBe('default');
    expect(VerificationConfig.CONFIDENCE.HIGH_CONFIDENCE).toBeGreaterThan(VerificationConfig.CONFIDENCE.VERIFICATION_REQUIRED);
    expect(typeof PlatformConfig.isNvmEnvironment()).toBe('boolean');
  });

  it('détecte un environnement NVM sur Windows', async () => {
    const { PlatformConfig } = await loadConfigForPlatform('win32', {
      APPDATA: undefined,
      USERPROFILE: 'C:/Users/Test',
      NVM_SYMLINK: 'C:/Program Files/nodejs',
    });

    const originalExec = process.execPath;
    Object.defineProperty(process, 'execPath', {
      value: 'C:/Users/Test/AppData/Roaming/nvm/node.exe',
      configurable: true,
    });

    try {
      expect(PlatformConfig.isNvmEnvironment()).toBe(true);
      expect(PlatformConfig.getNvmBasePath()).toContain('nvm');
    } finally {
      Object.defineProperty(process, 'execPath', { value: originalExec });
    }
  });
});
