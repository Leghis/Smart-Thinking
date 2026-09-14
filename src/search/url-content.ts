import { ProviderError, ValidationError } from '../errors';
import { LIMITS } from '../constants';
import type { UrlContent } from '../types';

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /\.local$/i,
  /^metadata\.google\.internal$/i,
];

const TEXT_CONTENT_TYPES = [
  'text/',
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/xhtml+xml',
];

export interface FetchUrlOptions {
  maxChars?: number;
  timeoutMs?: number;
  allowPrivateHosts?: boolean;
}

export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return PRIVATE_HOST_PATTERNS.some(pattern => pattern.test(host));
  } catch {
    return true;
  }
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ValidationError('URL vide.');
  }
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch && !/^https?$/i.test(schemeMatch[1])) {
    throw new ValidationError(`Protocole non supporté: ${schemeMatch[1]}`);
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new ValidationError(`URL invalide: ${raw}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError(`Protocole non supporté: ${parsed.protocol}`);
  }
  return parsed.toString();
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractHtmlTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) {
    return undefined;
  }
  const title = htmlToText(match[1]);
  return title || undefined;
}

export async function fetchUrlContent(rawUrl: string, options: FetchUrlOptions = {}): Promise<UrlContent> {
  const url = normalizeUrl(rawUrl);
  if (!options.allowPrivateHosts && isPrivateUrl(url)) {
    throw new ValidationError('Les adresses locales ou privées sont bloquées (SSRF protection).', { url });
  }

  const maxChars = options.maxChars ?? LIMITS.MAX_FETCH_CHARS;
  const timeoutMs = options.timeoutMs ?? LIMITS.WEB_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Smart-Thinking/13 (+https://github.com/Leghis/Smart-Thinking)',
        Accept: 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.5',
      },
    });

    if (!response.ok) {
      throw new ProviderError(`Le serveur distant a répondu ${response.status}.`, { url, status: response.status });
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (contentType && !TEXT_CONTENT_TYPES.some(type => contentType.includes(type))) {
      throw new ProviderError(`Type de contenu non supporté: ${contentType}.`, { url });
    }

    const raw = await response.text();
    const decoded = contentType.includes('html') ? htmlToText(raw) : raw.trim();
    const truncated = decoded.length > maxChars;
    const text = truncated ? decoded.slice(0, maxChars) : decoded;

    return {
      url,
      title: contentType.includes('html') ? extractHtmlTitle(raw) : undefined,
      text,
      truncated,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof ProviderError || error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProviderError(`Le contenu de ${url} n'a pas été reçu dans les ${timeoutMs}ms.`, { url }, true);
    }
    throw new ProviderError(
      `Impossible de récupérer ${url}: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      { url },
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}
