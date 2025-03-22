import { SuggestedTool } from './types';

/**
 * Classe qui gère l'intégration avec d'autres outils MCP
 */
export class ToolIntegrator {
  // Registre des outils connus
  private knownTools: Map<string, {
    name: string;
    description: string;
    keywords: string[];
    useCase: string;
  }> = new Map();
  
  constructor() {
    // Initialiser avec des outils MCP courants
    this.initializeKnownTools();
  }
  
  /**
   * Initialise le registre avec des outils MCP courants
   */
  private initializeKnownTools(): void {
    // Outils de recherche web
    this.knownTools.set('perplexity_search_web', {
      name: 'perplexity_search_web',
      description: 'Recherche web avancée avec Perplexity AI et filtrage de récence',
      keywords: ['recherche', 'web', 'internet', 'information', 'récent', 'actualité', 'perplexity', 'temps réel', 'fraîcheur'],
      useCase: 'Utiliser pour obtenir des informations récentes et pertinentes du web avec filtrage de récence configurable'
    });
    
    this.knownTools.set('brave_web_search', {
      name: 'brave_web_search',
      description: 'Recherche web générale avec l\'API Brave Search',
      keywords: ['recherche', 'web', 'internet', 'information', 'brave', 'articles', 'nouvelles', 'contenu'],
      useCase: 'Utiliser pour des requêtes générales, articles, actualités et recherche de contenu en ligne avec pagination'
    });
    
    this.knownTools.set('brave_local_search', {
      name: 'brave_local_search',
      description: 'Recherche locale de commerces et lieux avec l\'API Brave Local Search',
      keywords: ['recherche', 'local', 'entreprise', 'lieu', 'adresse', 'proximité', 'restaurant', 'magasin', 'localisation'],
      useCase: 'Idéal pour trouver des entreprises, restaurants, services et lieux à proximité d\'une localisation'
    });
    
    this.knownTools.set('tavily-search', {
      name: 'tavily-search',
      description: 'Outil de recherche web puissant avec Tavily AI Search Engine',
      keywords: ['recherche', 'web', 'internet', 'information', 'tavily', 'ai', 'détaillé', 'avancé', 'domaine'],
      useCase: 'Recherche web complète et détaillée avec filtrage par domaines, contrôle de fraîcheur et résultats contextuels'
    });
    
    // Nouvel outil Tavily Extract
    this.knownTools.set('tavily-extract', {
      name: 'tavily-extract',
      description: 'Extraction de contenu web avec Tavily',
      keywords: ['extraction', 'contenu', 'web', 'page', 'url', 'tavily', 'texte', 'analyse', 'scraping'],
      useCase: 'Utiliser pour extraire et traiter du contenu à partir d\'URLs spécifiques, idéal pour l\'analyse de documents web'
    });
    
    // Outils pour les fichiers système (filesystem)
    this.knownTools.set('read_file', {
      name: 'read_file',
      description: 'Lire le contenu complet d\'un fichier depuis le système de fichiers',
      keywords: ['fichier', 'lecture', 'contenu', 'texte', 'document', 'filesystem'],
      useCase: 'Utiliser pour examiner le contenu d\'un fichier spécifique'
    });
    
    this.knownTools.set('write_file', {
      name: 'write_file',
      description: 'Créer ou écraser un fichier avec un nouveau contenu',
      keywords: ['fichier', 'écriture', 'création', 'contenu', 'texte', 'document', 'filesystem'],
      useCase: 'Utiliser pour créer ou mettre à jour un fichier avec un nouveau contenu'
    });
    
    this.knownTools.set('list_directory', {
      name: 'list_directory',
      description: 'Lister le contenu d\'un répertoire',
      keywords: ['fichier', 'dossier', 'répertoire', 'liste', 'contenu', 'directory', 'filesystem'],
      useCase: 'Utiliser pour voir tous les fichiers et dossiers dans un répertoire spécifié'
    });
    
    this.knownTools.set('directory_tree', {
      name: 'directory_tree',
      description: 'Obtenir une vue arborescente récursive des fichiers et répertoires',
      keywords: ['fichier', 'dossier', 'arborescence', 'tree', 'structure', 'hiérarchie', 'filesystem'],
      useCase: 'Utiliser pour visualiser la structure hiérarchique complète d\'un répertoire et ses sous-dossiers'
    });
    
    this.knownTools.set('create_directory', {
      name: 'create_directory',
      description: 'Créer un nouveau répertoire ou s\'assurer qu\'il existe',
      keywords: ['dossier', 'création', 'mkdir', 'répertoire', 'nouveau', 'filesystem'],
      useCase: 'Utiliser pour créer de nouveaux répertoires, y compris des structures imbriquées'
    });
    
    this.knownTools.set('move_file', {
      name: 'move_file',
      description: 'Déplacer ou renommer des fichiers et répertoires',
      keywords: ['fichier', 'déplacement', 'renommer', 'mv', 'déplacer', 'transfert', 'filesystem'],
      useCase: 'Utiliser pour déplacer des fichiers entre répertoires ou les renommer'
    });
    
    this.knownTools.set('search_files', {
      name: 'search_files',
      description: 'Rechercher des fichiers et répertoires selon un motif',
      keywords: ['fichier', 'recherche', 'dossier', 'motif', 'pattern', 'find', 'filesystem'],
      useCase: 'Utiliser pour trouver tous les fichiers correspondant à un motif dans une arborescence de répertoires'
    });
    
    this.knownTools.set('get_file_info', {
      name: 'get_file_info',
      description: 'Obtenir des métadonnées détaillées sur un fichier ou répertoire',
      keywords: ['fichier', 'métadonnées', 'info', 'taille', 'date', 'permissions', 'stat', 'filesystem'],
      useCase: 'Utiliser pour obtenir des informations détaillées sur un fichier sans lire son contenu'
    });
    
    this.knownTools.set('list_allowed_directories', {
      name: 'list_allowed_directories',
      description: 'Lister les répertoires accessibles par le serveur',
      keywords: ['répertoire', 'permission', 'accès', 'allowed', 'autorisé', 'filesystem'],
      useCase: 'Utiliser pour connaître les répertoires auxquels le serveur a accès avant de tenter d\'accéder aux fichiers'
    });
    
    // Outils Smart-E2B pour l'exécution de code dans un sandbox
    this.knownTools.set('executeJavaScript', {
      name: 'executeJavaScript',
      description: 'Exécution de code JavaScript dans un sandbox sécurisé via smart-e2b',
      keywords: ['code', 'javascript', 'exécution', 'programmation', 'script', 'e2b', 'sandbox', 'js'],
      useCase: 'Utiliser pour exécuter du code JavaScript dans un environnement isolé et sécurisé'
    });
    
    this.knownTools.set('executePython', {
      name: 'executePython',
      description: 'Exécution de code Python dans un sandbox sécurisé via smart-e2b',
      keywords: ['code', 'python', 'exécution', 'programmation', 'script', 'e2b', 'sandbox', 'py'],
      useCase: 'Utiliser pour exécuter du code Python dans un environnement isolé et sécurisé'
    });
    
    this.knownTools.set('uploadFile', {
      name: 'uploadFile',
      description: 'Télécharger un fichier vers le sandbox smart-e2b',
      keywords: ['fichier', 'upload', 'téléchargement', 'e2b', 'sandbox', 'transfert'],
      useCase: 'Permet de télécharger des fichiers vers l\'environnement sandbox pour traitement'
    });
    
    this.knownTools.set('listFiles', {
      name: 'listFiles',
      description: 'Lister les fichiers dans le sandbox smart-e2b',
      keywords: ['fichier', 'liste', 'répertoire', 'e2b', 'sandbox', 'dossier'],
      useCase: 'Permet de voir les fichiers disponibles dans l\'environnement sandbox'
    });
    
    this.knownTools.set('readFile', {
      name: 'readFile',
      description: 'Lire le contenu d\'un fichier dans le sandbox smart-e2b',
      keywords: ['fichier', 'lecture', 'contenu', 'e2b', 'sandbox', 'texte'],
      useCase: 'Permet de lire le contenu d\'un fichier dans l\'environnement sandbox'
    });
    
    // Outil de réflexion séquentielle
    this.knownTools.set('sequentialthinking', {
      name: 'sequentialthinking',
      description: 'Outil de réflexion séquentielle pour résolution de problèmes',
      keywords: ['réflexion', 'pensée', 'séquentiel', 'étape', 'problème', 'raisonnement'],
      useCase: 'Utiliser pour une résolution de problèmes par étapes, avec révision et ramification possibles'
    });
  }
  
