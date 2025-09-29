import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createSmartThinkingServer, type SmartThinkingServerOptions } from './server/smart-thinking-server';

const ModeSchema = z.enum(['full', 'connector']).describe('Mode du serveur Smart-Thinking');

export const configSchema = z.object({
  mode: ModeSchema.default('full')
}).default({ mode: 'full' });

type ConfigSchema = z.infer<typeof configSchema>;

interface CreateServerArgs {
  config?: ConfigSchema;
}

function resolveServerOptions(config: ConfigSchema): SmartThinkingServerOptions {
  return {
    includeSmartThinkingTool: config.mode !== 'connector'
  };
}

export default function createServer({ config }: CreateServerArgs = {}): Server {
  const resolvedConfig = configSchema.parse(config ?? {});
  const options = resolveServerOptions(resolvedConfig);
  const { server } = createSmartThinkingServer(undefined, options);
  return server.server;
}

export { createSmartThinkingServer } from './server/smart-thinking-server';
