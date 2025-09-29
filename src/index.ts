#!/usr/bin/env node
/* istanbul ignore file -- Point d'entrée CLI difficile à tester automatiquement */

import './utils/logger';
import express, { type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { EnhancedStdioServerTransport } from './utils/platform-stdio';
import { PathUtils } from './utils/path-utils';
import { PlatformConfig } from './config';
import { createSmartThinkingServer } from './server/smart-thinking-server';

interface CliOptions {
  transport: 'stdio' | 'http' | 'sse' | 'stream';
  port: number;
  host: string;
  allowOrigins: string[];
  allowHosts: string[];
  enableSse: boolean;
  enableStream: boolean;
  mode: 'full' | 'connector';
}

type SessionTransport = StreamableHTTPServerTransport | SSEServerTransport;

interface SessionState {
  transport: SessionTransport;
  serverClose: () => Promise<void>;
  type: 'stream' | 'sse';
}

(async () => {
  const options = parseArgs(process.argv.slice(2));

  try {
    await ensureDataDirExists();
    if (options.transport === 'stdio') {
      await startStdIoServer(options);
    } else {
      await startHttpServer(options);
    }
  } catch (error) {
    console.error('Smart-Thinking: échec du démarrage du serveur', error);
    process.exit(1);
  }
})();

function parseArgs(argv: string[]): CliOptions {
  const envMode = (process.env.SMART_THINKING_MODE ?? '').toLowerCase();
  const defaultMode: 'full' | 'connector' = envMode === 'connector' ? 'connector' : 'full';

  const options: CliOptions = {
    transport: 'stdio',
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    host: process.env.HOST ?? '0.0.0.0',
    allowOrigins: [],
    allowHosts: [],
    enableSse: true,
    enableStream: true,
    mode: defaultMode
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inlineValue] = arg.includes('=') ? arg.split('=', 2) : [arg, undefined];

    const readValue = (): string | undefined => {
      if (inlineValue !== undefined) {
        return inlineValue;
      }
      const nextArg = argv[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        i += 1;
        return nextArg;
      }
      return undefined;
    };

    switch (flag) {
      case '--transport': {
        const value = readValue();
        if (value === 'stdio' || value === 'http' || value === 'sse' || value === 'stream') {
          options.transport = value;
        }
        break;
      }
      case '--port': {
        const value = readValue();
        const port = value ? Number(value) : NaN;
        if (!Number.isNaN(port)) {
          options.port = port;
        }
        break;
      }
      case '--host': {
        const value = readValue();
        if (value) {
          options.host = value;
        }
        break;
      }
      case '--allow-origin': {
        const value = readValue();
        if (value) {
          options.allowOrigins.push(value);
        }
        break;
      }
      case '--allow-host': {
        const value = readValue();
        if (value) {
          options.allowHosts.push(value);
        }
        break;
      }
      case '--disable-sse':
        options.enableSse = false;
        break;
      case '--disable-stream':
        options.enableStream = false;
        break;
      case '--mode': {
        const value = readValue();
        if (value === 'full' || value === 'connector') {
          options.mode = value;
        }
        break;
      }
      default:
        break;
    }
  }

  if (options.transport === 'sse') {
    options.enableSse = true;
    options.enableStream = false;
  } else if (options.transport === 'stream') {
    options.enableSse = false;
    options.enableStream = true;
  } else if (options.transport === 'http') {
    options.enableSse = options.enableSse !== false;
    options.enableStream = options.enableStream !== false;
  }

  if (options.transport !== 'stdio' && !options.enableSse && !options.enableStream) {
    options.enableStream = true;
  }

  return options;
}

async function startStdIoServer(options: CliOptions): Promise<void> {
  configureStdoutFiltering();
  if (options.mode === 'connector') {
    console.log('Smart-Thinking: mode connecteur actif (outils search & fetch uniquement)');
  }
  const { server } = createSmartThinkingServer(undefined, {
    includeSmartThinkingTool: options.mode !== 'connector'
  });
  const transport = new EnhancedStdioServerTransport();
  try {
    await server.connect(transport);
  } catch (error) {
    console.error('Smart-Thinking: échec de la connexion STDIO', error);
    throw error;
  }
}

