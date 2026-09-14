import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  createSmartThinkingServer,
  type SmartThinkingServerOptions,
} from './server/smart-thinking-server';
import { createEnvironment, type SmartThinkingEnvironment } from './server/environment';

const ModeSchema = z.enum(['full', 'connector']).describe('Mode full: tous les outils, mode connector: search+fetch uniquement');
const LogLevelSchema = z.enum(['silent', 'error', 'warn', 'info', 'debug']);
const SearchProviderSchema = z.enum(['auto', 'tavily', 'native', 'off']);

export const configSchema = z.object({
  mode: ModeSchema.default('full'),
  includePrompts: z.boolean().default(true).describe('Expose les prompts MCP'),
  includeResources: z.boolean().default(true).describe('Expose les ressources MCP'),
  includeWebTools: z.boolean().default(true).describe('Expose web_search, verify, plan et session'),
  logLevel: LogLevelSchema.default('info').describe('Niveau de logs runtime'),
  searchProvider: SearchProviderSchema.default('auto').describe('Provider de recherche web par défaut'),
  tavilyApiKey: z.string().optional().describe('Clé API Tavily (optionnelle, jamais écrite sur disque)'),
  dataDir: z.string().optional().describe('Répertoire de données personnalisé'),
  disablePersistence: z.boolean().default(false).describe('Désactiver la persistance disque (tests, CI)'),
}).default({
  mode: 'full',
  includePrompts: true,
  includeResources: true,
  includeWebTools: true,
  logLevel: 'info',
  searchProvider: 'auto',
  disablePersistence: false,
});

export type SmartThinkingConfig = z.infer<typeof configSchema>;

interface CreateServerArgs {
  config?: SmartThinkingConfig;
}

function resolveServerOptions(config: SmartThinkingConfig): SmartThinkingServerOptions {
  return {
    includeSmartThinkingTool: config.mode !== 'connector',
    includePrompts: config.includePrompts,
    includeResources: config.includeResources,
    includeWebTools: config.includeWebTools && config.mode !== 'connector',
  };
}

export function buildEnvironment(config: SmartThinkingConfig): SmartThinkingEnvironment {
  const parsed = configSchema.parse(config);
  return createEnvironment({
    dataDir: parsed.dataDir,
    persistenceDisabled: parsed.disablePersistence,
    search: {
      provider: parsed.searchProvider,
      ...(parsed.tavilyApiKey ? { tavilyApiKey: parsed.tavilyApiKey } : {}),
    },
    runtime: { logLevel: parsed.logLevel },
  });
}

export default function createServer({ config }: CreateServerArgs = {}): Server {
  const resolvedConfig = configSchema.parse(config ?? {});
  const environment = buildEnvironment(resolvedConfig);
  const { server } = createSmartThinkingServer(environment, resolveServerOptions(resolvedConfig));
  return server.server;
}

export { createSmartThinkingServer } from './server/smart-thinking-server';
export { createEnvironment } from './server/environment';
export type { SmartThinkingEnvironment } from './server/environment';
