import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createSmartThinkingServer, type SmartThinkingServerOptions } from './server/smart-thinking-server';

const ModeSchema = z.enum(['full', 'connector']).describe('Mode de disponibilite des outils exposees');
const LogLevelSchema = z.enum(['silent', 'error', 'warn', 'info', 'debug']);

export const configSchema = z.object({
  mode: ModeSchema.default('full').describe('Mode full: smartthinking+search+fetch, mode connector: search+fetch'),
  includePrompts: z.boolean().default(true).describe('Expose les prompts MCP du serveur'),
  includeResources: z.boolean().default(true).describe('Expose les ressources MCP du serveur'),
  enableExternalTools: z.boolean().default(false).describe('Active les integrations externes optionnelles de ToolIntegrator'),
  logLevel: LogLevelSchema.default('info').describe('Niveau de logs runtime pour Smart-Thinking'),
}).default({
  mode: 'full',
  includePrompts: true,
  includeResources: true,
  enableExternalTools: false,
  logLevel: 'info',
});

type ConfigSchema = z.infer<typeof configSchema>;

interface CreateServerArgs {
  config?: ConfigSchema;
}

function resolveServerOptions(config: ConfigSchema): SmartThinkingServerOptions {
  return {
    includeSmartThinkingTool: config.mode !== 'connector',
    includePrompts: config.includePrompts,
    includeResources: config.includeResources,
  };
}

function applyRuntimeConfig(config: ConfigSchema): void {
  process.env.SMART_THINKING_ENABLE_EXTERNAL_TOOLS = config.enableExternalTools ? 'true' : 'false';

  if (!process.env.SMART_THINKING_LOG_LEVEL) {
    process.env.SMART_THINKING_LOG_LEVEL = config.logLevel;
  }
}

export default function createServer({ config }: CreateServerArgs = {}): Server {
  const resolvedConfig = configSchema.parse(config ?? {});
  applyRuntimeConfig(resolvedConfig);

  const options = resolveServerOptions(resolvedConfig);
  const { server } = createSmartThinkingServer(undefined, options);
  return server.server;
}

export { createSmartThinkingServer } from './server/smart-thinking-server';
