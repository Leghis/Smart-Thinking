import { 
  Visualization,
  VisualizationNode, 
  VisualizationLink,
  ThoughtNode,
  ConnectionType
} from './types';
import { ThoughtGraph } from './thought-graph';

/**
 * Classe qui génère des visualisations du graphe de pensées
 */
export class Visualizer {
  // Couleurs associées aux types de pensées
  private thoughtTypeColors: Record<string, string> = {
    'regular': '#4285F4',    // Bleu
    'revision': '#EA4335',   // Rouge
    'meta': '#FBBC05',       // Jaune
    'hypothesis': '#34A853', // Vert
    'conclusion': '#9C27B0'  // Violet
  };
  
  // Couleurs associées aux types de connexions
  private connectionTypeColors: Record<ConnectionType, string> = {
    'supports': '#34A853',   // Vert
    'contradicts': '#EA4335', // Rouge
    'refines': '#4285F4',    // Bleu
    'branches': '#FBBC05',   // Jaune
    'derives': '#9C27B0',    // Violet
    'associates': '#757575'  // Gris
  };
  
  /**
   * Génère une visualisation du graphe de pensées
   * 
   * @param thoughtGraph Le graphe de pensées à visualiser
   * @param centerThoughtId Optionnel: l'ID de la pensée centrale (si non spécifié, utilise la plus récente)
   * @returns Une visualisation du graphe
   */
  generateVisualization(thoughtGraph: ThoughtGraph, centerThoughtId?: string): Visualization {
    const thoughts = thoughtGraph.getAllThoughts();
    
    if (thoughts.length === 0) {
      return {
        nodes: [],
        links: [],
        metadata: {
          isEmpty: true
        }
      };
    }
    
    // Si aucun ID central n'est spécifié, utiliser la pensée la plus récente
    if (!centerThoughtId) {
      const recentThoughts = thoughtGraph.getRecentThoughts(1);
      centerThoughtId = recentThoughts[0]?.id;
    }
    
    // Créer les nœuds de visualisation
    const nodes: VisualizationNode[] = thoughts.map(thought => {
      // Calculer la taille du nœud en fonction du nombre de connexions
      const connectionCount = thought.connections.length;
      const size = 10 + Math.min(connectionCount * 2, 15);
      
      // Obtenir la couleur en fonction du type de pensée
      const color = this.thoughtTypeColors[thought.type] || '#757575';
      
      return {
        id: thought.id,
        label: this.truncateText(thought.content, 40),
        type: thought.type,
        metrics: thought.metrics,
        size,
        color
      };
    });
    
    // Créer les liens de visualisation
    const links: VisualizationLink[] = [];
    
    // Pour chaque pensée, ajouter ses connexions comme liens
    for (const thought of thoughts) {
      for (const connection of thought.connections) {
        // Éviter les doublons (chaque lien ne doit apparaître qu'une fois)
        const linkExists = links.some(link => 
          (link.source === thought.id && link.target === connection.targetId) || 
          (link.source === connection.targetId && link.target === thought.id)
        );
        
        if (!linkExists) {
          // Calculer l'épaisseur du lien en fonction de la force de la connexion
          const width = 1 + connection.strength * 4;
          
          // Obtenir la couleur en fonction du type de connexion
          const color = this.connectionTypeColors[connection.type] || '#757575';
          
          links.push({
            source: thought.id,
            target: connection.targetId,
            type: connection.type,
            strength: connection.strength,
            width,
            color
          });
        }
      }
    }
    
    // Génération de métadonnées pour la visualisation
    const metadata = this.generateMetadata(thoughts, links, centerThoughtId);
    
    return {
      nodes,
      links,
      metadata
    };
  }
  
