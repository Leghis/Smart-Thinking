import { Implementation, ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

const PROJECT_HOMEPAGE = 'https://github.com/Leghis/Smart-Thinking';
const PROJECT_ICON = 'https://raw.githubusercontent.com/Leghis/Smart-Thinking/main/logoSmart-thinking.png';

export const SMART_THINKING_INSTRUCTIONS = [
  'Smart-Thinking fournit un raisonnement graphe local, deterministe et sans cle API par defaut.',
  'Utilisez smartthinking pour enrichir une session de raisonnement, search pour retrouver des memoires et fetch pour lire une memoire complete.',
  'En mode connector, exposez search/fetch uniquement pour les clients MCP distants.'
].join(' ');

export const SMART_THINKING_CAPABILITIES: ServerCapabilities = {
  logging: {},
  tools: { listChanged: true },
  prompts: { listChanged: true },
  resources: { listChanged: true, subscribe: false },
  completions: {}
};

export function buildServerImplementation(version: string): Implementation {
  return {
    name: 'smart-thinking-mcp',
    title: 'Smart-Thinking',
    version,
    websiteUrl: PROJECT_HOMEPAGE,
    icons: [
      {
        src: PROJECT_ICON,
        mimeType: 'image/png',
        sizes: ['512x512']
      }
    ]
  };
}

export const SERVER_DOCS_RESOURCE_URI = 'smart-thinking://docs/about';
export const SERVER_RUNTIME_RESOURCE_URI = 'smart-thinking://runtime/status';
