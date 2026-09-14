import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FetchParamsSchema, SearchParamsSchema, SmartThinkingParamsSchema, WebSearchParamsSchema } from './contracts';
import { SmartThinkingEnvironment, getSmartThinkingEnvironment } from './environment';
import {
  buildServerImplementation,
  SMART_THINKING_CAPABILITIES,
  SMART_THINKING_INSTRUCTIONS,
} from './server-metadata';
import { registerCoreTools } from './registrations/tool-registrations';
import { registerServerPrompts } from './registrations/prompt-registrations';
import { registerServerResources } from './registrations/resource-registrations';

export interface SmartThinkingServerOptions {
  includeSmartThinkingTool?: boolean;
  includePrompts?: boolean;
  includeResources?: boolean;
  includeWebTools?: boolean;
}

export function createSmartThinkingServer(
  env?: SmartThinkingEnvironment,
  options?: SmartThinkingServerOptions,
): { server: McpServer; env: SmartThinkingEnvironment } {
  const environment = env ?? getSmartThinkingEnvironment();

  const server = new McpServer(buildServerImplementation(environment.version), {
    capabilities: SMART_THINKING_CAPABILITIES,
    instructions: SMART_THINKING_INSTRUCTIONS,
  });

  const {
    includeSmartThinkingTool = true,
    includePrompts = true,
    includeResources = true,
    includeWebTools = true,
  } = options ?? {};

  registerCoreTools(server, environment, { includeSmartThinkingTool, includeWebTools });

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
export const WebSearchSchema = WebSearchParamsSchema;
export const SmartThinkingSchema = SmartThinkingParamsSchema;