  /**
   * Génère une visualisation chronologique du graphe de pensées
   * 
   * @param thoughtGraph Le graphe de pensées à visualiser
   * @returns Une visualisation chronologique du graphe
   */
  generateChronologicalVisualization(thoughtGraph: ThoughtGraph): Visualization {
    const thoughts = thoughtGraph.getAllThoughts()
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    if (thoughts.length === 0) {
      return {
        nodes: [],
        links: [],
        metadata: {
          isEmpty: true
        }
      };
    }
    
    // Créer les nœuds de visualisation
    const nodes: VisualizationNode[] = thoughts.map((thought, index) => {
      // Calculer la taille du nœud en fonction de l'ordre chronologique
      // Les pensées plus récentes sont légèrement plus grandes
      const size = 10 + Math.min(index * 0.5, 10);
      
      // Obtenir la couleur en fonction du type de pensée
      const color = this.thoughtTypeColors[thought.type] || '#757575';
      
      return {
        id: thought.id,
        label: this.truncateText(thought.content, 40),
        type: thought.type,
        metrics: thought.metrics,
        size,
        color
      };
    });
    
    // Créer les liens chronologiques
    const links: VisualizationLink[] = [];
    
    // Connecter chaque pensée à la suivante chronologiquement
    for (let i = 0; i < thoughts.length - 1; i++) {
      links.push({
        source: thoughts[i].id,
        target: thoughts[i + 1].id,
        type: 'associates',
        strength: 0.5,
        width: 1,
        color: '#757575'
      });
    }
    
    // Ajouter également les connexions explicites
    for (const thought of thoughts) {
      for (const connection of thought.connections) {
        // Éviter les doublons (chaque lien ne doit apparaître qu'une fois)
        const linkExists = links.some(link => 
          (link.source === thought.id && link.target === connection.targetId) || 
          (link.source === connection.targetId && link.target === thought.id)
        );
        
        if (!linkExists) {
          // Calculer l'épaisseur du lien en fonction de la force de la connexion
          const width = 1 + connection.strength * 3;
          
          // Obtenir la couleur en fonction du type de connexion
          const color = this.connectionTypeColors[connection.type] || '#757575';
          
          links.push({
            source: thought.id,
            target: connection.targetId,
            type: connection.type,
            strength: connection.strength,
            width,
            color
          });
        }
      }
    }
    
    // Génération de métadonnées pour la visualisation
    const metadata = {
      type: 'chronological',
      thoughtCount: thoughts.length,
      timeline: thoughts.map(thought => ({
        id: thought.id,
        timestamp: thought.timestamp.toISOString()
      }))
    };
    
    return {
      nodes,
      links,
      metadata
    };
  }
  
  /**
   * Génère une visualisation thématique du graphe de pensées
   * 
   * @param thoughtGraph Le graphe de pensées à visualiser
   * @returns Une visualisation thématique du graphe
   */
  generateThematicVisualization(thoughtGraph: ThoughtGraph): Visualization {
    const thoughts = thoughtGraph.getAllThoughts();
    
    if (thoughts.length === 0) {
      return {
        nodes: [],
        links: [],
        metadata: {
          isEmpty: true
        }
      };
    }
    
    // Extraire les thèmes (mots-clés) des pensées
    const themes = this.extractThemes(thoughts);
    
    // Associer chaque pensée à ses thèmes
    const thoughtThemes: Record<string, string[]> = {};
    
    for (const thought of thoughts) {
      thoughtThemes[thought.id] = themes.filter(theme => 
        thought.content.toLowerCase().includes(theme.toLowerCase())
      );
    }
    
    // Créer les nœuds de visualisation
    const nodes: VisualizationNode[] = thoughts.map(thought => {
      // Obtenir la couleur en fonction du type de pensée
      const color = this.thoughtTypeColors[thought.type] || '#757575';
      
      // La taille dépend du nombre de thèmes associés
      const themeCount = thoughtThemes[thought.id].length;
      const size = 10 + Math.min(themeCount * 2, 15);
      
      return {
        id: thought.id,
        label: this.truncateText(thought.content, 40),
        type: thought.type,
        metrics: thought.metrics,
        size,
        color
      };
    });
    
    // Créer les liens thématiques
    const links: VisualizationLink[] = [];
    
    // Connecter les pensées qui partagent des thèmes
    for (let i = 0; i < thoughts.length; i++) {
      for (let j = i + 1; j < thoughts.length; j++) {
        const thoughtA = thoughts[i];
        const thoughtB = thoughts[j];
        
        // Trouver les thèmes communs
        const themesA = thoughtThemes[thoughtA.id];
        const themesB = thoughtThemes[thoughtB.id];
        
        const commonThemes = themesA.filter(theme => themesB.includes(theme));
        
        // S'il y a des thèmes communs, créer un lien
        if (commonThemes.length > 0) {
          // La force dépend du nombre de thèmes communs
          const strength = Math.min(0.3 + commonThemes.length * 0.1, 0.9);
          
          links.push({
            source: thoughtA.id,
            target: thoughtB.id,
            type: 'associates',
            strength,
            width: 1 + commonThemes.length,
            color: '#757575'
          });
        }
      }
    }
    
    // Génération de métadonnées pour la visualisation
    const metadata = {
      type: 'thematic',
      thoughtCount: thoughts.length,
      themes,
      themeAssociations: Object.entries(thoughtThemes).map(([id, themeList]) => ({
        id,
        themes: themeList
      }))
    };
    
    return {
      nodes,
      links,
      metadata
    };
  }
  
