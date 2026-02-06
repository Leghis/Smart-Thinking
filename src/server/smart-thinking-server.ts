import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FetchParamsSchema, SearchParamsSchema } from './contracts';
import { SmartThinkingEnvironment, getSmartThinkingEnvironment } from './environment';
import {
  buildServerImplementation,
  SMART_THINKING_CAPABILITIES,
  SMART_THINKING_INSTRUCTIONS,
} from './server-metadata';
import { registerCoreTools } from './registrations/tool-registrations';
import { registerServerPrompts } from './registrations/prompt-registrations';
import { registerServerResources } from './registrations/resource-registrations';

interface SmartThinkingServerOptions {
  includeSmartThinkingTool?: boolean;
  includePrompts?: boolean;
  includeResources?: boolean;
}

export function createSmartThinkingServer(
  env?: SmartThinkingEnvironment,
  options?: SmartThinkingServerOptions,
): { server: McpServer; env: SmartThinkingEnvironment } {
  const environment = env ?? getSmartThinkingEnvironment();

  const server = new McpServer(
    buildServerImplementation(environment.version),
    {
      capabilities: SMART_THINKING_CAPABILITIES,
      instructions: SMART_THINKING_INSTRUCTIONS,
    },
  );

  const {
    includeSmartThinkingTool = true,
    includePrompts = true,
    includeResources = true,
  } = options ?? {};

  registerCoreTools(server, environment, { includeSmartThinkingTool });

  if (includePrompts) {
    registerServerPrompts(server);
  }

  if (includeResources) {
    registerServerResources(server, environment);
  }

  return { server, env: environment };
}

export const SearchSchema = SearchParamsSchema;
export const FetchSchema = FetchParamsSchema;
export type { SmartThinkingServerOptions };