async function startHttpServer(options: CliOptions): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '4mb' }));
  app.use(createCorsMiddleware(options));

  if (options.mode === 'connector') {
    console.log('Smart-Thinking: mode connecteur actif (outils search & fetch uniquement)');
  }

  const sessions = new Map<string, SessionState>();
  const dnsProtectionEnabled = options.allowHosts.length > 0 || options.allowOrigins.length > 0;

  if (options.enableStream) {
    app.all('/mcp', async (req, res) => {
      try {
        const sessionHeader = req.headers['mcp-session-id'];
        const sessionId = Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;
        if (sessionId) {
          const state = sessions.get(sessionId);
          if (!state || state.type !== 'stream') {
            res.status(404).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Session inconnue pour le transport streamable HTTP'
              },
              id: null
            });
            return;
          }
          await (state.transport as StreamableHTTPServerTransport).handleRequest(req, res, req.body);
          return;
        }

        if (req.method !== 'POST' || !isInitializeRequest(req.body)) {
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Initialisation manquante ou requête invalide'
            },
            id: null
          });
          return;
        }

        const { server } = createSmartThinkingServer(undefined, {
          includeSmartThinkingTool: options.mode !== 'connector'
        });
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableDnsRebindingProtection: dnsProtectionEnabled,
          allowedHosts: options.allowHosts.length ? options.allowHosts : undefined,
          allowedOrigins: options.allowOrigins.length ? options.allowOrigins : undefined,
          onsessioninitialized: (id) => {
            sessions.set(id, {
              transport,
              serverClose: () => server.close().catch(() => undefined),
              type: 'stream'
            });
          },
          onsessionclosed: (id) => {
            void cleanupSession(sessions, id, true);
          }
        });

        transport.onerror = (error) => {
          console.error('Smart-Thinking: erreur transport streamable', error);
        };
        transport.onclose = () => {
          void cleanupSession(sessions, transport.sessionId, true);
        };

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Erreur interne du serveur'
            },
            id: null
          });
        }
        console.error('Smart-Thinking: erreur lors du traitement streamable HTTP', error);
      }
    });
  } else {
    app.all('/mcp', (_req, res) => {
      res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Transport streamable HTTP désactivé sur ce serveur'
        },
        id: null
      });
    });
  }

  if (options.enableSse) {
    app.get('/sse', async (req, res) => {
      try {
        const { server } = createSmartThinkingServer(undefined, {
          includeSmartThinkingTool: options.mode !== 'connector'
        });
        const transport = new SSEServerTransport('/messages', res, {
          enableDnsRebindingProtection: dnsProtectionEnabled,
          allowedHosts: options.allowHosts.length ? options.allowHosts : undefined,
          allowedOrigins: options.allowOrigins.length ? options.allowOrigins : undefined
        });
        const sessionId = transport.sessionId;
        sessions.set(sessionId, {
          transport,
          serverClose: () => server.close().catch(() => undefined),
          type: 'sse'
        });

        transport.onclose = () => {
          void cleanupSession(sessions, sessionId, true);
        };
        transport.onerror = (error) => {
          console.error('Smart-Thinking: erreur transport SSE', error);
        };

        await server.connect(transport);
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).send('Erreur lors de l\'établissement du flux SSE');
        }
        console.error('Smart-Thinking: échec d\'initialisation SSE', error);
      }
    });

    app.post('/messages', async (req, res) => {
      try {
        const queryParam = req.query.sessionId;
        const sessionId = typeof queryParam === 'string'
          ? queryParam
          : Array.isArray(queryParam)
            ? queryParam.find((value): value is string => typeof value === 'string')
            : undefined;
        if (!sessionId) {
          res.status(400).send('Paramètre sessionId manquant');
          return;
        }
        const state = sessions.get(sessionId);
        if (!state || state.type !== 'sse') {
          res.status(404).send('Session SSE introuvable');
          return;
        }
        await (state.transport as SSEServerTransport).handlePostMessage(req, res, req.body);
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).send('Erreur traitement message SSE');
        }
        console.error('Smart-Thinking: erreur sur /messages', error);
      }
    });
  } else {
    app.get('/sse', (_req, res) => {
      res.status(404).send('Transport SSE désactivé');
    });
    app.post('/messages', (_req, res) => {
      res.status(404).send('Transport SSE désactivé');
    });
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur interne du serveur MCP' });
    }
    console.error('Smart-Thinking: middleware erreur', error);
  });

  await new Promise<void>((resolve, reject) => {
    const httpServer = app.listen(options.port, options.host, () => {
      console.log(`Smart-Thinking: serveur MCP HTTP lancé sur http://${options.host}:${options.port}`);
      if (options.enableStream) {
        console.log('  • Endpoint streamable HTTP : /mcp');
      }
      if (options.enableSse) {
        console.log('  • Endpoint SSE (legacy)    : /sse + /messages');
      }
    });

    httpServer.on('error', reject);

    const shutdown = async () => {
      console.log('Smart-Thinking: arrêt du serveur HTTP en cours...');
      for (const [sessionId] of sessions) {
        await cleanupSession(sessions, sessionId);
      }
      await new Promise<void>((resolveClose) => {
        httpServer.close(() => resolveClose());
      });
      resolve();
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}

function createCorsMiddleware(options: CliOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originHeader = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;
    res.header('Vary', 'Origin');
    if (options.allowOrigins.length > 0) {
      if (originHeader && options.allowOrigins.includes(originHeader)) {
        res.header('Access-Control-Allow-Origin', originHeader);
      }
    } else if (originHeader) {
      res.header('Access-Control-Allow-Origin', originHeader);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Headers', 'Content-Type, MCP-Session-Id');
    res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
}

async function cleanupSession(
  sessions: Map<string, SessionState>,
  sessionId?: string,
  skipTransportClose: boolean = false
): Promise<void> {
  if (!sessionId) {
    return;
  }
  const state = sessions.get(sessionId);
  if (!state) {
    return;
  }
  sessions.delete(sessionId);
  try {
    if (!skipTransportClose) {
      await state.transport.close();
    }
  } catch (error) {
    console.error(`Smart-Thinking: erreur fermeture transport ${sessionId}`, error);
  }
  try {
    await state.serverClose();
  } catch (error) {
    console.error(`Smart-Thinking: erreur fermeture serveur ${sessionId}`, error);
  }
}

function configureStdoutFiltering(): void {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);

  function isValidJSON(str: string): boolean {
    if (typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (!trimmed) return false;
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}')) &&
        !(trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return false;
    }
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  process.stdout.write = function stdoutFilter(chunk: unknown, encoding?: BufferEncoding, cb?: (error?: Error | null) => void) {
    if (typeof chunk === 'string') {
      const trimmed = chunk.trim();
      if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && !isValidJSON(trimmed)) {
        console.error('[ERREUR] JSON invalide détecté:', chunk);
        try {
          const safeMessage = JSON.stringify({
            jsonrpc: '2.0',
            result: {
              content: [{ type: 'text', text: chunk }]
            }
          }) + (PlatformConfig.IS_WINDOWS ? '\n' : '');
          return originalStdoutWrite(safeMessage, encoding, cb);
        } catch (error) {
          console.error('[ERREUR] Impossible de corriger le JSON:', error);
          process.stderr.write(chunk, encoding);
          if (cb) cb();
          return true;
        }
      }

      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        process.stderr.write(chunk, encoding);
        if (cb) cb();
        return true;
      }
    }

    return originalStdoutWrite(chunk as any, encoding, cb);
  } as typeof process.stdout.write;
}

async function ensureDataDirExists(): Promise<void> {
  const dataDir = PathUtils.getDataDirectory();
  try {
    await fs.mkdir(dataDir, { recursive: true });
    if (PlatformConfig.IS_WINDOWS) {
      try {
        await fs.access(dataDir, fsConstants.W_OK);
      } catch {
        console.warn('Smart-Thinking: permissions limitées sur le répertoire data, utilisation possible d\'un fallback.');
      }
    }
  } catch {
    if (PlatformConfig.IS_WINDOWS) {
      const altDataDir = path.join(process.env.USERPROFILE || '', 'Documents', 'Smart-Thinking', 'data');
      try {
        await fs.mkdir(altDataDir, { recursive: true });
      } catch {
        // Ignorer l'erreur, le gestionnaire de mémoire basculera en mémoire vive uniquement
      }
    }
  }
}
