import { MemoryItem } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { EmbeddingService } from './embedding-service';

/**
 * Classe qui gère la mémoire persistante des sessions précédentes
 */
export class MemoryManager {
  private memories: Map<string, MemoryItem> = new Map();
  private knowledgeBase: Map<string, any> = new Map();
  private embeddingService?: EmbeddingService;
  
  // Chemins pour les fichiers de persistance
  private dataDir = path.join(process.cwd(), 'data');
  private memoriesDir = path.join(this.dataDir, 'memories');
  private knowledgeFilePath = path.join(this.dataDir, 'knowledge.json');
  
  constructor(embeddingService?: EmbeddingService) {
    this.embeddingService = embeddingService;
    // Charger les mémoires et la base de connaissances depuis le stockage persistant
    this.loadFromStorage();
  }
  
  /**
   * Génère un identifiant unique
   */
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  /**
   * Assure que les répertoires de stockage nécessaires existent
   */
  private async ensureDirectoriesExist(): Promise<void> {
    try {
      // Créer les répertoires data et memories s'ils n'existent pas
      await fs.mkdir(this.memoriesDir, { recursive: true });
      
      console.error('Smart-Thinking: Répertoires de données créés ou confirmés');
    } catch (error) {
      console.error('Smart-Thinking: Erreur lors de la création des répertoires:', error);
      // Ne pas interrompre l'application si la création échoue
    }
  }
  
  /**
   * Charge les mémoires et la base de connaissances depuis le stockage persistant
   */
  private async loadFromStorage(): Promise<void> {
    try {
      // S'assurer que les répertoires existent
      await this.ensureDirectoriesExist();
      
      // Essayer de charger les mémoires depuis le répertoire memories
      const memoriesLoaded = await this.loadMemoriesFromFiles();
      
      // Si aucune mémoire n'a été chargée, utiliser les exemples prédéfinis
      if (!memoriesLoaded) {
        const savedMemories = this.getSavedMemories();
        
        if (savedMemories.length > 0) {
          for (const memory of savedMemories) {
            this.memories.set(memory.id, {
              ...memory,
              timestamp: new Date(memory.timestamp)
            });
          }
        }
      }
      
      // Essayer de charger la base de connaissances depuis le fichier knowledge.json
      const knowledgeLoaded = await this.loadKnowledgeFromFile();
      
      // Si la base de connaissances n'a pas été chargée, utiliser les exemples prédéfinis
      if (!knowledgeLoaded) {
        const savedKnowledge = this.getSavedKnowledge();
        
        if (Object.keys(savedKnowledge).length > 0) {
          for (const [key, value] of Object.entries(savedKnowledge)) {
            this.knowledgeBase.set(key, value);
          }
        }
      }
      
      console.error('Smart-Thinking: Chargement des données terminé');
    } catch (error) {
      console.error('Erreur lors du chargement de la mémoire:', error);
      
      // En cas d'erreur, utiliser les données prédéfinies
      const savedMemories = this.getSavedMemories();
      
      if (savedMemories.length > 0) {
        for (const memory of savedMemories) {
          this.memories.set(memory.id, {
            ...memory,
            timestamp: new Date(memory.timestamp)
          });
        }
      }
      
      const savedKnowledge = this.getSavedKnowledge();
      
      if (Object.keys(savedKnowledge).length > 0) {
        for (const [key, value] of Object.entries(savedKnowledge)) {
          this.knowledgeBase.set(key, value);
        }
      }
    }
  }
  
