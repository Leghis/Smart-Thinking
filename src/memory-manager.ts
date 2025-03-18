import { MemoryItem } from './types';

/**
 * Classe qui gère la mémoire persistante des sessions précédentes
 */
export class MemoryManager {
  private memories: Map<string, MemoryItem> = new Map();
  private knowledgeBase: Map<string, any> = new Map();
  
  constructor() {
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
   * Charge les mémoires et la base de connaissances depuis le stockage persistant
   * Dans une implémentation réelle, cela pourrait être un fichier, une base de données, etc.
   */
  private loadFromStorage(): void {
    try {
      // Simuler le chargement depuis un stockage
      // Dans une implémentation réelle, remplacer par une lecture de fichier/DB
      const savedMemories = this.getSavedMemories();
      
      if (savedMemories.length > 0) {
        for (const memory of savedMemories) {
          this.memories.set(memory.id, {
            ...memory,
            timestamp: new Date(memory.timestamp)
          });
        }
      }
      
      // Charger la base de connaissances
      const savedKnowledge = this.getSavedKnowledge();
      
      if (Object.keys(savedKnowledge).length > 0) {
        for (const [key, value] of Object.entries(savedKnowledge)) {
          this.knowledgeBase.set(key, value);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la mémoire:', error);
    }
  }
  
  /**
   * Simule la récupération de mémoires sauvegardées
   * Dans une implémentation réelle, remplacer par une lecture de fichier/DB
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
   * Dans une implémentation réelle, remplacer par une lecture de fichier/DB
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
   * Dans une implémentation réelle, cela pourrait être un fichier, une base de données, etc.
   */
  private saveToStorage(): void {
    try {
      // Simuler la sauvegarde dans un stockage
      // Dans une implémentation réelle, remplacer par une écriture de fichier/DB
      console.log('Mémoires sauvegardées:', Array.from(this.memories.values()));
      console.log('Base de connaissances sauvegardée:', Object.fromEntries(this.knowledgeBase));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la mémoire:', error);
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
   * 
   * @param context Le contexte pour lequel chercher des éléments pertinents
   * @param limit Le nombre maximum d'éléments à récupérer
   * @returns Un tableau des éléments les plus pertinents
   */
  getRelevantMemories(context: string, limit: number = 3): MemoryItem[] {
    // Une implémentation simple basée sur la correspondance de mots-clés
    // Dans une version plus avancée, utiliser NLP ou des embeddings
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