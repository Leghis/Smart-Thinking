import { SuggestedTool } from './types';
import { callInternalLlm } from './utils/openrouter-client'; // Import LLM utility

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

    this.knownTools.set('tavily-extract', {
      name: 'tavily-extract',
      description: 'Extraction de contenu web avec Tavily',
      keywords: ['extraction', 'contenu', 'web', 'page', 'url', 'tavily', 'texte', 'analyse', 'scraping'],
      useCase: 'Utiliser pour extraire et traiter du contenu à partir d\'URLs spécifiques, idéal pour l\'analyse de documents web'
    });

    // Outils pour les fichiers système locaux (via les outils Cline standard)
    this.knownTools.set('read_file', {
      name: 'read_file',
      description: 'Lire le contenu complet d\'un fichier depuis le système de fichiers local',
      keywords: ['fichier', 'lecture', 'contenu', 'texte', 'document', 'filesystem', 'local'],
      useCase: 'Utiliser pour examiner le contenu d\'un fichier spécifique sur le système local'
    });

    this.knownTools.set('write_to_file', {
      name: 'write_to_file',
      description: 'Créer ou écraser un fichier local avec un nouveau contenu',
      keywords: ['fichier', 'écriture', 'création', 'contenu', 'texte', 'document', 'filesystem', 'local', 'sauvegarder'],
      useCase: 'Utiliser pour créer ou mettre à jour un fichier local avec un nouveau contenu'
    });

     this.knownTools.set('list_files', {
      name: 'list_files',
      description: 'Lister le contenu d\'un répertoire local',
      keywords: ['fichier', 'dossier', 'répertoire', 'liste', 'contenu', 'directory', 'filesystem', 'local', 'ls'],
      useCase: 'Utiliser pour voir tous les fichiers et dossiers dans un répertoire local spécifié'
    });

     this.knownTools.set('replace_in_file', {
       name: 'replace_in_file',
       description: 'Modifier un fichier local en remplaçant des sections spécifiques',
       keywords: ['fichier', 'modifier', 'édition', 'remplacer', 'patch', 'diff', 'local'],
       useCase: 'Utiliser pour faire des modifications ciblées dans un fichier existant sur le système local'
     });

     this.knownTools.set('search_files', { // Outil Cline standard pour la recherche regex locale
       name: 'search_files',
       description: 'Rechercher un motif regex dans les fichiers locaux',
       keywords: ['recherche', 'fichier', 'motif', 'regex', 'grep', 'local', 'contenu'],
       useCase: 'Utiliser pour trouver des motifs spécifiques dans les fichiers locaux'
     });

     this.knownTools.set('execute_command', {
      name: 'execute_command',
      description: 'Exécuter une commande CLI sur le système local',
      keywords: ['commande', 'cli', 'terminal', 'shell', 'exécuter', 'script', 'système', 'bash', 'zsh'],
      useCase: 'Utiliser pour exécuter des commandes système, des scripts ou interagir avec le terminal local'
     });


    // Outils Smart-E2B pour l'exécution de code dans un sandbox
    this.knownTools.set('executeJavaScript', {
      name: 'executeJavaScript',
      description: 'Exécution de code JavaScript dans un sandbox sécurisé via smart-e2b',
      keywords: ['code', 'javascript', 'exécution', 'programmation', 'script', 'e2b', 'sandbox', 'js', 'node'],
      useCase: 'Utiliser pour exécuter du code JavaScript dans un environnement isolé et sécurisé'
    });

    this.knownTools.set('executePython', {
      name: 'executePython',
      description: 'Exécution de code Python dans un sandbox sécurisé via smart-e2b',
      keywords: ['code', 'python', 'exécution', 'programmation', 'script', 'e2b', 'sandbox', 'py', 'pandas', 'numpy'],
      useCase: 'Utiliser pour exécuter du code Python dans un environnement isolé et sécurisé'
    });

    this.knownTools.set('uploadFile', { // E2B specific
      name: 'uploadFile',
      description: 'Télécharger un fichier vers le sandbox smart-e2b',
      keywords: ['fichier', 'upload', 'téléchargement', 'e2b', 'sandbox', 'transfert'],
      useCase: 'Permet de télécharger des fichiers vers l\'environnement sandbox E2B pour traitement'
    });

    this.knownTools.set('listFiles', { // E2B specific
      name: 'listFiles',
      description: 'Lister les fichiers dans le sandbox smart-e2b',
      keywords: ['fichier', 'liste', 'répertoire', 'e2b', 'sandbox', 'dossier'],
      useCase: 'Permet de voir les fichiers disponibles dans l\'environnement sandbox E2B'
    });

    this.knownTools.set('readFile', { // E2B specific
      name: 'readFile',
      description: 'Lire le contenu d\'un fichier dans le sandbox smart-e2b',
      keywords: ['fichier', 'lecture', 'contenu', 'e2b', 'sandbox', 'texte'],
      useCase: 'Permet de lire le contenu d\'un fichier dans l\'environnement sandbox E2B'
    });

    // Outil de réflexion séquentielle
    this.knownTools.set('sequentialthinking', {
      name: 'sequentialthinking',
      description: 'Outil de réflexion séquentielle pour résolution de problèmes',
      keywords: ['réflexion', 'pensée', 'séquentiel', 'étape', 'problème', 'raisonnement', 'plan'],
      useCase: 'Utiliser pour une résolution de problèmes par étapes, avec révision et ramification possibles'
    });

    // Outil Smart-Thinking (lui-même)
     this.knownTools.set('smartthinking', {
       name: 'smartthinking',
       description: 'Outil principal de Smart-Thinking pour ajouter/gérer des pensées',
       keywords: ['pensée', 'ajouter', 'raisonnement', 'graphe', 'smart-thinking', 'connecter', 'lier'],
       useCase: 'Utiliser pour ajouter de nouvelles pensées, établir des connexions et gérer le graphe de raisonnement'
     });
  }

  /**
   * Suggère des outils pertinents pour un contenu donné avec option pour la vérification.
   * Tente d'utiliser le LLM interne pour une meilleure pertinence, avec repli sur l'heuristique.
   *
   * @param content Le contenu pour lequel suggérer des outils
   * @param options Options de configuration (limite, mode vérification, etc)
   * @returns Une promesse résolvant vers un tableau d'outils suggérés
   */
  public async suggestToolsGeneric(content: string, options: {
    limit?: number,
    verificationMode?: boolean,
    toolFilter?: string[],
    previousSuggestions?: SuggestedTool[], // Gardé pour l'heuristique de repli
    reasoningStage?: 'initial' | 'developing' | 'advanced' | 'final' // Gardé pour l'heuristique de repli
  } = {}): Promise<SuggestedTool[]> {
    const {
      limit = 3,
      verificationMode = false,
      toolFilter = [],
    } = options;

    // Déterminer les outils disponibles à considérer
    let availableTools = Array.from(this.knownTools.values());
    if (verificationMode) {
      const verificationToolNames = [
        'perplexity_search_web', 'tavily-search', 'brave_web_search',
        'tavily-extract', 'executePython', 'executeJavaScript'
        // On pourrait ajouter 'read_file' si la vérification implique des fichiers locaux
      ];
      availableTools = availableTools.filter(tool => verificationToolNames.includes(tool.name));
    } else if (toolFilter.length > 0) {
      availableTools = availableTools.filter(tool => toolFilter.includes(tool.name));
    }

    if (availableTools.length === 0) {
        console.warn("Aucun outil disponible pour la suggestion.");
        return [];
    }

    // --- Tentative de suggestion via LLM ---
    let llmSuggestions: SuggestedTool[] | null = null;
    try {
        const toolListString = availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n');
        // Prompt amélioré pour être plus précis sur le format JSON attendu
        const systemPrompt = `You are an expert assistant selecting the best tools for a given task based on the user's thought content. Analyze the user's thought and suggest the top ${limit} most relevant tools from the provided list ONLY. Explain briefly (max 15 words) why each tool is relevant for the specific thought content. Respond ONLY with a valid JSON array of objects, where each object has exactly two keys: "name" (string, the tool name from the list) and "reason" (string, your brief explanation). Do not include any other text or formatting outside the JSON array. Available tools:\n${toolListString}`;
        const userPrompt = `Thought content:\n"${content}"\n\nSuggest the top ${limit} relevant tools from the list in JSON array format:`;

        const llmResponse = await callInternalLlm(systemPrompt, userPrompt, 350); // Increased tokens slightly

        if (llmResponse) {
            // Tentative de nettoyage de la réponse LLM pour extraire le JSON
            const jsonMatch = llmResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                const jsonString = jsonMatch[0];
                try {
                    const parsedSuggestions = JSON.parse(jsonString);
                    if (Array.isArray(parsedSuggestions) && parsedSuggestions.length > 0) {
                        const validatedSuggestions: SuggestedTool[] = [];
                        let priority = 1;
                        for (const suggestion of parsedSuggestions) {
                            // Vérification plus stricte du format de l'objet
                            if (suggestion && typeof suggestion.name === 'string' && typeof suggestion.reason === 'string' && Object.keys(suggestion).length === 2) {
                                const knownTool = this.knownTools.get(suggestion.name);
                                // S'assurer que l'outil suggéré est dans la liste des outils disponibles pour ce contexte
                                if (knownTool && availableTools.some(at => at.name === knownTool.name)) {
                                    validatedSuggestions.push({
                                        name: knownTool.name,
                                        confidence: 1.0 / priority, // Confiance simple basée sur le rang
                                        reason: suggestion.reason,
                                        priority: priority++
                                    });
                                    if (validatedSuggestions.length >= limit) break;
                                } else {
                                    console.warn(`LLM suggested an unknown or unavailable tool: ${suggestion.name}`);
                                }
                            } else {
                                 console.warn(`LLM suggestion item has invalid format: ${JSON.stringify(suggestion)}`);
                            }
                        }
                        if (validatedSuggestions.length > 0) {
                            console.error(`Smart-Thinking: Suggestions d'outils fournies par le LLM interne.`);
                            llmSuggestions = validatedSuggestions; // Stocker les suggestions validées
                        }
                    }
                } catch (parseError) {
                    console.warn(`LLM tool suggestion response was not valid JSON or structure incorrect: ${llmResponse}`, parseError);
                }
            } else {
                 console.warn(`Could not extract JSON array from LLM response: ${llmResponse}`);
            }
        }
    } catch (llmError) {
        console.error('Error calling LLM for tool suggestion:', llmError);
    }

    // Si le LLM a fourni des suggestions valides, les retourner
    if (llmSuggestions && llmSuggestions.length > 0) {
        return llmSuggestions;
    }

    // --- Repli (Fallback) vers l'heuristique si le LLM échoue ou ne renvoie rien de valide ---
    console.warn("LLM tool suggestion failed or returned no valid tools. Falling back to heuristic method.");
    // Passer les options originales à l'heuristique
    return this.suggestToolsHeuristic(content, options);
  }

  /**
   * Méthode heuristique originale pour suggérer des outils (utilisée comme repli).
   */
  private suggestToolsHeuristic(content: string, options: {
    limit?: number,
    verificationMode?: boolean,
    toolFilter?: string[],
    previousSuggestions?: SuggestedTool[],
    reasoningStage?: 'initial' | 'developing' | 'advanced' | 'final'
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

     if (relevantTools.length === 0) return []; // Retourner vide si aucun outil pertinent

    // Convertir le contenu en mots-clés
    const contentWords = content.toLowerCase().split(/\W+/).filter(word => word.length > 3);

    // Analyse du contenu pour détecter des intentions/besoins spécifiques
    const needsWebSearch = this.containsAny(content.toLowerCase(), ['recherche', 'trouve', 'cherche', 'information', 'récent', 'actualité', 'web', 'internet']);
    const needsCodeExecution = this.containsAny(content.toLowerCase(), ['code', 'calcul', 'programme', 'python', 'javascript', 'script', 'algorithme', 'exécute', 'js', 'sandbox']);
    const needsFileOperation = !verificationMode && this.containsAny(content.toLowerCase(), ['fichier', 'document', 'lecture', 'écriture', 'sauvegarde', 'dossier', 'répertoire', 'arborescence', 'local']);
    const needsLocalSearch = !verificationMode && this.containsAny(content.toLowerCase(), ['local', 'près', 'proximité', 'entreprise', 'restaurant', 'magasin', 'adresse', 'lieu']);
    const needsContentExtraction = this.containsAny(content.toLowerCase(), ['extrait', 'extraction', 'contenu', 'page', 'url', 'site', 'web', 'article']);

    // Détections supplémentaires (uniquement en mode non-vérification)
    const needsDirectoryListing = !verificationMode && this.containsAny(content.toLowerCase(), ['liste', 'lister', 'contenu', 'répertoire', 'dossier', 'afficher', 'voir']);
    // const needsDirectoryTree = !verificationMode && this.containsAny(content.toLowerCase(), ['arborescence', 'structure', 'hiérarchie', 'tree', 'visualiser']); // Requires execute_command
    const needsFileCreation = !verificationMode && this.containsAny(content.toLowerCase(), ['créer', 'nouveau', 'dossier', 'répertoire', 'mkdir']); // Requires execute_command or write_to_file
    const needsFileMove = !verificationMode && this.containsAny(content.toLowerCase(), ['déplacer', 'renommer', 'déplacement', 'transfert', 'mv', 'move']); // Requires execute_command
    const needsFileSearch = !verificationMode && this.containsAny(content.toLowerCase(), ['chercher', 'trouver', 'rechercher', 'pattern', 'motif', 'fichier']); // Use search_files
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
      case 'initial': stageFactor = 0.7; break;
      case 'developing': stageFactor = 1.0; break;
      case 'advanced': stageFactor = 1.2; break;
      case 'final': stageFactor = 1.3; break;
    }

    // Calculer un score pour chaque outil
    const toolScores = relevantTools.map(tool => {
      const matchingKeywords = tool.keywords.filter(keyword =>
        contentWords.includes(keyword) || content.toLowerCase().includes(keyword)
      );
      let keywordScore = 0;
      for (let i = 0; i < matchingKeywords.length; i++) {
        keywordScore += 1 / (i + 1);
      }
      keywordScore = Math.min(keywordScore / 2, 0.6);
      let score = keywordScore;

      // Apply heuristic boosts
      if (needsWebSearch && ['perplexity_search_web', 'brave_web_search', 'tavily-search'].includes(tool.name)) score += verificationMode ? 0.4 : 0.3;
      if ((needsFactChecking || hasUncertainty) && ['perplexity_search_web', 'tavily-search'].includes(tool.name)) score += 0.3;
      if (needsContentExtraction && tool.name === 'tavily-extract') score += 0.5;
      if (needsCodeExecution && ['executePython', 'executeJavaScript'].includes(tool.name)) score += verificationMode ? 0.5 : 0.3;
      if (needsPythonExecution && tool.name === 'executePython') score += 0.3;
      if (needsJavaScriptExecution && tool.name === 'executeJavaScript') score += 0.3;

      if (!verificationMode) {
          if (needsFileOperation && ['read_file', 'write_to_file', 'list_files', 'replace_in_file', 'execute_command', 'readFile', 'listFiles', 'uploadFile'].includes(tool.name)) score += 0.3;
          if (needsDirectoryListing && (tool.name === 'list_files' || tool.name === 'listFiles')) score += 0.3;
          if (needsFileCreation && (tool.name === 'write_to_file' || tool.name === 'execute_command')) score += 0.4; // write_to_file can create dirs
          if (needsFileMove && tool.name === 'execute_command') score += 0.4; // mv needs execute_command
          if (needsFileSearch && tool.name === 'search_files') score += 0.4; // Use dedicated search_files tool
          if (needsLocalSearch && tool.name === 'brave_local_search') score += 0.4;
      } else {
          if (['perplexity_search_web', 'tavily-search'].includes(tool.name)) score += 0.2;
      }

      score *= stageFactor;
      const toolWasSuggestedBefore = previousSuggestions.some(s => s.name === tool.name);
      if (toolWasSuggestedBefore) {
        const prevSuggestion = previousSuggestions.find(s => s.name === tool.name);
        score *= (prevSuggestion && prevSuggestion.confidence > 0.7) ? 0.5 : 0.7;
      }

      return { tool, score };
    });

    // Filtrer et normaliser les résultats
    const minScore = reasoningStage === 'initial' ? 0.05 : 0.1;
    const suggestedTools = toolScores
      .filter(item => item.score > minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item, index) => ({
        name: item.tool.name,
        confidence: Math.min(Math.max(item.score, 0), 1),
        reason: verificationMode
          ? this.generateVerificationReason(item.tool, content)
          : this.generateReason(item.tool, content),
        priority: index + 1
      }));

    // Outil par défaut si aucun n'est trouvé
    if (suggestedTools.length === 0 && relevantTools.length > 0) {
      const defaultConfidence = verificationMode ? 0.5 * stageFactor : 0.3 * stageFactor;
      const defaultToolName = verificationMode ? 'tavily-search' : 'smartthinking'; // Default to smartthinking if not verification
      const defaultTool = this.knownTools.get(defaultToolName) || this.knownTools.get('tavily-search')!; // Fallback to tavily

      suggestedTools.push({
        name: defaultTool.name,
        confidence: Math.min(defaultConfidence, 1.0),
        reason: verificationMode
          ? 'Outil de recherche général pour la vérification des informations'
          : 'Aucun outil spécifique n\'a été identifié. Une recherche web ou une nouvelle pensée pourrait aider.',
        priority: 1
      });
    }

    return suggestedTools;
  }


  /**
   * Suggère des outils de vérification pertinents pour un contenu donné
   * @param content Le contenu pour lequel suggérer des outils
   * @param limit Le nombre maximum d'outils à suggérer
   * @returns Une promesse résolvant vers un tableau d'outils suggérés
   */
  public async suggestVerificationTools(content: string, limit: number = 3): Promise<SuggestedTool[]> {
    // Utilise suggestToolsGeneric en mode vérification
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
    // ... (implementation unchanged) ...
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
    // ... (implementation unchanged) ...
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

  // ... (Private methods for executing specific tools remain unchanged) ...
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
   * Suggère des outils pertinents pour un contenu donné (méthode publique principale)
   *
   * @param content Le contenu pour lequel suggérer des outils
   * @param limit Le nombre maximum d'outils à suggérer
   * @returns Une promesse résolvant vers un tableau d'outils suggérés
   */
  async suggestTools(content: string, limit: number = 3): Promise<SuggestedTool[]> {
    // Utilise suggestToolsGeneric en mode non-vérification
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
   * Génère une raison explicative pour la suggestion d'un outil (utilisé par l'heuristique)
   *
   * @param tool L'outil suggéré
   * @param content Le contenu pour lequel l'outil est suggéré
   * @returns Une raison explicative
   */
  private generateReason(tool: any, content: string): string {
    // ... (implementation unchanged) ...
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

      case 'list_files': // Updated name
        return 'Pour visualiser le contenu de ce répertoire local, cet outil permet de lister tous les fichiers et dossiers.';

      // case 'directory_tree': // Potentially use execute_command ls -R or similar
      //   return 'Pour comprendre la structure complète de ce répertoire, une visualisation arborescente serait utile.';

      // case 'create_directory': // Potentially use execute_command mkdir
      //   return 'Pour organiser les fichiers, la création de répertoires permettrait une meilleure structure.';

      // case 'move_file': // Potentially use execute_command mv
      //   return 'Pour réorganiser les fichiers, cet outil permet de déplacer ou renommer des éléments.';

      case 'search_files': // Use dedicated search_files tool
        return 'Pour trouver rapidement les fichiers correspondant à ce critère dans les fichiers locaux.';

      case 'read_file':
        return 'Cet outil permet de lire le contenu complet du fichier local spécifié.';

      case 'write_to_file': // Updated name
        return 'Pour créer ou modifier un fichier local avec le contenu spécifié.';

      case 'replace_in_file':
          return 'Pour effectuer des modifications ciblées dans un fichier local existant.';

      case 'uploadFile':
        return 'Pour transférer un fichier vers l\'environnement sandbox afin de l\'utiliser pour l\'exécution de code.';

      case 'readFile':
        return 'Pour lire le contenu d\'un fichier dans l\'environnement sandbox E2B.';

      case 'listFiles':
         return 'Pour visualiser le contenu du répertoire sandbox E2B.';

      case 'execute_command':
         return 'Pour exécuter une commande système ou un script sur la machine locale.';

      case 'smartthinking':
         return 'Pour ajouter une nouvelle pensée ou étape de raisonnement au graphe actuel.';

      case 'sequentialthinking':
          return 'Pour décomposer un problème complexe en étapes séquentielles et structurées.';


      default:
        // Si aucune personnalisation spécifique n'est applicable, utiliser le cas d'usage général
        return tool.useCase || `Utiliser ${tool.name} pour ${tool.description.toLowerCase()}`;
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
