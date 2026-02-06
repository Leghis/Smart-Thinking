import createServer, { configSchema } from '../index';
import * as services from '../services';

describe('Public exports', () => {
  it('parse la configuration et instancie un serveur MCP en mode connector/full', () => {
    const parsed = configSchema.parse({ mode: 'connector' });
    expect(parsed.mode).toBe('connector');
    expect(parsed.includePrompts).toBe(true);
    expect(parsed.includeResources).toBe(true);
    expect(parsed.enableExternalTools).toBe(false);

    const fullServer = createServer({ config: { mode: 'full' } });
    const connectorServer = createServer({ config: { mode: 'connector' } });

    expect(fullServer).toBeDefined();
    expect(connectorServer).toBeDefined();
  });

  it('expose le barrel des services', () => {
    expect(services).toHaveProperty('ServiceContainer');
    expect(services).toHaveProperty('VerificationService');
  });
});
