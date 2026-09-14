import { CACHE_TTL_MS, LIMITS, STOP_WORDS } from './constants';

export type TermVector = Record<string, number>;

interface TokenCacheEntry {
  tokens: string[];
  timestamp: number;
}

const EXTRA_STOP_WORDS: readonly string[] = [
  'the', 'and', 'for', 'that', 'this', 'from', 'with', 'not', 'nor', 'or', 'will', 'shall',
  'would', 'should', 'could', 'can', 'cannot', 'have', 'has', 'had', 'their', 'there', 'here',
  'very', 'she', 'him', 'her', 'his', 'hers', 'its',
];

export class SimilarityEngine {
  private readonly stopWords: Set<string>;
  private readonly tokenCache: Map<string, TokenCacheEntry> = new Map();
  private readonly cacheExpiration = CACHE_TTL_MS.TOKEN;

  constructor() {
    this.stopWords = new Set<string>([...STOP_WORDS, ...EXTRA_STOP_WORDS]);
  }

  private normalize(text: string): string {
    const decomposed = text.normalize('NFKD');
    return decomposed.replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private tokenize(text: string): string[] {
    const cached = this.tokenCache.get(text);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiration) {
      this.tokenCache.delete(text);
      this.tokenCache.set(text, cached);
      return cached.tokens;
    }

    const normalized = this.normalize(text);
    const rawTokens = normalized.split(/[\W_]+/u).filter(Boolean);
    const tokens = rawTokens
      .filter(token => token.length > 2 && !this.stopWords.has(token))
      .map(token => token.trim());

    this.storeInCache(text, { tokens, timestamp: Date.now() });
    return tokens;
  }

  // LRU: re-inserting keeps the most recently used keys at the tail and evicts the head.
  private storeInCache(key: string, entry: TokenCacheEntry): void {
    this.tokenCache.delete(key);
    this.tokenCache.set(key, entry);

    while (this.tokenCache.size > LIMITS.MAX_TOKEN_CACHE_ENTRIES) {
      const oldest = this.tokenCache.keys().next();
      if (oldest.done) {
        break;
      }
      this.tokenCache.delete(oldest.value);
    }
  }

  private computeTermFrequency(tokens: string[]): TermVector {
    const tf: TermVector = {};
    if (tokens.length === 0) {
      return tf;
    }

    for (const token of tokens) {
      tf[token] = (tf[token] || 0) + 1;
    }

    const invLength = 1 / tokens.length;
    for (const token of Object.keys(tf)) {
      tf[token] = tf[token] * invLength;
    }

    return tf;
  }

  private computeInverseDocumentFrequency(tokensList: string[][]): TermVector {
    const idf: TermVector = {};
    const documentFrequency: Record<string, number> = {};
    const totalDocs = tokensList.length || 1;

    for (const tokens of tokensList) {
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        documentFrequency[token] = (documentFrequency[token] || 0) + 1;
      }
    }

    for (const token of Object.keys(documentFrequency)) {
      const df = documentFrequency[token];
      idf[token] = Math.log((totalDocs + 1) / (df + 1)) + 1;
    }

    return idf;
  }

  private buildVector(tf: TermVector, idf: TermVector): TermVector {
    const vector: TermVector = {};
    for (const term of Object.keys(tf)) {
      const weight = tf[term] * (idf[term] ?? 0);
      if (weight > 0) {
        vector[term] = weight;
      }
    }
    return vector;
  }

  private buildVectorsFromTokens(tokensList: string[][]): TermVector[] {
    if (tokensList.length === 0) {
      return [];
    }
    const idf = this.computeInverseDocumentFrequency(tokensList);
    return tokensList.map(tokens => this.buildVector(this.computeTermFrequency(tokens), idf));
  }

  private computeNorm(vector: TermVector): number {
    let sum = 0;
    for (const value of Object.values(vector)) {
      sum += value * value;
    }
    return Math.sqrt(sum);
  }

  private cosineFromDot(dotProduct: number, normA: number, normB: number): number {
    if (normA === 0 || normB === 0) {
      return 0;
    }
    return Math.max(0, Math.min(1, dotProduct / (normA * normB)));
  }

  private dotProduct(vectorA: TermVector, vectorB: TermVector): number {
    const keysA = Object.keys(vectorA);
    const keysB = Object.keys(vectorB);
    const smaller = keysA.length <= keysB.length ? vectorA : vectorB;
    const larger = smaller === vectorA ? vectorB : vectorA;

    let dot = 0;
    for (const key of Object.keys(smaller)) {
      const valueA = smaller[key];
      const valueB = larger[key];
      if (valueA !== undefined && valueB !== undefined) {
        dot += valueA * valueB;
      }
    }
    return dot;
  }

  public calculateCosineSimilarity(vectorA: TermVector, vectorB: TermVector): number {
    const dot = this.dotProduct(vectorA, vectorB);
    return this.cosineFromDot(dot, this.computeNorm(vectorA), this.computeNorm(vectorB));
  }

  // IDF is computed per batch of texts, so vectors only depend on the inputs of the current call.
  public async generateVectors(texts: string[]): Promise<TermVector[]> {
    const tokensList = texts.map(text => this.tokenize(text));
    return this.buildVectorsFromTokens(tokensList);
  }

  public async findSimilarTexts(
    referenceText: string,
    candidateTexts: string[],
    limit: number = 5,
    threshold: number = 0.3
  ): Promise<Array<{ text: string; score: number }>> {
    if (candidateTexts.length === 0 || limit <= 0) {
      return [];
    }

    const vectors = await this.generateVectors([referenceText, ...candidateTexts]);
    const referenceVector = vectors[0] ?? {};
    const referenceNorm = this.computeNorm(referenceVector);

    if (referenceNorm === 0) {
      return [];
    }

    const results: Array<{ text: string; score: number }> = [];
    for (let i = 0; i < candidateTexts.length; i++) {
      const candidateVector = vectors[i + 1] ?? {};
      const candidateNorm = this.computeNorm(candidateVector);
      const dot = candidateNorm === 0 ? 0 : this.dotProduct(referenceVector, candidateVector);
      results.push({
        text: candidateTexts[i],
        score: this.cosineFromDot(dot, referenceNorm, candidateNorm),
      });
    }

    return results
      .filter(result => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  public async calculateTextSimilarity(textA: string, textB: string): Promise<number> {
    const results = await this.findSimilarTexts(textA, [textB], 1, 0);
    return results.length > 0 ? results[0].score : 0;
  }
}
