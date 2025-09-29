import { MemoryItem } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { SimilarityEngine } from './similarity-engine';
import { PathUtils } from './utils/path-utils';
import {
  prepareMemoryForStorage,
  sanitizeKnowledgeBase,
  sanitizeMemoryItem,
} from './utils/persistence-utils';

// Constante pour contrôler l'affichage des logs de débogage
const DEBUG_MODE = false;

/**
 * Classe qui gère la mémoire persistante des sessions précédentes
 */
export class MemoryManager {
  private memories: Map<string, MemoryItem> = new Map();
  private knowledgeBase: Map<string, any> = new Map();
  private similarityEngine?: SimilarityEngine;
  
  // Chemins pour les fichiers de persistance
  private dataDir: string;
  private memoriesDir: string;
  private knowledgeFilePath: string;
  
  constructor(similarityEngine?: SimilarityEngine) {
    this.similarityEngine = similarityEngine;
    
    // Initialiser les chemins de fichiers - utiliser des chemins absolus
    this.dataDir = PathUtils.getDataDirectory();
    this.memoriesDir = path.join(this.dataDir, 'memories');
    this.knowledgeFilePath = path.join(this.dataDir, 'knowledge.json');
    
    // Log uniquement en mode debug
    this.debugLog(`Chemins de stockage initialisés:
    - dataDir: ${this.dataDir}
    - memoriesDir: ${this.memoriesDir}
    - knowledgeFilePath: ${this.knowledgeFilePath}`);
    
    // Charger les mémoires et la base de connaissances depuis le stockage persistant
    this.loadFromStorage();
  }
  
  /**
   * Fonction de log pour le débogage uniquement
   * @param message Message à logger
   */
  private debugLog(message: string): void {
    if (DEBUG_MODE) {
      console.error(`Smart-Thinking Debug: ${message}`);
    }
  }

