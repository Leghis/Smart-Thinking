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
    // Ces outils sont basés sur les outils MCP courants disponibles dans Claude
    this.knownTools.set('perplexity_search_web', {
      name: 'perplexity_search_web',
      description: 'Recherche web avec Perplexity AI et filtrage de récence',
      keywords: ['recherche', 'web', 'internet', 'information', 'récent', 'actualité', 'perplexity'],
      useCase: 'Utiliser pour rechercher des informations sur le web, particulièrement des informations récentes'
    });
    
    this.knownTools.set('brave_web_search', {
      name: 'brave_web_search',
      description: 'Recherche web avec l\'API Brave Search',
      keywords: ['recherche', 'web', 'internet', 'information', 'brave'],
      useCase: 'Utiliser pour des requêtes générales, des nouvelles, des articles et du contenu en ligne'
    });
    
    this.knownTools.set('brave_local_search', {
      name: 'brave_local_search',
      description: 'Recherche d\'entreprises et de lieux locaux avec l\'API Brave Local Search',
      keywords: ['recherche', 'local', 'entreprise', 'lieu', 'adresse', 'proximité'],
      useCase: 'Utiliser pour trouver des entreprises, restaurants, services, etc. à proximité d\'un lieu'
    });
    
    this.knownTools.set('read_file', {
      name: 'read_file',
      description: 'Lire le contenu d\'un fichier',
      keywords: ['fichier', 'lecture', 'contenu', 'texte', 'document'],
      useCase: 'Utiliser pour examiner le contenu d\'un fichier'
    });
    
    this.knownTools.set('write_file', {
      name: 'write_file',
      description: 'Créer ou écraser un fichier avec un nouveau contenu',
      keywords: ['fichier', 'écriture', 'création', 'contenu', 'texte', 'document'],
      useCase: 'Utiliser pour créer ou mettre à jour un fichier avec un nouveau contenu'
    });
    
    this.knownTools.set('run_code', {
      name: 'run_code',
      description: 'Exécuter du code Python dans un bac à sable sécurisé',
      keywords: ['code', 'python', 'exécution', 'programmation', 'calcul', 'script'],
      useCase: 'Utiliser pour exécuter du code Python, faire des calculs ou des analyses de données'
    });
    
    this.knownTools.set('tavily-search', {
      name: 'tavily-search',
      description: 'Outil de recherche web puissant avec Tavily AI',
      keywords: ['recherche', 'web', 'internet', 'information', 'tavily', 'ai'],
      useCase: 'Utiliser pour des recherches web complètes et détaillées avec capacités d\'IA'
    });
    
    this.knownTools.set('sequentialthinking', {
      name: 'sequentialthinking',
      description: 'Outil de réflexion séquentielle pour résolution de problèmes',
      keywords: ['réflexion', 'pensée', 'séquentiel', 'étape', 'problème', 'raisonnement'],
      useCase: 'Utiliser pour une résolution de problèmes par étapes, avec révision et ramification possibles'
    });
  }
  
  /**
   * Suggère des outils pertinents pour un contenu donné
   * 
   * @param content Le contenu pour lequel suggérer des outils
   * @param limit Le nombre maximum d'outils à suggérer
   * @returns Un tableau d'outils suggérés
   */
  suggestTools(content: string, limit: number = 3): SuggestedTool[] {
    // Convertir le contenu en mots-clés
    const contentWords = content.toLowerCase().split(/\W+/).filter(word => word.length > 3);
    
    // Analyse du contenu pour détecter des intentions/besoins spécifiques
    const needsWebSearch = this.containsAny(content.toLowerCase(), ['recherche', 'trouve', 'cherche', 'information', 'récent', 'actualité']);
    const needsCodeExecution = this.containsAny(content.toLowerCase(), ['code', 'calcul', 'programme', 'python', 'script', 'algorithme']);
    const needsFileOperation = this.containsAny(content.toLowerCase(), ['fichier', 'document', 'lecture', 'écriture', 'sauvegarde']);
    const needsLocalSearch = this.containsAny(content.toLowerCase(), ['local', 'près', 'proximité', 'entreprise', 'restaurant', 'magasin']);
    
    // Calculer un score pour chaque outil
    const toolScores = Array.from(this.knownTools.values()).map(tool => {
      // Score basé sur la correspondance de mots-clés
      const matchingKeywords = tool.keywords.filter(keyword => 
        contentWords.includes(keyword) || content.toLowerCase().includes(keyword)
      );
      
      // Score de base
      let score = matchingKeywords.length / Math.max(tool.keywords.length, 1);
      
      // Ajustements basés sur l'intention détectée
      if (needsWebSearch && ['perplexity_search_web', 'brave_web_search', 'tavily-search'].includes(tool.name)) {
        score += 0.3;
      }
      
      if (needsCodeExecution && tool.name === 'run_code') {
        score += 0.4;
      }
      
      if (needsFileOperation && ['read_file', 'write_file'].includes(tool.name)) {
        score += 0.3;
      }
      
      if (needsLocalSearch && tool.name === 'brave_local_search') {
        score += 0.4;
      }
      
      // Priorité spéciale pour certains outils selon le contexte
      if (content.toLowerCase().includes('actualité') && tool.name === 'perplexity_search_web') {
        score += 0.2;
      }
      
      if (content.toLowerCase().includes('données') && tool.name === 'run_code') {
        score += 0.2;
      }
      
      return {
        tool,
        score
      };
    });
    
    // Filtrer les outils avec un score minimum et trier par score
    const minScore = 0.1;
    const suggestedTools = toolScores
      .filter(item => item.score > minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item, index) => {
        return {
          name: item.tool.name,
          confidence: Math.min(Math.max(item.score, 0), 1), // Limiter entre 0 et 1
          reason: this.generateReason(item.tool, content),
          priority: index + 1
        };
      });
    
    // Si aucun outil n'a été trouvé pertinent, suggérer l'outil de recherche par défaut
    if (suggestedTools.length === 0) {
      suggestedTools.push({
        name: 'tavily-search',
        confidence: 0.5,
        reason: 'Aucun outil spécifique n\'a été identifié comme fortement pertinent. Une recherche web générale pourrait aider à explorer ce sujet.',
        priority: 1
      });
    }
    
    return suggestedTools;
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
    
    // Raisons génériques adaptées au type d'outil
    if (tool.name === 'perplexity_search_web') {
      if (isQuestion) {
        return 'Cette question nécessite des informations récentes que Perplexity peut fournir efficacement.';
      } else if (isTopic) {
        return 'Ce sujet mérite une exploration avec Perplexity pour obtenir des informations à jour.';
      } else {
        return 'Perplexity peut aider à trouver des informations récentes et pertinentes sur ce sujet.';
      }
    }
    
    if (tool.name === 'run_code') {
      if (isComplex) {
        return 'Ce problème complexe pourrait bénéficier d\'une analyse par code Python pour des calculs ou du traitement de données.';
      } else {
        return 'L\'exécution de code Python pourrait aider à résoudre ce problème ou à illustrer ce concept.';
      }
    }
    
    // Si aucune personnalisation spécifique n'est applicable, utiliser le cas d'usage général
    return tool.useCase;
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