  /**
   * Charge les mémoires depuis les fichiers dans le répertoire memories
   * @returns true si au moins une mémoire a été chargée, false sinon
   */
  private async loadMemoriesFromFiles(): Promise<boolean> {
    try {
      // Lire la liste des fichiers dans le répertoire memories
      const files = await fs.readdir(this.memoriesDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      if (jsonFiles.length === 0) {
        return false;
      }
      
      let memoryLoaded = false;
      
      // Charger chaque fichier JSON
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.memoriesDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const memoryItems = JSON.parse(content) as MemoryItem[];
          
          // Traiter chaque élément de mémoire dans le fichier
          for (const item of memoryItems) {
            // Convertir la chaîne de date en objet Date
            this.memories.set(item.id, {
              ...item,
              timestamp: new Date(item.timestamp)
            });
            memoryLoaded = true;
          }
        } catch (fileError) {
          console.error(`Erreur lors du chargement du fichier ${file}:`, fileError);
          // Continuer avec le fichier suivant
        }
      }
      
      return memoryLoaded;
    } catch (error) {
      console.error('Erreur lors du chargement des mémoires depuis les fichiers:', error);
      return false;
    }
  }
  
  /**
   * Charge la base de connaissances depuis le fichier knowledge.json
   * @returns true si la base de connaissances a été chargée, false sinon
   */
  private async loadKnowledgeFromFile(): Promise<boolean> {
    try {
      // Vérifier si le fichier knowledge.json existe
      const exists = await fs.stat(this.knowledgeFilePath)
        .then(() => true)
        .catch(() => false);
      
      if (!exists) {
        return false;
      }
      
      // Lire le fichier knowledge.json
      const content = await fs.readFile(this.knowledgeFilePath, 'utf8');
      const knowledge = JSON.parse(content) as Record<string, any>;
      
      // Traiter chaque entrée de la base de connaissances
      for (const [key, value] of Object.entries(knowledge)) {
        this.knowledgeBase.set(key, value);
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors du chargement de la base de connaissances:', error);
      return false;
    }
  }
  
  /**
   * Simule la récupération de mémoires sauvegardées
   * Utilisé comme fallback si aucun fichier n'est disponible
   */
  private getSavedMemories(): MemoryItem[] {
    // Exemple de mémoires préconfigurées pour la démonstration
    return [
      {
        id: 'mem1',
        content: 'La structure en graphe est plus flexible que la structure linéaire pour représenter des pensées complexes.',
        tags: ['structure', 'graphe', 'raisonnement'],
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 jours avant
      },
      {
        id: 'mem2',
        content: 'L\'auto-évaluation régulière du processus de raisonnement améliore sa qualité globale.',
        tags: ['méta-cognition', 'évaluation', 'qualité'],
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 jours avant
      },
      {
        id: 'mem3',
        content: 'Intégrer des outils de recherche dans le processus de raisonnement permet une vérification factuelle en temps réel.',
        tags: ['outils', 'recherche', 'vérification', 'faits'],
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 jour avant
      }
    ];
  }
  
  /**
   * Simule la récupération de connaissances sauvegardées
   * Utilisé comme fallback si aucun fichier n'est disponible
   */
  private getSavedKnowledge(): Record<string, any> {
    // Exemple de connaissances préconfigurées pour la démonstration
    return {
      'raisonnement-efficace': {
        patterns: ['décomposition', 'analyse', 'synthèse', 'méta-cognition'],
        critères: ['clarté', 'cohérence', 'précision', 'profondeur']
      },
      'biais-cognitifs': {
        communs: ['confirmation', 'ancrage', 'disponibilité', 'halo'],
        mitigations: ['diversité de perspectives', 'devil\'s advocate', 'données contraires']
      }
    };
  }
  
  /**
   * Sauvegarde l'état actuel dans le stockage persistant
   */
  private async saveToStorage(): Promise<void> {
    try {
      // S'assurer que les répertoires existent
      await this.ensureDirectoriesExist();
      
      // Préparer les mémoires par session pour la sauvegarde
      const memoriesBySession = new Map<string, MemoryItem[]>();
      
      // Regrouper les mémoires par session
      for (const memory of this.memories.values()) {
        // Déterminer l'ID de session (utiliser 'default' si non spécifié)
        const sessionId = memory.metadata?.sessionId || 'default';
        
        if (!memoriesBySession.has(sessionId)) {
          memoriesBySession.set(sessionId, []);
        }
        
        memoriesBySession.get(sessionId)!.push(memory);
      }
      
      // Sauvegarder chaque groupe de mémoires dans un fichier par session
      for (const [sessionId, memories] of memoriesBySession.entries()) {
        const filePath = path.join(this.memoriesDir, `${sessionId}.json`);
        
        await fs.writeFile(
          filePath,
          JSON.stringify(memories, null, 2),
          'utf8'
        );
      }
      
      // Sauvegarder la base de connaissances
      await fs.writeFile(
        this.knowledgeFilePath,
        JSON.stringify(Object.fromEntries(this.knowledgeBase), null, 2),
        'utf8'
      );
      
      console.error('Smart-Thinking: Données sauvegardées avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la mémoire:', error);
      
      // En cas d'erreur, afficher les données qui auraient dû être sauvegardées (pour débogage)
      console.error('Mémoires qui auraient dû être sauvegardées:', Array.from(this.memories.values()));
      console.error('Base de connaissances qui aurait dû être sauvegardée:', Object.fromEntries(this.knowledgeBase));
    }
  }
  
  /**
   * Ajoute un élément à la mémoire
   * 
   * @param content Le contenu de l'élément de mémoire
   * @param tags Les tags associés
   * @returns L'identifiant de l'élément ajouté
   */
  addMemory(content: string, tags: string[] = []): string {
    const id = this.generateUniqueId();
    
    const memory: MemoryItem = {
      id,
      content,
      tags,
      timestamp: new Date()
    };
    
    this.memories.set(id, memory);
    this.saveToStorage();
    
    return id;
  }
  
  /**
   * Récupère un élément de mémoire par son identifiant
   * 
   * @param id L'identifiant de l'élément
   * @returns L'élément de mémoire ou undefined si non trouvé
   */
  getMemory(id: string): MemoryItem | undefined {
    return this.memories.get(id);
  }
  
  /**
   * Récupère les éléments de mémoire les plus récents
   * 
   * @param limit Le nombre maximum d'éléments à récupérer
   * @returns Un tableau des éléments les plus récents
   */
  getRecentMemories(limit: number = 5): MemoryItem[] {
    return Array.from(this.memories.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  /**
   * Récupère les éléments de mémoire les plus pertinents pour un contexte donné
   * AMÉLIORÉ: Fiabilité améliorée et meilleure gestion des erreurs
   * 
   * @param context Le contexte pour lequel chercher des éléments pertinents
   * @param limit Le nombre maximum d'éléments à récupérer
   * @returns Un tableau des éléments les plus pertinents
   */
  async getRelevantMemories(context: string, limit: number = 3): Promise<MemoryItem[]> {
    const allMemories = Array.from(this.memories.values());
    
    // Vérifier si nous avons des mémoires à traiter
    if (allMemories.length === 0) {
      console.error('Smart-Thinking: Aucune mémoire disponible pour la recherche de pertinence');
      return [];
    }
    
    // Si nous n'avons pas de service d'embeddings, utiliser l'algorithme de base
    if (!this.embeddingService) {
      console.error('Smart-Thinking: Service d\'embeddings non disponible, utilisation de l\'algorithme de mots-clés');
      return this.getRelevantMemoriesWithKeywords(context, limit);
    }
    
    try {
      // Utiliser le service d'embeddings pour trouver les mémoires similaires
      const memoryTexts = allMemories.map(memory => memory.content);
      
      console.error(`Smart-Thinking: Recherche de mémoires pertinentes parmi ${memoryTexts.length} éléments avec embeddings`);
      
      // Utiliser un seuil de similarité plus bas pour augmenter les chances de trouver des correspondances
      const threshold = 0.3; // Seuil de similarité plus bas
      
      const similarResults = await this.embeddingService.findSimilarTexts(context, memoryTexts, limit, threshold);
      
      console.error(`Smart-Thinking: ${similarResults.length} résultats similaires trouvés avec embeddings`);
      
      if (similarResults.length === 0) {
        // Aucun résultat avec embeddings, essayer avec mots-clés
        console.error('Smart-Thinking: Aucun résultat avec embeddings, utilisation des mots-clés');
        return this.getRelevantMemoriesWithKeywords(context, limit);
      }
      
      // Convertir les résultats en mémoires
      const memoryResults: MemoryItem[] = [];
      
      for (const result of similarResults) {
        const matchingMemory = allMemories.find(memory => memory.content === result.text);
        if (matchingMemory) {
          // Créer une copie avec le score de pertinence
          memoryResults.push({
            ...matchingMemory,
            relevanceScore: result.score
          });
          console.error(`Smart-Thinking: Mémoire correspondante trouvée avec score ${result.score.toFixed(2)}`);
        }
      }
      
      return memoryResults;
    } catch (error) {
      console.error('Smart-Thinking: Erreur lors de la recherche de mémoires pertinentes avec embeddings:', error);
      // En cas d'erreur, revenir à l'algorithme basé sur les mots-clés
      return this.getRelevantMemoriesWithKeywords(context, limit);
    }
  }
  
  /**
   * Implémentation de secours basée sur les mots-clés
   * 
   * @param context Le contexte pour lequel chercher des éléments pertinents
   * @param limit Le nombre maximum d'éléments à récupérer
   * @returns Un tableau des éléments les plus pertinents
   */
  private getRelevantMemoriesWithKeywords(context: string, limit: number = 3): MemoryItem[] {
    // Une implémentation simple basée sur la correspondance de mots-clés
    const contextWords = context.toLowerCase().split(/\W+/).filter(word => word.length > 3);
    
    return Array.from(this.memories.values())
      .map(memory => {
        const memoryWords = memory.content.toLowerCase().split(/\W+/).filter(word => word.length > 3);
        const memoryTagWords = memory.tags.join(' ').toLowerCase().split(/\W+/).filter(word => word.length > 3);
        
        // Calculer un score basé sur le contenu et les tags
        const contentMatchingWords = contextWords.filter(word => memoryWords.includes(word));
        const tagMatchingWords = contextWords.filter(word => memoryTagWords.includes(word));
        
        const contentScore = contentMatchingWords.length / Math.max(contextWords.length, 1);
        const tagScore = tagMatchingWords.length / Math.max(contextWords.length, 1);
        
        // Les tags ont un poids plus élevé
        const score = contentScore * 0.7 + tagScore * 1.3;
        
        return {
          memory,
          score,
          relevanceScore: score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => {
        return {
          ...item.memory,
          relevanceScore: item.relevanceScore
        };
      });
  }
  
  /**
   * Récupère les éléments de mémoire par tag
   * 
   * @param tag Le tag à rechercher
   * @param limit Le nombre maximum d'éléments à récupérer
   * @returns Un tableau des éléments correspondant au tag
   */
  getMemoriesByTag(tag: string, limit: number = 10): MemoryItem[] {
    return Array.from(this.memories.values())
      .filter(memory => memory.tags.includes(tag))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  /**
   * Ajoute ou met à jour un élément dans la base de connaissances
   * 
   * @param key La clé de l'élément
   * @param value La valeur de l'élément
   */
  setKnowledge(key: string, value: any): void {
    this.knowledgeBase.set(key, value);
    this.saveToStorage();
  }
  
  /**
   * Récupère un élément de la base de connaissances
   * 
   * @param key La clé de l'élément
   * @returns La valeur de l'élément ou undefined si non trouvé
   */
  getKnowledge(key: string): any {
    return this.knowledgeBase.get(key);
  }
  
  /**
   * Efface toutes les mémoires et connaissances
   */
  clear(): void {
    this.memories.clear();
    this.knowledgeBase.clear();
    this.saveToStorage();
  }
}