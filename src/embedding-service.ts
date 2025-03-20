import { CohereClient } from 'cohere-ai';

/**
 * Service qui gère les embeddings vectoriels avec l'API Cohere
 */
export class EmbeddingService {
  private client: CohereClient;
  private cache: Map<string, number[]> = new Map();
  
  constructor(apiKey: string) {
    this.client = new CohereClient({
      token: apiKey,
    });
  }
  
  /**
   * Génère un embedding pour un texte donné
   * 
   * @param text Le texte pour lequel générer un embedding
   * @returns Un vecteur d'embedding
   */
  async getEmbedding(text: string): Promise<number[]> {
    // Vérifier si l'embedding est déjà en cache
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }
    
    try {
      const response = await this.client.embed({
        texts: [text],
        model: 'embed-multilingual-v3.0', // Utilisation du modèle multilingual pour supporter le français
        inputType: 'search_document',
      });
      
      // Type guard pour vérifier si embeddings est un tableau de tableaux
      const embedding = Array.isArray(response.embeddings) && 
        Array.isArray(response.embeddings[0]) ? 
        response.embeddings[0] : 
        (response.embeddings as any)[0];
      
      // Mettre en cache pour utilisation future
      this.cache.set(text, embedding);
      
      return embedding;
    } catch (error) {
      console.error('Erreur lors de la génération de l\'embedding:', error);
      
      // En cas d'erreur, retourner un vecteur vide
      return [];
    }
  }
  
  /**
   * Génère des embeddings pour plusieurs textes
   * 
   * @param texts Les textes pour lesquels générer des embeddings
   * @returns Un tableau de vecteurs d'embedding
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    // Filtrer les textes déjà en cache
    const textsToBatch = texts.filter(text => !this.cache.has(text));
    
    if (textsToBatch.length === 0) {
      // Tous les textes sont en cache
      return texts.map(text => this.cache.get(text)!);
    }
    
    try {
      const response = await this.client.embed({
        texts: textsToBatch,
        model: 'embed-multilingual-v3.0',
        inputType: 'search_document',
      });
      
      // Type guard pour gérer les différents formats de réponse possibles
      const embeddings = response.embeddings;
      
      // Mettre en cache les nouveaux embeddings
      textsToBatch.forEach((text, index) => {
        // Vérifie si embeddings est un tableau de tableaux ou un autre type
        const embedding = Array.isArray(embeddings) && 
          Array.isArray(embeddings[index]) ? 
          embeddings[index] : 
          (embeddings as any)[index];
        this.cache.set(text, embedding);
      });
      
      // Retourner tous les embeddings dans l'ordre des textes originaux
      return texts.map(text => this.cache.get(text)!);
    } catch (error) {
      console.error('Erreur lors de la génération des embeddings:', error);
      
      // En cas d'erreur, retourner des vecteurs vides
      return texts.map(() => []);
    }
  }
  
  /**
   * Calcule la similarité cosinus entre deux vecteurs
   * 
   * @param vecA Premier vecteur
   * @param vecB Second vecteur
   * @returns Score de similarité entre 0 et 1
   */
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
      return 0;
    }
    
    // Calcul du produit scalaire
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    
    // Calcul des normes
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    // Éviter la division par zéro
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    // Similarité cosinus
    return dotProduct / (normA * normB);
  }
  
  /**
   * Trouve les textes les plus similaires à un texte de référence
   * 
   * @param referenceText Texte de référence
   * @param candidateTexts Textes candidats
   * @param limit Nombre maximum de résultats
   * @returns Les textes les plus similaires avec leurs scores
   */
  async findSimilarTexts(
    referenceText: string,
    candidateTexts: string[],
    limit: number = 5
  ): Promise<Array<{ text: string; score: number }>> {
    if (candidateTexts.length === 0) {
      return [];
    }
    
    // Générer l'embedding pour le texte de référence
    const referenceEmbedding = await this.getEmbedding(referenceText);
    
    if (referenceEmbedding.length === 0) {
      return [];
    }
    
    // Générer les embeddings pour tous les textes candidats
    const candidateEmbeddings = await this.getEmbeddings(candidateTexts);
    
    // Calculer les scores de similarité
    const similarities = candidateEmbeddings.map((embedding, index) => ({
      text: candidateTexts[index],
      score: this.calculateCosineSimilarity(referenceEmbedding, embedding)
    }));
    
    // Trier par score de similarité décroissant et limiter les résultats
    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  /**
   * Efface le cache d'embeddings
   */
  clearCache(): void {
    this.cache.clear();
  }
}