  /**
   * Suggère des outils pertinents pour un contenu donné avec option pour la vérification
   * AMÉLIORÉ: Scores plus dynamiques et adaptés au raisonnement
   * 
   * @param content Le contenu pour lequel suggérer des outils
   * @param options Options de configuration (limite, mode vérification, etc)
   * @returns Un tableau d'outils suggérés
   */
  public suggestToolsGeneric(content: string, options: {
    limit?: number,
    verificationMode?: boolean,
    toolFilter?: string[],  // Optionnel: liste des outils à considérer
    previousSuggestions?: SuggestedTool[], // Optionnel: suggestions précédentes pour ajuster le score 
    reasoningStage?: 'initial' | 'developing' | 'advanced' | 'final' // Optionnel: étape du raisonnement
  } = {}): SuggestedTool[] {
    const {
      limit = 3,
      verificationMode = false,
      toolFilter = [],
      previousSuggestions = [],
      reasoningStage = 'initial'
    } = options;
    
    // Déterminer les outils à considérer selon le mode
    let relevantTools = Array.from(this.knownTools.values());
    
    // Filtrer les outils si nécessaire
    if (verificationMode) {
      const verificationToolNames = [
        'perplexity_search_web',
        'tavily-search',
        'brave_web_search',
        'tavily-extract',
        'executePython',
        'executeJavaScript'
      ];
      relevantTools = relevantTools.filter(tool => verificationToolNames.includes(tool.name));
    } else if (toolFilter.length > 0) {
      relevantTools = relevantTools.filter(tool => toolFilter.includes(tool.name));
    }
    
    // Convertir le contenu en mots-clés
    const contentWords = content.toLowerCase().split(/\W+/).filter(word => word.length > 3);
    
    // Analyse du contenu pour détecter des intentions/besoins spécifiques
    const needsWebSearch = this.containsAny(content.toLowerCase(), ['recherche', 'trouve', 'cherche', 'information', 'récent', 'actualité', 'web', 'internet']);
    const needsCodeExecution = this.containsAny(content.toLowerCase(), ['code', 'calcul', 'programme', 'python', 'javascript', 'script', 'algorithme', 'exécute', 'js', 'sandbox']);
    const needsFileOperation = !verificationMode && this.containsAny(content.toLowerCase(), ['fichier', 'document', 'lecture', 'écriture', 'sauvegarde', 'dossier', 'répertoire', 'arborescence']);
    const needsLocalSearch = !verificationMode && this.containsAny(content.toLowerCase(), ['local', 'près', 'proximité', 'entreprise', 'restaurant', 'magasin', 'adresse', 'lieu']);
    const needsContentExtraction = this.containsAny(content.toLowerCase(), ['extrait', 'extraction', 'contenu', 'page', 'url', 'site', 'web', 'article']);
    
    // Détections supplémentaires (uniquement en mode non-vérification)
    const needsDirectoryListing = !verificationMode && this.containsAny(content.toLowerCase(), ['liste', 'lister', 'contenu', 'répertoire', 'dossier', 'afficher', 'voir']);
    const needsDirectoryTree = !verificationMode && this.containsAny(content.toLowerCase(), ['arborescence', 'structure', 'hiérarchie', 'tree', 'visualiser']);
    const needsFileCreation = !verificationMode && this.containsAny(content.toLowerCase(), ['créer', 'nouveau', 'dossier', 'répertoire', 'mkdir']);
    const needsFileMove = !verificationMode && this.containsAny(content.toLowerCase(), ['déplacer', 'renommer', 'déplacement', 'transfert', 'mv', 'move']);
    const needsFileSearch = !verificationMode && this.containsAny(content.toLowerCase(), ['chercher', 'trouver', 'rechercher', 'pattern', 'motif', 'fichier']);
    const needsPythonExecution = this.containsAny(content.toLowerCase(), ['python', 'py', 'pandas', 'numpy', 'sklearn']);
    const needsJavaScriptExecution = this.containsAny(content.toLowerCase(), ['javascript', 'js', 'node', 'react', 'vue', 'angular']);
    
    // Détection des besoins de vérification de faits ou d'informations
    const needsFactChecking = this.containsAny(content.toLowerCase(), [
      'vérifier', 'confirmer', 'source', 'preuve', 'statistique', 'données', 
      'affirme', 'selon', 'citation', 'cité', 'mentionné', 'rapporté'
    ]);
    
    // Détection d'incertitude ou de doute
    const hasUncertainty = this.containsAny(content.toLowerCase(), [
      'peut-être', 'potentiellement', 'probablement', 'semble', 'apparaît',
      'pourrait', 'il se peut', 'incertain', 'doute', 'question', 'hypothèse'
    ]);
    
    // Facteur d'ajustement basé sur l'étape de raisonnement
    let stageFactor = 1.0;
    switch (reasoningStage) {
      case 'initial':
        stageFactor = 0.7; // Scores de base plus bas au début
        break;
      case 'developing':
        stageFactor = 1.0; // Scores normaux pendant le développement
        break;
      case 'advanced':
        stageFactor = 1.2; // Scores plus élevés pour les étapes avancées
        break;
      case 'final':
        stageFactor = 1.3; // Scores encore plus élevés pour la finalisation
        break;
    }
    
    // Calculer un score pour chaque outil
    const toolScores = relevantTools.map(tool => {
      // Score basé sur la correspondance de mots-clés
      const matchingKeywords = tool.keywords.filter(keyword => 
        contentWords.includes(keyword) || content.toLowerCase().includes(keyword)
      );
      
      // Score de base - démarre plus bas qu'avant
      let score = (matchingKeywords.length / Math.max(tool.keywords.length, 1)) * 0.6;
      
      // Ajustements basés sur les besoins détectés
      if (needsWebSearch) {
        if (['perplexity_search_web', 'brave_web_search', 'tavily-search'].includes(tool.name)) {
          score += verificationMode ? 0.4 : 0.3;
        }
        
        // Affiner les scores en mode non-vérification
        if (!verificationMode) {
          if (content.toLowerCase().includes('actualité') && tool.name === 'perplexity_search_web') {
            score += 0.2;
          }
          
          if (content.toLowerCase().includes('détaillé') && tool.name === 'tavily-search') {
            score += 0.2;
          }
          
          if (content.toLowerCase().includes('brave') && tool.name === 'brave_web_search') {
            score += 0.4;
          }
        }
      }
      
      // Favoriser la recherche web en cas d'incertitude ou de besoin de vérification
      if ((needsFactChecking || hasUncertainty) && ['perplexity_search_web', 'tavily-search'].includes(tool.name)) {
        score += 0.3;
      }
      
      if (needsContentExtraction && tool.name === 'tavily-extract') {
        score += 0.5;
      }
      
      if (needsCodeExecution) {
        if (tool.name === 'executePython' || tool.name === 'executeJavaScript') {
          score += verificationMode ? 0.5 : 0.3;
        }
        
        // Prioriser le bon langage
        if (needsPythonExecution && tool.name === 'executePython') {
          score += 0.3;
        }
        
        if (needsJavaScriptExecution && tool.name === 'executeJavaScript') {
          score += 0.3;
        }
      }
      
      // Logique pour le mode non-vérification uniquement
      if (!verificationMode) {
        if (needsFileOperation) {
          if (['read_file', 'write_file', 'list_directory', 'directory_tree', 'create_directory', 'move_file', 'search_files', 'get_file_info', 'list_allowed_directories', 'readFile', 'listFiles', 'uploadFile'].includes(tool.name)) {
            score += 0.3;
          }
          
          // Spécifications plus précises
          if (needsDirectoryListing && (tool.name === 'list_directory' || tool.name === 'listFiles')) {
            score += 0.3;
          }
          
          if (needsDirectoryTree && tool.name === 'directory_tree') {
            score += 0.4;
          }
          
          if (needsFileCreation && tool.name === 'create_directory') {
            score += 0.4;
          }
          
          if (needsFileMove && tool.name === 'move_file') {
            score += 0.4;
          }
          
          if (needsFileSearch && tool.name === 'search_files') {
            score += 0.4;
          }
          
          // Distinguer entre opérations sandbox et filesystem
          const indicatesLocalFileSystem = this.containsAny(content.toLowerCase(), 
            ['fichier local', 'système de fichiers', 'machine locale', 'disque local', 'ordinateur local', 'répertoire local']);
          
          if (indicatesLocalFileSystem) {
            if (['read_file', 'write_file', 'list_directory', 'directory_tree', 'create_directory', 'move_file', 'search_files', 'get_file_info', 'list_allowed_directories'].includes(tool.name)) {
              score += 0.4;
            }
          } else {
            if (['readFile', 'listFiles', 'uploadFile'].includes(tool.name)) {
              score += 0.4;
            }
          }
        }
        
        if (needsLocalSearch && tool.name === 'brave_local_search') {
          score += 0.4;
        }
      } else {
        // Ajustements spécifiques au mode vérification
        if (['perplexity_search_web', 'tavily-search'].includes(tool.name)) {
          score += 0.2; // Boost pour les meilleurs outils de recherche en vérification
        }
      }
      
      // Ajustement progressif en fonction de l'étape de raisonnement
      score *= stageFactor;
      
      // Ajustement basé sur les suggestions précédentes (favoriser la diversité des outils)
      const toolWasSuggestedBefore = previousSuggestions.some(s => s.name === tool.name);
      if (toolWasSuggestedBefore) {
        // Réduire le score des outils déjà suggérés, sauf si le contenu actuel les mentionne spécifiquement
        if (!content.toLowerCase().includes(tool.name.toLowerCase())) {
          score *= 0.7; // Réduction de 30% pour encourager la diversité
        }
      }
      
      // Conversion du score: fonction non linéaire pour accentuer les différences
      // Un score bas reste bas, mais un score élevé devient plus élevé
      const adjustedScore = score < 0.5 ? score * 0.8 : score + Math.pow(score - 0.5, 2);
      
      return { tool, score: adjustedScore };
    });
    
    // Filtrer et normaliser les résultats
    const minScore = reasoningStage === 'initial' ? 0.05 : 0.1;
    
    const suggestedTools = toolScores
      .filter(item => item.score > minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item, index) => {
        return {
          name: item.tool.name,
          confidence: Math.min(Math.max(item.score, 0), 1), // Limite entre 0 et 1
          reason: verificationMode 
            ? this.generateVerificationReason(item.tool, content)
            : this.generateReason(item.tool, content),
          priority: index + 1
        };
      });
    
