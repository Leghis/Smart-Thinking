export type TermVector = Record<string, number>;

interface TokenCacheEntry {
  tokens: string[];
  timestamp: number;
}

export class SimilarityEngine {
  private readonly stopWords: Set<string>;
  private readonly tokenCache: Map<string, TokenCacheEntry> = new Map();
  private readonly cacheExpiration = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.stopWords = new Set([
      'the', 'and', 'for', 'avec', 'dans', 'that', 'this', 'from', 'pour', 'avec', 'les', 'des', 'une', 'un',
      'qui', 'que', 'quoi', 'dont', 'mais', 'car', 'donc', 'or', 'nor', 'not', 'pas', 'sur', 'sous', 'par',
      'est', 'sont', 'été', 'être', 'will', 'shall', 'would', 'should', 'could', 'can', 'cannot', 'ne', 'la',
      'le', 'de', 'du', 'au', 'aux', 'their', 'there', 'here', 'very', 'have', 'has', 'had', 'avoir', 'avais',
      'avait', 'été', 'tout', 'tous', 'vous', 'nous', 'ils', 'elles', 'she', 'him', 'her', 'his', 'hers', 'its'
    ]);
  }

  private normalize(text: string): string {
    const decomposed = text.normalize('NFKD');
    return decomposed.replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private tokenize(text: string): string[] {
    const cached = this.tokenCache.get(text);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiration) {
      return cached.tokens;
    }

    const normalized = this.normalize(text);
    const rawTokens = normalized.split(/[\W_]+/u).filter(Boolean);
    const tokens = rawTokens
      .filter(token => token.length > 2 && !this.stopWords.has(token))
      .map(token => token.trim());

    this.tokenCache.set(text, { tokens, timestamp: Date.now() });
    return tokens;
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
      // Smooth the IDF to avoid division by zero and negative values
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

  public calculateCosineSimilarity(vectorA: TermVector, vectorB: TermVector): number {
    const keysA = Object.keys(vectorA);
    const keysB = Object.keys(vectorB);
    if (keysA.length === 0 || keysB.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    const shorterKeys = keysA.length < keysB.length ? keysA : keysB;
    for (const key of shorterKeys) {
      const valueA = vectorA[key];
      const valueB = vectorB[key];
      if (valueA !== undefined && valueB !== undefined) {
        dotProduct += valueA * valueB;
      }
    }

    for (const key of Object.keys(vectorA)) {
      const value = vectorA[key];
      if (value !== undefined) {
        normA += value * value;
      }
    }

    for (const key of Object.keys(vectorB)) {
      const value = vectorB[key];
      if (value !== undefined) {
        normB += value * value;
      }
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, similarity));
  }

  public async generateVectors(texts: string[]): Promise<TermVector[]> {
    const tokensList = texts.map(text => this.tokenize(text));
    return this.buildVectorsFromTokens(tokensList);
  }

  public async getVector(text: string, corpus: string[] = []): Promise<TermVector> {
    const tokensList = [text, ...corpus].map(item => this.tokenize(item));
    const vectors = this.buildVectorsFromTokens(tokensList);
    return vectors[0] ?? {};
  }

  public async findSimilarTexts(
    referenceText: string,
    candidateTexts: string[],
    limit: number = 5,
    threshold: number = 0.3
  ): Promise<Array<{ text: string; score: number }>> {
    if (candidateTexts.length === 0) {
      return [];
    }

    const allTexts = [referenceText, ...candidateTexts];
    const vectors = await this.generateVectors(allTexts);
    if (vectors.length === 0) {
      return [];
    }

    const referenceVector = vectors[0];
    const results: Array<{ text: string; score: number }> = [];

    for (let i = 0; i < candidateTexts.length; i++) {
      const candidateVector = vectors[i + 1] ?? {};
      const similarity = this.calculateCosineSimilarity(referenceVector, candidateVector);
      results.push({ text: candidateTexts[i], score: similarity });
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