  private requestSave(): void {
    this.saveToStorage().catch(error => {
      console.error('Smart-Thinking: Échec de la sauvegarde asynchrone:', error);
    });
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
      // Utiliser PathUtils pour créer les répertoires avec des chemins absolus
      await PathUtils.ensureDirectoryExists(this.dataDir);
      await PathUtils.ensureDirectoryExists(this.memoriesDir);
      
      this.debugLog(`Répertoires de données créés ou confirmés:
      - dataDir: ${this.dataDir}
      - memoriesDir: ${this.memoriesDir}`);
    } catch (error) {
      // Log d'erreur important - garder
      console.error('Smart-Thinking: Erreur lors de la création des répertoires:', error);
      
      // En cas d'échec, utiliser un répertoire temporaire comme fallback
      try {
        const tempDir = PathUtils.getTempDirectory();
        const tempMemoriesDir = path.join(tempDir, 'memories');
        
        // S'assurer que le chemin est absolu
        await fs.mkdir(tempMemoriesDir, { recursive: true, mode: 0o777 });
        
        // Mettre à jour les chemins
        this.dataDir = tempDir;
        this.memoriesDir = tempMemoriesDir;
        this.knowledgeFilePath = path.join(tempDir, 'knowledge.json');
        
        this.debugLog(`Utilisation des répertoires temporaires:
        - dataDir: ${this.dataDir}
        - memoriesDir: ${this.memoriesDir}
        - knowledgeFilePath: ${this.knowledgeFilePath}`);
      } catch (fallbackError) {
        // Log d'erreur important - garder
        console.error('Smart-Thinking: Échec de la création des répertoires temporaires:', fallbackError);
        
        // Si tout échoue, utiliser des objets en mémoire uniquement
        this.debugLog('Fonctionnement en mode mémoire uniquement (sans persistance)');
      }
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
            const sanitizedMemory = sanitizeMemoryItem(memory);
            if (!sanitizedMemory) {
              continue;
            }

            this.memories.set(sanitizedMemory.id, sanitizedMemory);
          }
        }
      }
      
      // Essayer de charger la base de connaissances depuis le fichier knowledge.json
      const knowledgeLoaded = await this.loadKnowledgeFromFile();

      // Si la base de connaissances n'a pas été chargée, utiliser les exemples prédéfinis
      if (!knowledgeLoaded) {
        const savedKnowledge = sanitizeKnowledgeBase(this.getSavedKnowledge());

        if (Object.keys(savedKnowledge).length > 0) {
          for (const [key, value] of Object.entries(savedKnowledge)) {
            this.knowledgeBase.set(key, value);
          }
        }
      }
      
      this.debugLog('Chargement des données terminé');
    } catch (error) {
      // Log d'erreur important - garder
      console.error('Erreur lors du chargement de la mémoire:', error);
      
      // En cas d'erreur, utiliser les données prédéfinies
      const savedMemories = this.getSavedMemories();
      
      if (savedMemories.length > 0) {
        for (const memory of savedMemories) {
          const sanitizedMemory = sanitizeMemoryItem(memory);
          if (!sanitizedMemory) {
            continue;
          }

          this.memories.set(sanitizedMemory.id, sanitizedMemory);
        }
      }

      const savedKnowledge = sanitizeKnowledgeBase(this.getSavedKnowledge());

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
      this.debugLog(`Tentative de lecture du répertoire de mémoires: ${this.memoriesDir}`);
      
      // Vérifie si le répertoire existe
      try {
        await fs.access(this.memoriesDir, fs.constants.R_OK);
      } catch (accessError) {
        this.debugLog(`Répertoire de mémoires inaccessible: ${accessError}`);
        return false;
      }
      
      // Lire la liste des fichiers dans le répertoire memories
      const files = await fs.readdir(this.memoriesDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      this.debugLog(`${jsonFiles.length} fichiers JSON trouvés dans le répertoire de mémoires`);
      
      if (jsonFiles.length === 0) {
        return false;
      }
      
      let memoryLoaded = false;
      
      // Charger chaque fichier JSON
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.memoriesDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const parsedContent = JSON.parse(content);
          const memoryItems = Array.isArray(parsedContent) ? parsedContent : [];

          for (const rawItem of memoryItems) {
            const sanitizedItem = sanitizeMemoryItem(rawItem);
            if (!sanitizedItem) {
              continue;
            }

            this.memories.set(sanitizedItem.id, sanitizedItem);
            memoryLoaded = true;
          }
        } catch (fileError) {
          // Log d'erreur important - garder
          console.error(`Erreur lors du chargement du fichier ${file}:`, fileError);
          // Continuer avec le fichier suivant
        }
      }
      
      return memoryLoaded;
    } catch (error) {
      // Log d'erreur important - garder
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
      const knowledge = sanitizeKnowledgeBase(JSON.parse(content));

      // Traiter chaque entrée de la base de connaissances
      for (const [key, value] of Object.entries(knowledge)) {
        this.knowledgeBase.set(key, value);
      }
      
      return true;
    } catch (error) {
      // Log d'erreur important - garder
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
      const memoriesBySession = new Map<string, ReturnType<typeof prepareMemoryForStorage>[]>();
      
      // Regrouper les mémoires par session
      for (const memory of this.memories.values()) {
        // Déterminer l'ID de session (utiliser 'default' si non spécifié)
        const sessionId = memory.metadata?.sessionId || 'default';
        
        if (!memoriesBySession.has(sessionId)) {
          memoriesBySession.set(sessionId, []);
        }

        memoriesBySession.get(sessionId)!.push(prepareMemoryForStorage(memory));
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
      const knowledgePayload = sanitizeKnowledgeBase(Object.fromEntries(this.knowledgeBase));

      await fs.writeFile(
        this.knowledgeFilePath,
        JSON.stringify(knowledgePayload, null, 2),
        'utf8'
      );
      
      this.debugLog('Données sauvegardées avec succès');
    } catch (error) {
      // Log d'erreur important - garder
      console.error('Erreur lors de la sauvegarde de la mémoire:', error);
      
      // En cas d'erreur, afficher les données qui auraient dû être sauvegardées (pour débogage)
      this.debugLog('Mémoires qui auraient dû être sauvegardées: ' + this.memories.size + ' éléments');
      this.debugLog('Base de connaissances qui aurait dû être sauvegardée: ' + this.knowledgeBase.size + ' éléments');
    }
  }
  
  /**
   * Ajoute un élément à la mémoire
   * 
   * @param content Le contenu de l'élément de mémoire
   * @param tags Les tags associés
   * @param sessionId L'identifiant de session facultatif
   * @returns L'identifiant de l'élément ajouté
   */
  addMemory(content: string, tags: string[] = [], sessionId?: string): string {
    const id = this.generateUniqueId();
    
    const memory: MemoryItem = {
      id,
      content,
      tags,
      timestamp: new Date(),
      metadata: { // Store sessionId in metadata
        sessionId: sessionId || 'default' // Use 'default' if no session ID provided
      }
    };
    
    this.memories.set(id, memory);
    this.requestSave();
    
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
   * @param sessionId L'identifiant de session facultatif pour filtrer
   * @returns Un tableau des éléments les plus récents (filtrés par session)
   */
  getRecentMemories(limit: number = 5, sessionId?: string): MemoryItem[] {
    const allMemories = Array.from(this.memories.values());
    const filteredMemories = sessionId
      ? allMemories.filter(m => m.metadata?.sessionId === sessionId)
      : allMemories.filter(m => !m.metadata?.sessionId || m.metadata?.sessionId === 'default'); // Include default session if no ID specified

    return filteredMemories
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  /**
   * Récupère les éléments de mémoire les plus pertinents pour un contexte donné
   * AMÉLIORÉ: Fiabilité améliorée et meilleure gestion des erreurs
   * 
   * @param context Le contexte pour lequel chercher des éléments pertinents
   * @param limit Le nombre maximum d'éléments à récupérer
   * @param sessionId L'identifiant de session facultatif pour filtrer
   * @returns Un tableau des éléments les plus pertinents (filtrés par session)
   */
  async getRelevantMemories(context: string, limit: number = 3, sessionId?: string): Promise<MemoryItem[]> {
    // Filter memories by session first
    const allMemories = Array.from(this.memories.values());
    const sessionMemories = sessionId
      ? allMemories.filter(m => m.metadata?.sessionId === sessionId)
      : allMemories.filter(m => !m.metadata?.sessionId || m.metadata?.sessionId === 'default'); // Include default session if no ID specified

    // Vérifier si nous avons des mémoires à traiter dans cette session
    if (sessionMemories.length === 0) {
      this.debugLog('Aucune mémoire disponible pour la recherche de pertinence');
      return [];
    }
    // Si nous n'avons pas de SimilarityEngine, utiliser l'algorithme de base sur les mémoires de la session
    if (!this.similarityEngine) {
      this.debugLog('SimilarityEngine non disponible, utilisation de l\'algorithme de mots-clés pour la session');
      return this.getRelevantMemoriesWithKeywords(context, limit, sessionId);
    }

    try {
      // Utiliser SimilarityEngine pour trouver les mémoires similaires DANS LA SESSION
      const memoryTexts = sessionMemories.map(memory => memory.content);
      
      this.debugLog(`Recherche de mémoires pertinentes parmi ${memoryTexts.length} éléments avec SimilarityEngine`);
      
      // Utiliser un seuil de similarité plus bas pour augmenter les chances de trouver des correspondances
      const threshold = 0.3; // Seuil de similarité plus bas
      
      const similarResults = await this.similarityEngine.findSimilarTexts(context, memoryTexts, limit, threshold);
      
      this.debugLog(`${similarResults.length} résultats similaires trouvés avec SimilarityEngine`);
      if (similarResults.length === 0) {
        // Aucun résultat via SimilarityEngine dans la session, essayer avec mots-clés pour la session
        this.debugLog('Aucun résultat trouvé par SimilarityEngine pour la session, utilisation des mots-clés pour la session');
        return this.getRelevantMemoriesWithKeywords(context, limit, sessionId);
      }

      // Convertir les résultats en mémoires (en s'assurant qu'ils proviennent de la session)
      const memoryResults: MemoryItem[] = [];

      for (const result of similarResults) {
        // Find the matching memory within the session memories
        const matchingMemory = sessionMemories.find(memory => memory.content === result.text);
        if (matchingMemory) {
          // Créer une copie avec le score de pertinence
          memoryResults.push({
            ...matchingMemory,
            relevanceScore: result.score
          });
          this.debugLog(`Mémoire correspondante trouvée avec score ${result.score.toFixed(2)}`);
        }
      }
      
      return memoryResults;
    } catch (error) {
      // Log d'erreur important - garder
      console.error('Smart-Thinking: Erreur lors de la recherche de mémoires pertinentes avec SimilarityEngine:', error);
      // En cas d'erreur, revenir à l'algorithme basé sur les mots-clés pour la session
      return this.getRelevantMemoriesWithKeywords(context, limit, sessionId);
    }
  }
  
  /**
   * Implémentation de secours basée sur les mots-clés
   * 
   * @param context Le contexte pour lequel chercher des éléments pertinents
   * @param limit Le nombre maximum d'éléments à récupérer
   * @param sessionId L'identifiant de session facultatif pour filtrer
   * @returns Un tableau des éléments les plus pertinents (filtrés par session)
   */
  private getRelevantMemoriesWithKeywords(context: string, limit: number = 3, sessionId?: string): MemoryItem[] {
    // Filter memories by session first
    const allMemories = Array.from(this.memories.values());
    const sessionMemories = sessionId
      ? allMemories.filter(m => m.metadata?.sessionId === sessionId)
      : allMemories.filter(m => !m.metadata?.sessionId || m.metadata?.sessionId === 'default');

    if (sessionMemories.length === 0) return [];

    // Une implémentation simple basée sur la correspondance de mots-clés DANS LA SESSION
    const contextWords = context.toLowerCase().split(/\W+/).filter(word => word.length > 3);

    return sessionMemories
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
   * @param sessionId L'identifiant de session facultatif pour filtrer
   * @returns Un tableau des éléments correspondant au tag (filtrés par session)
   */
  getMemoriesByTag(tag: string, limit: number = 10, sessionId?: string): MemoryItem[] {
    const allMemories = Array.from(this.memories.values());
    const filteredMemories = sessionId
      ? allMemories.filter(m => m.metadata?.sessionId === sessionId && m.tags.includes(tag))
      : allMemories.filter(m => (!m.metadata?.sessionId || m.metadata?.sessionId === 'default') && m.tags.includes(tag));

    return filteredMemories
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
    const sanitizedRecord = sanitizeKnowledgeBase({ [key]: value });

    if (Object.prototype.hasOwnProperty.call(sanitizedRecord, key)) {
      this.knowledgeBase.set(key, sanitizedRecord[key]);
    } else {
      this.knowledgeBase.delete(key);
    }
    this.requestSave();
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
    this.requestSave();
  }

  /**
   * Sauvegarde l'état complet d'un graphe de session dans un fichier dédié.
   * @param sessionId L'identifiant de la session.
   * @param graphStateJson La représentation JSON de l'état du graphe.
   */
  async saveGraphState(sessionId: string, graphStateJson: string): Promise<void> {
    try {
      await this.ensureDirectoriesExist(); // Assure que le répertoire data existe
      const filePath = path.join(this.dataDir, `graph_state_${sessionId}.json`);
      await fs.writeFile(filePath, graphStateJson, 'utf8');
      this.debugLog(`État du graphe pour la session ${sessionId} sauvegardé dans ${filePath}`);
    } catch (error) {
      console.error(`Smart-Thinking: Erreur lors de la sauvegarde de l'état du graphe pour la session ${sessionId}:`, error);
      // Ne pas bloquer l'exécution principale si la sauvegarde échoue, mais logger l'erreur.
    }
  }

  /**
   * Charge l'état complet d'un graphe de session depuis son fichier dédié.
   * @param sessionId L'identifiant de la session.
   * @returns Le JSON de l'état du graphe ou null si non trouvé ou en cas d'erreur.
   */
  async loadGraphState(sessionId: string): Promise<string | null> {
    try {
      await this.ensureDirectoriesExist(); // Assure que le répertoire data existe
      const filePath = path.join(this.dataDir, `graph_state_${sessionId}.json`);
      
      // Vérifier si le fichier existe avant de tenter de le lire
      try {
        await fs.access(filePath, fs.constants.R_OK);
      } catch (accessError) {
        this.debugLog(`Aucun état de graphe sauvegardé trouvé pour la session ${sessionId} à ${filePath}`);
        return null; // Fichier non trouvé ou inaccessible
      }

      const graphStateJson = await fs.readFile(filePath, 'utf8');
      this.debugLog(`État du graphe pour la session ${sessionId} chargé depuis ${filePath}`);
      return graphStateJson;
    } catch (error) {
      console.error(`Smart-Thinking: Erreur lors du chargement de l'état du graphe pour la session ${sessionId}:`, error);
      return null; // Retourner null en cas d'erreur de lecture ou de parsing
    }
  }
}