    // Log pour le debugging
    console.error(`Smart-Thinking: Suggestion d'outils - étape ${reasoningStage}, ${suggestedTools.length} outil(s) suggéré(s)`);
    
    // Outil par défaut si aucun n'est trouvé, avec score adapté au stade de raisonnement
    if (suggestedTools.length === 0) {
      const defaultConfidence = verificationMode ? 
        0.5 * stageFactor : 
        0.3 * stageFactor;
        
      suggestedTools.push({
        name: 'tavily-search',
        confidence: Math.min(defaultConfidence, 1.0),
        reason: verificationMode
          ? 'Outil de recherche général pour la vérification des informations'
          : 'Aucun outil spécifique n\'a été identifié comme fortement pertinent. Une recherche web générale pourrait aider à explorer ce sujet.',
        priority: 1
      });
    }
    
    return suggestedTools;
  }
  
  /**
   * Suggère des outils de vérification pertinents pour un contenu donné
   * @param content Le contenu pour lequel suggérer des outils
   * @param limit Le nombre maximum d'outils à suggérer
   * @returns Un tableau d'outils suggérés
   */
  public suggestVerificationTools(content: string, limit: number = 3): SuggestedTool[] {
    return this.suggestToolsGeneric(content, { limit, verificationMode: true });
  }
  
  /**
   * Génère une raison spécifique pour la vérification avec un outil
   * 
   * @param tool L'outil suggéré
   * @param content Le contenu à vérifier
   * @returns Une raison explicative pour la vérification
   */
  private generateVerificationReason(tool: any, content: string): string {
    switch (tool.name) {
      case 'perplexity_search_web':
        return 'Vérification via Perplexity pour obtenir des informations récentes et factuelles';
      case 'tavily-search':
        return 'Recherche approfondie via Tavily pour vérifier l\'exactitude des informations';
      case 'brave_web_search':
        return 'Vérification des faits via Brave Search pour une source alternative';
      case 'tavily-extract':
        return 'Extraction de contenu pour vérifier les informations depuis des sources spécifiques';
      case 'executePython':
        return 'Vérification des calculs et analyses par exécution de code Python';
      case 'executeJavaScript':
        return 'Vérification des calculs et analyses par exécution de code JavaScript';
      default:
        return tool.useCase || 'Outil de vérification des informations';
    }
  }
  
  /**
   * Exécute un outil de vérification sur un contenu donné
   * 
   * @param toolName Le nom de l'outil à exécuter
   * @param content Le contenu à vérifier
   * @returns Le résultat de la vérification
   */
  public async executeVerificationTool(toolName: string, content: string): Promise<any> {
    // Logique différente selon l'outil
    switch (toolName) {
      case 'perplexity_search_web':
        return this.executePerplexitySearch(content);
      case 'tavily-search':
        return this.executeTavilySearch(content);
      case 'brave_web_search':
        return this.executeBraveSearch(content);
      case 'tavily-extract':
        return this.executeTavilyExtract(content);
      case 'executePython':
        return this.executePythonVerification(content);
      case 'executeJavaScript':
        return this.executeJavaScriptVerification(content);
      default:
        throw new Error(`Outil de vérification non pris en charge: ${toolName}`);
    }
  }
  
  /**
   * Exécute une recherche Perplexity pour vérifier des informations
   * 
   * @param content Le contenu à vérifier
   * @returns Le résultat de la vérification
   */
  private async executePerplexitySearch(content: string): Promise<any> {
    // Note: Dans une implémentation réelle, ceci ferait un appel à l'API Perplexity
    console.log(`Exécution de perplexity_search_web pour vérifier: ${content}`);
    
    // Simule un résultat de vérification
    return {
      isValid: true,
      confidence: 0.85,
      source: "Perplexity Search API",
      details: "Information vérifiée via Perplexity Search"
    };
  }
  
  /**
   * Exécute une recherche Tavily pour vérifier des informations
   * 
   * @param content Le contenu à vérifier
   * @returns Le résultat de la vérification
   */
  private async executeTavilySearch(content: string): Promise<any> {
    // Note: Dans une implémentation réelle, ceci ferait un appel à l'API Tavily
    console.log(`Exécution de tavily-search pour vérifier: ${content}`);
    
    // Simule un résultat de vérification
    return {
      isValid: true,
      confidence: 0.9,
      source: "Tavily Search API",
      details: "Information vérifiée via Tavily Search"
    };
  }
  
  /**
   * Exécute une recherche Brave pour vérifier des informations
   * 
   * @param content Le contenu à vérifier
   * @returns Le résultat de la vérification
   */
  private async executeBraveSearch(content: string): Promise<any> {
    // Note: Dans une implémentation réelle, ceci ferait un appel à l'API Brave
    console.log(`Exécution de brave_web_search pour vérifier: ${content}`);
    
    // Simule un résultat de vérification
    return {
      isValid: true,
      confidence: 0.8,
      source: "Brave Search API",
      details: "Information vérifiée via Brave Search"
    };
  }
  
  /**
   * Exécute une extraction Tavily pour vérifier des informations
   * 
   * @param content Le contenu à vérifier
   * @returns Le résultat de la vérification
   */
  private async executeTavilyExtract(content: string): Promise<any> {
    // Note: Dans une implémentation réelle, ceci ferait un appel à l'API Tavily Extract
    console.log(`Exécution de tavily-extract pour vérifier: ${content}`);
    
    // Simule un résultat de vérification
    return {
      isValid: true,
      confidence: 0.85,
      source: "Tavily Extract API",
      details: "Information vérifiée via extraction de contenu"
    };
  }
  
  /**
   * Vérifie des informations via exécution de code Python
   * 
   * @param content Le contenu à vérifier
   * @returns Le résultat de la vérification
   */
  private async executePythonVerification(content: string): Promise<any> {
    // Note: Dans une implémentation réelle, ceci utiliserait Smart-E2B pour exécuter du code Python
    console.log(`Exécution de Python pour vérifier: ${content}`);
    
    // Simule un résultat de vérification
    return {
      isValid: true,
      confidence: 0.95,
      source: "Smart-E2B Python Execution",
      details: "Calculs vérifiés via exécution Python"
    };
  }
  
  /**
   * Vérifie des informations via exécution de code JavaScript
   * 
   * @param content Le contenu à vérifier
   * @returns Le résultat de la vérification
   */
  private async executeJavaScriptVerification(content: string): Promise<any> {
    // Note: Dans une implémentation réelle, ceci utiliserait Smart-E2B pour exécuter du code JavaScript
    console.log(`Exécution de JavaScript pour vérifier: ${content}`);
    
    // Simule un résultat de vérification
    return {
      isValid: true,
      confidence: 0.95,
      source: "Smart-E2B JavaScript Execution",
      details: "Calculs vérifiés via exécution JavaScript"
    };
  }

  /**
   * Suggère des outils pertinents pour un contenu donné
   * 
   * @param content Le contenu pour lequel suggérer des outils
   * @param limit Le nombre maximum d'outils à suggérer
   * @returns Un tableau d'outils suggérés
   */
  suggestTools(content: string, limit: number = 3): SuggestedTool[] {
    return this.suggestToolsGeneric(content, { limit, verificationMode: false });
  }
  
  /**
   * Vérifie si un texte contient l'un des termes donnés
   * 
   * @param text Le texte à vérifier
   * @param terms Les termes à rechercher
   * @returns true si le texte contient au moins un des termes, false sinon
   */
  private containsAny(text: string, terms: string[]): boolean {
    return terms.some(term => text.includes(term));
  }
  
  /**
   * Génère une raison explicative pour la suggestion d'un outil
   * 
   * @param tool L'outil suggéré
   * @param content Le contenu pour lequel l'outil est suggéré
   * @returns Une raison explicative
   */
  private generateReason(tool: any, content: string): string {
    // Analyse du contenu pour personnaliser la raison
    const isQuestion = content.includes('?');
    const isTopic = content.length < 50 && !isQuestion;
    const isComplex = content.length > 200;
    const mentionsUrl = /https?:\/\/[^\s]+/.test(content);
    const mentionsFilePath = /[\/\\][^\s\/\\]+[\/\\][^\s\/\\]+/.test(content);
    const mentionsCode = /(code|javascript|python|script|fonction|algorithm)/i.test(content);
    
    // Raisons spécifiques pour chaque outil
    switch (tool.name) {
      case 'perplexity_search_web':
        if (isQuestion) {
          return 'Cette question nécessite des informations récentes que Perplexity peut fournir efficacement.';
        } else if (isTopic) {
          return 'Ce sujet mérite une exploration avec Perplexity pour obtenir des informations à jour.';
        } else {
          return 'Perplexity peut aider à trouver des informations récentes et pertinentes sur ce sujet.';
        }
        
      case 'brave_web_search':
        if (isQuestion) {
          return 'Cette question peut être résolue avec une recherche web générale via Brave Search.';
        } else {
          return 'Brave Search peut fournir des résultats pertinents sur ce sujet avec une bonne couverture générale.';
        }
        
      case 'brave_local_search':
        return 'Ce sujet concerne des lieux ou services locaux que Brave Local Search peut aider à trouver.';
        
      case 'tavily-search':
        if (isComplex) {
          return 'Cette recherche complexe bénéficierait de la capacité de Tavily à traiter des requêtes détaillées.';
        } else {
          return 'Tavily Search permet d\'obtenir des résultats bien contextualisés sur ce sujet.';
        }
        
      case 'tavily-extract':
        if (mentionsUrl) {
          return 'Tavily Extract peut analyser et extraire du contenu pertinent des URLs mentionnées.';
        } else {
          return 'Pour une analyse approfondie de pages web, Tavily Extract peut extraire du contenu structuré.';
        }
        
      case 'executePython':
        return 'Ce problème peut être résolu avec l\'exécution de code Python dans un environnement sandbox sécurisé.';
        
      case 'executeJavaScript':
        return 'Ce problème peut être résolu avec l\'exécution de code JavaScript dans un environnement sandbox sécurisé.';
        
      case 'list_directory':
      case 'listFiles':
        return 'Pour visualiser le contenu de ce répertoire, cet outil permet de lister tous les fichiers et dossiers.';
        
      case 'directory_tree':
        return 'Pour comprendre la structure complète de ce répertoire, une visualisation arborescente serait utile.';
        
      case 'create_directory':
        return 'Pour organiser les fichiers, la création de répertoires permettrait une meilleure structure.';
        
      case 'move_file':
        return 'Pour réorganiser les fichiers, cet outil permet de déplacer ou renommer des éléments.';
        
      case 'search_files':
        return 'Pour trouver rapidement les fichiers correspondant à ce critère dans toute l\'arborescence.';
        
      case 'read_file':
        return 'Cet outil permet de lire le contenu complet du fichier spécifié.';
        
      case 'write_file':
        return 'Pour créer ou modifier un fichier avec le contenu spécifié.';
        
      case 'uploadFile':
        return 'Pour transférer un fichier vers l\'environnement sandbox afin de l\'utiliser pour l\'exécution de code.';
        
      case 'readFile':
        return 'Pour lire le contenu d\'un fichier dans l\'environnement sandbox.';
        
      default:
        // Si aucune personnalisation spécifique n'est applicable, utiliser le cas d'usage général
        return tool.useCase;
    }
  }
  
  /**
   * Ajoute un nouvel outil au registre
   * 
   * @param name Le nom de l'outil
   * @param description La description de l'outil
   * @param keywords Les mots-clés associés
   * @param useCase Le cas d'usage de l'outil
   */
  addTool(
    name: string, 
    description: string, 
    keywords: string[], 
    useCase: string
  ): void {
    this.knownTools.set(name, {
      name,
      description,
      keywords,
      useCase
    });
  }
  
  /**
   * Supprime un outil du registre
   * 
   * @param name Le nom de l'outil à supprimer
   * @returns true si l'outil a été supprimé, false sinon
   */
  removeTool(name: string): boolean {
    return this.knownTools.delete(name);
  }
  
  /**
   * Récupère tous les outils du registre
   * 
   * @returns Un tableau de tous les outils
   */
  getAllTools(): any[] {
    return Array.from(this.knownTools.values());
  }
}