  /**
   * Génère des métadonnées pour la visualisation
   * 
   * @param thoughts Les pensées du graphe
   * @param links Les liens de la visualisation
   * @param centerThoughtId L'ID de la pensée centrale
   * @returns Les métadonnées de la visualisation
   */
  private generateMetadata(
    thoughts: ThoughtNode[],
    links: VisualizationLink[],
    centerThoughtId?: string
  ): Record<string, any> {
    // Compter les types de pensées
    const thoughtTypeCount: Record<string, number> = {};
    
    for (const thought of thoughts) {
      thoughtTypeCount[thought.type] = (thoughtTypeCount[thought.type] || 0) + 1;
    }
    
    // Compter les types de connexions
    const connectionTypeCount: Record<string, number> = {};
    
    for (const link of links) {
      connectionTypeCount[link.type] = (connectionTypeCount[link.type] || 0) + 1;
    }
    
    // Identifier la pensée centrale
    const centerThought = centerThoughtId 
      ? thoughts.find(t => t.id === centerThoughtId)
      : thoughts[thoughts.length - 1];
    
    return {
      type: 'graph',
      thoughtCount: thoughts.length,
      linkCount: links.length,
      thoughtTypeDistribution: thoughtTypeCount,
      connectionTypeDistribution: connectionTypeCount,
      centerThought: centerThought ? {
        id: centerThought.id,
        type: centerThought.type
      } : undefined
    };
  }
  
  /**
   * Tronque un texte à une longueur maximale
   * 
   * @param text Le texte à tronquer
   * @param maxLength La longueur maximale
   * @returns Le texte tronqué
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Extrait les thèmes (mots-clés) des pensées
   * 
   * @param thoughts Les pensées dont extraire les thèmes
   * @returns Un tableau de thèmes
   */
  private extractThemes(thoughts: ThoughtNode[]): string[] {
    // Liste de mots courants à ignorer (stop words)
    const stopWords = [
      'le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cette', 'ces',
      'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui',
      'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par',
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
      'est', 'sont', 'être', 'avoir', 'fait', 'faire',
      'plus', 'moins', 'très', 'trop', 'peu', 'beaucoup'
    ];
    
    // Extraire tous les mots de toutes les pensées
    const allWords = thoughts.flatMap(thought => 
      thought.content.toLowerCase()
        .split(/\W+/)
        .filter(word => 
          word.length > 4 && 
          !stopWords.includes(word)
        )
    );
    
    // Compter l'occurrence de chaque mot
    const wordCount: Record<string, number> = {};
    
    for (const word of allWords) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
    
    // Sélectionner les mots qui apparaissent au moins 2 fois
    const themes = Object.entries(wordCount)
      .filter(([_, count]) => count >= 2)
      .sort(([_, countA], [__, countB]) => countB - countA)
      .map(([word, _]) => word)
      .slice(0, 10); // Limiter aux 10 thèmes les plus fréquents
    
    return themes;
  }
}