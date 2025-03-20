import {
  Visualization,
  VisualizationNode,
  VisualizationLink,
  VisualizationCluster,
  ThoughtNode,
  ConnectionType,
  InteractivityOptions,
  FilterOptions,
  LayoutOptions, ThoughtType, ThoughtMetrics
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
        color,
        tooltip: thought.content,
        highlighted: thought.id === centerThoughtId
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
            color,
            tooltip: connection.description
          });
        }
      }
    }
    
    // Génération de métadonnées pour la visualisation
    const metadata = this.generateMetadata(thoughts, links, centerThoughtId);
    
    // Options d'interactivité par défaut
    const interactivity: InteractivityOptions = {
      zoomable: true,
      draggable: true,
      selectable: true,
      tooltips: true,
      expandableNodes: true,
      initialZoom: 1,
      zoomRange: [0.5, 2],
      highlightOnHover: true
    };
    
    // Options de mise en page par défaut
    const layout: LayoutOptions = {
      type: 'force',
      forceStrength: 0.5,
      spacing: 100
    };
    
    return {
      nodes,
      links,
      interactivity,
      layout,
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
        color,
        tooltip: thought.content,
        level: index
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
        color: '#757575',
        tooltip: 'Progression chronologique'
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
            color,
            tooltip: connection.description || `Connexion de type ${connection.type}`
          });
        }
      }
    }
    
    // Options d'interactivité par défaut
    const interactivity: InteractivityOptions = {
      zoomable: true,
      draggable: true,
      selectable: true,
      tooltips: true,
      expandableNodes: true,
      initialZoom: 1,
      zoomRange: [0.5, 2],
      highlightOnHover: true
    };
    
    // Options de mise en page
    const layout: LayoutOptions = {
      type: 'chronological',
      spacing: 50
    };
    
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
      interactivity,
      layout,
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
        color,
        tooltip: thought.content,
        metadata: {
          themes: thoughtThemes[thought.id]
        }
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
            color: '#757575',
            tooltip: `Thèmes partagés: ${commonThemes.join(', ')}`
          });
        }
      }
    }
    
    // Générer des clusters thématiques
    const clusters = this.generateClusters(thoughts, 'theme');
    
    // Options d'interactivité
    const interactivity: InteractivityOptions = {
      zoomable: true,
      draggable: true,
      selectable: true,
      tooltips: true,
      expandableNodes: true,
      initialZoom: 1,
      zoomRange: [0.5, 2],
      highlightOnHover: true
    };
    
    // Options de mise en page
    const layout: LayoutOptions = {
      type: 'thematic',
      spacing: 80
    };
    
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
      clusters,
      interactivity,
      layout,
      metadata
    };
  }

  /**
   * Génère une couleur distincte pour un index donné
   */
  private getDistinctColor(index: number): string {
    const colors = [
      '#4285F4', '#EA4335', '#FBBC05', '#34A853', '#9C27B0',
      '#00ACC1', '#FF9800', '#795548', '#607D8B', '#3949AB'
    ];
    
    return colors[index % colors.length];
  }

  /**
   * Génère des clusters à partir des nœuds du graphe
   * 
   * @param thoughts Les pensées à regrouper en clusters
   * @param clusterBy Critère de regroupement ('type', 'theme', 'metric', 'connectivity')
   * @returns Les clusters générés
   */
  private generateClusters(
    thoughts: ThoughtNode[],
    clusterBy: 'type' | 'theme' | 'metric' | 'connectivity' = 'type'
  ): VisualizationCluster[] {
    const clusters: VisualizationCluster[] = [];
    
    switch (clusterBy) {
      case 'type':
        // Regrouper par type de pensée
        const typeGroups: Record<string, string[]> = {};
        thoughts.forEach(thought => {
          if (!typeGroups[thought.type]) {
            typeGroups[thought.type] = [];
          }
          typeGroups[thought.type].push(thought.id);
        });
        
        // Créer un cluster pour chaque type
        Object.entries(typeGroups).forEach(([type, nodeIds], index) => {
          clusters.push({
            id: `cluster-${type}`,
            label: `Pensées de type ${type}`,
            nodeIds,
            color: this.thoughtTypeColors[type] || '#757575',
            expanded: true,
            level: 1 // Premier niveau de hiérarchie
          });
        });
        break;
        
      case 'theme':
        // Extraire les thèmes puis regrouper par thème principal
        const themes = this.extractThemes(thoughts);
        const themeGroups: Record<string, string[]> = {};
        
        // Associer chaque pensée à son thème dominant
        thoughts.forEach(thought => {
          const content = thought.content.toLowerCase();
          const dominantTheme = themes.find(theme => content.includes(theme)) || 'other';
          
          if (!themeGroups[dominantTheme]) {
            themeGroups[dominantTheme] = [];
          }
          themeGroups[dominantTheme].push(thought.id);
        });
        
        // Créer un cluster pour chaque thème
        Object.entries(themeGroups).forEach(([theme, nodeIds], index) => {
          clusters.push({
            id: `cluster-theme-${index}`,
            label: `Thème: ${theme}`,
            nodeIds,
            color: this.getDistinctColor(index),
            expanded: true,
            level: 1
          });
        });
        break;
        
      case 'metric':
        // Regrouper par niveau de qualité
        const qualityGroups: Record<string, string[]> = {
          'high': [], // Qualité > 0.7
          'medium': [], // Qualité entre 0.4 et 0.7
          'low': [] // Qualité < 0.4
        };
        
        thoughts.forEach(thought => {
          if (thought.metrics.quality > 0.7) {
            qualityGroups['high'].push(thought.id);
          } else if (thought.metrics.quality > 0.4) {
            qualityGroups['medium'].push(thought.id);
          } else {
            qualityGroups['low'].push(thought.id);
          }
        });
        
        // Créer un cluster pour chaque niveau de qualité
        clusters.push({
          id: 'cluster-quality-high',
          label: 'Qualité élevée',
          nodeIds: qualityGroups['high'],
          color: '#34A853', // Vert
          expanded: true,
          level: 1
        });
        
        clusters.push({
          id: 'cluster-quality-medium',
          label: 'Qualité moyenne',
          nodeIds: qualityGroups['medium'],
          color: '#FBBC05', // Jaune
          expanded: true,
          level: 1
        });
        
        clusters.push({
          id: 'cluster-quality-low',
          label: 'Qualité basse',
          nodeIds: qualityGroups['low'],
          color: '#EA4335', // Rouge
          expanded: true,
          level: 1
        });
        break;
        
      case 'connectivity':
        // Regrouper par densité de connexions
        const connectivityGroups: Record<string, string[]> = {
          'high': [], // Plus de 3 connexions
          'medium': [], // 1-3 connexions
          'isolated': [] // Aucune connexion
        };
        
        thoughts.forEach(thought => {
          if (thought.connections.length > 3) {
            connectivityGroups['high'].push(thought.id);
          } else if (thought.connections.length >= 1) {
            connectivityGroups['medium'].push(thought.id);
          } else {
            connectivityGroups['isolated'].push(thought.id);
          }
        });
        
        // Créer un cluster pour chaque niveau de connectivité
        clusters.push({
          id: 'cluster-connectivity-high',
          label: 'Forte connectivité',
          nodeIds: connectivityGroups['high'],
          color: '#4285F4', // Bleu
          expanded: true,
          level: 1
        });
        
        clusters.push({
          id: 'cluster-connectivity-medium',
          label: 'Connectivité moyenne',
          nodeIds: connectivityGroups['medium'],
          color: '#9C27B0', // Violet
          expanded: true,
          level: 1
        });
        
        clusters.push({
          id: 'cluster-connectivity-isolated',
          label: 'Nœuds isolés',
          nodeIds: connectivityGroups['isolated'],
          color: '#757575', // Gris
          expanded: true,
          level: 1
        });
        break;
    }
    
    return clusters;
  }

  /**
   * Génère une visualisation hiérarchique du graphe de pensées
   * 
   * @param thoughtGraph Le graphe de pensées à visualiser
   * @param rootId Optionnel: l'ID du nœud racine
   * @param options Options de visualisation
   * @returns Une visualisation hiérarchique du graphe
   */
  generateHierarchicalVisualization(
    thoughtGraph: ThoughtGraph, 
    rootId?: string,
    options: {
      direction?: 'TB' | 'BT' | 'LR' | 'RL',
      levelSeparation?: number,
      clusterBy?: 'type' | 'theme' | 'metric' | 'connectivity'
    } = {}
  ): Visualization {
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
    
    // Déterminer la racine
    let rootThought: ThoughtNode | undefined;
    if (rootId) {
      rootThought = thoughts.find(t => t.id === rootId);
    }
    
    if (!rootThought) {
      // Si pas de racine spécifiée, utiliser la pensée avec le plus de connexions sortantes
      rootThought = thoughts.reduce((max, current) => 
        (current.connections.length > max.connections.length) ? current : max, 
        thoughts[0]
      );
    }
    
    // Créer les nœuds avec des niveaux hiérarchiques
    const nodes: VisualizationNode[] = [];
    const visited = new Set<string>();
    const queue: { thought: ThoughtNode, level: number }[] = [{ thought: rootThought, level: 0 }];
    
    while (queue.length > 0) {
      const { thought, level } = queue.shift()!;
      
      if (visited.has(thought.id)) continue;
      visited.add(thought.id);
      
      // Ajouter le nœud avec son niveau hiérarchique
      nodes.push({
        id: thought.id,
        label: this.truncateText(thought.content, 40),
        type: thought.type,
        metrics: thought.metrics,
        size: 10 + Math.min(thought.connections.length * 2, 15),
        color: this.thoughtTypeColors[thought.type] || '#757575',
        level,
        tooltip: thought.content,
        collapsed: level > 2 // Replier automatiquement les niveaux profonds
      });
      
      // Ajouter les pensées connectées à la file
      const connectedThoughts = thoughtGraph.getConnectedThoughts(thought.id);
      for (const connectedThought of connectedThoughts) {
        if (!visited.has(connectedThought.id)) {
          queue.push({ thought: connectedThought, level: level + 1 });
        }
      }
    }
    
    // Créer les liens
    const links: VisualizationLink[] = [];
    
    for (const node of nodes) {
      const thought = thoughts.find(t => t.id === node.id);
      if (!thought) continue;
      
      for (const connection of thought.connections) {
        // Ne montrer que les liens entre nœuds visibles
        if (nodes.some(n => n.id === connection.targetId)) {
          // Éviter les doublons
          const linkExists = links.some(link => 
            (link.source === thought.id && link.target === connection.targetId) || 
            (link.source === connection.targetId && link.target === thought.id)
          );
          
          if (!linkExists) {
            links.push({
              source: thought.id,
              target: connection.targetId,
              type: connection.type,
              strength: connection.strength,
              width: 1 + connection.strength * 3,
              color: this.connectionTypeColors[connection.type] || '#757575',
              dashed: connection.type === 'associates', // Ligne pointillée pour les liens faibles
              tooltip: connection.description
            });
          }
        }
      }
    }
    
    // Générer des clusters si demandé
    let clusters: VisualizationCluster[] | undefined;
    if (options.clusterBy) {
      clusters = this.generateClusters(thoughts, options.clusterBy);
    }
    
    // Paramètres d'interactivité
    const interactivity: InteractivityOptions = {
      zoomable: true,
      draggable: true,
      selectable: true,
      tooltips: true,
      expandableNodes: true,
      initialZoom: 1,
      zoomRange: [0.5, 2],
      highlightOnHover: true
    };
    
    // Options de mise en page
    const layout: LayoutOptions = {
      type: 'hierarchical',
      direction: options.direction || 'TB',
      levelSeparation: options.levelSeparation || 100,
      spacing: 80
    };
    
    // Métadonnées supplémentaires
    const metadata = {
      type: 'hierarchical',
      thoughtCount: thoughts.length,
      nodeCount: nodes.length,
      linkCount: links.length,
      maxLevel: Math.max(...nodes.map(n => n.level || 0)),
      rootId: rootThought.id
    };
    
    return {
      nodes,
      links,
      clusters,
      interactivity,
      layout,
      metadata
    };
  }

  /**
   * Génère une visualisation force-directed du graphe de pensées
   * 
   * @param thoughtGraph Le graphe de pensées à visualiser
   * @param options Options de visualisation
   * @returns Une visualisation force-directed du graphe
   */
  generateForceDirectedVisualization(
    thoughtGraph: ThoughtGraph,
    options: {
      clusterBy?: 'type' | 'theme' | 'metric' | 'connectivity',
      forceStrength?: number,
      centerNode?: string
    } = {}
  ): Visualization {
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
    
    // Créer les nœuds
    const nodes: VisualizationNode[] = thoughts.map(thought => {
      // Calculer la taille du nœud en fonction du nombre de connexions
      const connectionCount = thought.connections.length;
      const size = 10 + Math.min(connectionCount * 2, 15);
      
      // Obtenir la couleur en fonction du type de pensée
      const color = this.thoughtTypeColors[thought.type] || '#757575';
      
      // Assigner une importance basée sur la métrique de qualité
      const importance = 0.5 + (thought.metrics.quality * 0.5);
      
      return {
        id: thought.id,
        label: this.truncateText(thought.content, 40),
        type: thought.type,
        metrics: thought.metrics,
        size,
        color,
        tooltip: thought.content,
        highlighted: thought.id === options.centerNode,
        metadata: {
          importance,
          connectionCount
        }
      };
    });
    
    // Créer les liens avec des poids pour l'algorithme force-directed
    const links: VisualizationLink[] = [];
    
    for (const thought of thoughts) {
      for (const connection of thought.connections) {
        // Éviter les doublons
        const linkExists = links.some(link => 
          (link.source === thought.id && link.target === connection.targetId) || 
          (link.source === connection.targetId && link.target === thought.id)
        );
        
        if (!linkExists) {
          // Calculer le poids pour l'algorithme force-directed
          // Les connexions fortes ont un poids plus élevé (plus d'attraction)
          const weight = connection.strength * 2;
          
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
            color,
            weight,
            dashed: connection.type === 'associates',
            bidirectional: connection.type === 'contradicts',
            tooltip: connection.description || `Connexion de type ${connection.type}`
          });
        }
      }
    }
    
    // Générer des clusters si demandé
    let clusters: VisualizationCluster[] | undefined;
    if (options.clusterBy) {
      clusters = this.generateClusters(thoughts, options.clusterBy);
    }
    
    // Paramètres d'interactivité
    const interactivity: InteractivityOptions = {
      zoomable: true,
      draggable: true,
      selectable: true,
      tooltips: true,
      expandableNodes: true,
      initialZoom: 1,
      zoomRange: [0.2, 3],
      highlightOnHover: true
    };
    
    // Options de mise en page
    const layout: LayoutOptions = {
      type: 'force',
      forceStrength: options.forceStrength || 0.5,
      spacing: 100,
      centerNode: options.centerNode
    };
    
    // Métadonnées
    const metadata = {
      type: 'force-directed',
      thoughtCount: thoughts.length,
      nodeCount: nodes.length,
      linkCount: links.length,
      averageConnections: thoughts.reduce((sum, t) => sum + t.connections.length, 0) / thoughts.length,
      centerNode: options.centerNode
    };
    
    return {
      nodes,
      links,
      clusters,
      interactivity,
      layout,
      metadata
    };
  }

  /**
   * Génère une visualisation radiale du graphe de pensées
   * 
   * @param thoughtGraph Le graphe de pensées à visualiser
   * @param centerNodeId Optionnel: l'ID du nœud central (si non spécifié, utilise le nœud avec le plus de connexions)
   * @param options Options de visualisation
   * @returns Une visualisation radiale du graphe
   */
  generateRadialVisualization(
    thoughtGraph: ThoughtGraph,
    centerNodeId?: string,
    options: {
      maxDepth?: number,
      radialDistance?: number
    } = {}
  ): Visualization {
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
    
    // Déterminer le nœud central
    let centerThought: ThoughtNode | undefined;
    if (centerNodeId) {
      centerThought = thoughts.find(t => t.id === centerNodeId);
    }
    
    if (!centerThought) {
      // Si pas de nœud central spécifié, utiliser celui avec le plus de connexions
      centerThought = thoughts.reduce(
        (max, current) => current.connections.length > max.connections.length ? current : max,
        thoughts[0]
      );
    }
    
    // Configuration des cercles concentriques
    const maxDepth = options.maxDepth || 3;
    const radialDistance = options.radialDistance || 120;
    
    // Map pour stocker le niveau radial de chaque nœud
    const radialLevels = new Map<string, number>();
    radialLevels.set(centerThought.id, 0);
    
    // Calculer les niveaux radiaux par BFS
    const queue: { id: string, level: number }[] = [
      { id: centerThought.id, level: 0 }
    ];
    const visited = new Set<string>([centerThought.id]);
    
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      
      if (level >= maxDepth) continue;
      
      const thought = thoughts.find(t => t.id === id);
      if (!thought) continue;
      
      for (const connection of thought.connections) {
        if (!visited.has(connection.targetId)) {
          visited.add(connection.targetId);
          radialLevels.set(connection.targetId, level + 1);
          queue.push({ id: connection.targetId, level: level + 1 });
        }
      }
    }
    
    // Créer les nœuds
    const nodes: VisualizationNode[] = [];
    
    // Compter le nombre de nœuds à chaque niveau
    const levelCounts: Record<number, number> = {};
    for (const level of radialLevels.values()) {
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    }
    
    // Positions angulaires à chaque niveau
    const levelAngles: Record<string, number> = {};
    
    // Ajouter le nœud central
    nodes.push({
      id: centerThought.id,
      label: this.truncateText(centerThought.content, 40),
      type: centerThought.type,
      metrics: centerThought.metrics,
      size: 15, // Nœud central plus grand
      color: this.thoughtTypeColors[centerThought.type] || '#757575',
      position: { x: 0, y: 0 }, // Au centre
      tooltip: centerThought.content,
      highlighted: true
    });
    
    // Ajouter les nœuds aux différents niveaux radiaux
    for (const thought of thoughts) {
      if (thought.id === centerThought.id) continue; // Déjà ajouté
      
      const level = radialLevels.get(thought.id);
      if (level === undefined || level > maxDepth) continue; // Hors de la profondeur maximale
      
      // Calculer l'angle pour ce nœud
      const angleKey = `${thought.id}-${level}`;
      if (!levelAngles[angleKey]) {
        levelAngles[angleKey] = 2 * Math.PI * (Object.keys(levelAngles).filter(key => key.endsWith(`-${level}`)).length) / levelCounts[level];
      }
      const angle = levelAngles[angleKey];
      
      // Calculer la position radiale
      const radius = level * radialDistance;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      nodes.push({
        id: thought.id,
        label: this.truncateText(thought.content, 40),
        type: thought.type,
        metrics: thought.metrics,
        size: 10 + Math.min(thought.connections.length, 8),
        color: this.thoughtTypeColors[thought.type] || '#757575',
        position: { x, y },
        tooltip: thought.content,
        level
      });
    }
    
    // Créer les liens
    const links: VisualizationLink[] = [];
    
    // Ajouter uniquement les liens entre les nœuds visibles
    const visibleNodeIds = nodes.map(n => n.id);
    
    for (const thought of thoughts) {
      if (!visibleNodeIds.includes(thought.id)) continue;
      
      for (const connection of thought.connections) {
        if (visibleNodeIds.includes(connection.targetId)) {
          // Éviter les doublons
          const linkExists = links.some(link => 
            (link.source === thought.id && link.target === connection.targetId) || 
            (link.source === connection.targetId && link.target === thought.id)
          );
          
          if (!linkExists) {
            // Obtenir les niveaux radiaux des nœuds
            const sourceLevel = radialLevels.get(thought.id) || 0;
            const targetLevel = radialLevels.get(connection.targetId) || 0;
            
            // Les liens entre niveaux adjacents sont plus courts et plus épais
            const levelDifference = Math.abs(sourceLevel - targetLevel);
            const width = 1 + (3 / (levelDifference || 1)) * connection.strength;
            
            links.push({
              source: thought.id,
              target: connection.targetId,
              type: connection.type,
              strength: connection.strength,
              width,
              color: this.connectionTypeColors[connection.type] || '#757575',
              dashed: levelDifference > 1, // Ligne pointillée pour les liens traversant plusieurs niveaux
              animated: thought.id === centerThought.id || connection.targetId === centerThought.id,
              tooltip: connection.description || `Connexion de type ${connection.type}`
            });
          }
        }
      }
    }
    
    // Paramètres d'interactivité
    const interactivity: InteractivityOptions = {
      zoomable: true,
      draggable: true,
      selectable: true,
      tooltips: true,
      expandableNodes: true,
      initialZoom: 1,
      zoomRange: [0.5, 2],
      highlightOnHover: true
    };
    
    // Options de mise en page
    const layout: LayoutOptions = {
      type: 'radial',
      centerNode: centerThought.id,
      spacing: radialDistance
    };
    
    // Métadonnées
    const metadata = {
      type: 'radial',
      thoughtCount: thoughts.length,
      visibleNodeCount: nodes.length,
      linkCount: links.length,
      maxDepth,
      centerNodeId: centerThought.id,
      radialLevelDistribution: Object.entries(levelCounts).reduce(
        (acc, [level, count]) => ({ ...acc, [level]: count }),
        {}
      )
    };
    
    return {
      nodes,
      links,
      interactivity,
      layout,
      metadata
    };
  }

  /**
   * Applique des filtres à une visualisation
   * 
   * @param visualization La visualisation à filtrer
   * @param filters Les options de filtrage à appliquer
   * @returns La visualisation filtrée
   */
  applyFilters(
    visualization: Visualization,
    filters: FilterOptions
  ): Visualization {
    // Créer des copies profondes pour ne pas modifier l'original
    const nodes = [...visualization.nodes];
    const links = [...visualization.links];
    
    // Filtrage par type de nœud
    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      const filteredNodeIds = nodes
        .filter(node => !filters.nodeTypes!.includes(node.type))
        .map(node => node.id);
      
      // Supprimer les nœuds qui ne correspondent pas aux types demandés
      for (let i = nodes.length - 1; i >= 0; i--) {
        if (filteredNodeIds.includes(nodes[i].id)) {
          nodes.splice(i, 1);
        }
      }
      
      // Supprimer les liens qui pointent vers des nœuds supprimés
      for (let i = links.length - 1; i >= 0; i--) {
        if (filteredNodeIds.includes(links[i].source) || 
            filteredNodeIds.includes(links[i].target)) {
          links.splice(i, 1);
        }
      }
    }
    
    // Filtrage par type de connexion
    if (filters.connectionTypes && filters.connectionTypes.length > 0) {
      for (let i = links.length - 1; i >= 0; i--) {
        if (!filters.connectionTypes.includes(links[i].type)) {
          links.splice(i, 1);
        }
      }
    }
    
    // Filtrage par seuils de métriques
    if (filters.metricThresholds) {
      // Pour chaque métrique spécifiée
      const metricsToCheck = [
        { name: 'confidence', thresholds: filters.metricThresholds.confidence },
        { name: 'relevance', thresholds: filters.metricThresholds.relevance },
        { name: 'quality', thresholds: filters.metricThresholds.quality }
      ];
      
      const filteredNodeIds: string[] = [];
      
      for (const node of nodes) {
        let shouldFilter = false;
        
        for (const metric of metricsToCheck) {
          if (metric.thresholds) {
            const [min, max] = metric.thresholds;
            const value = node.metrics[metric.name as keyof ThoughtMetrics] as number;
            
            if (value < min || value > max) {
              shouldFilter = true;
              break;
            }
          }
        }
        
        if (shouldFilter) {
          filteredNodeIds.push(node.id);
        }
      }
      
      // Supprimer les nœuds qui ne correspondent pas aux seuils
      for (let i = nodes.length - 1; i >= 0; i--) {
        if (filteredNodeIds.includes(nodes[i].id)) {
          nodes.splice(i, 1);
        }
      }
      
      // Supprimer les liens qui pointent vers des nœuds supprimés
      for (let i = links.length - 1; i >= 0; i--) {
        if (filteredNodeIds.includes(links[i].source) || 
            filteredNodeIds.includes(links[i].target)) {
          links.splice(i, 1);
        }
      }
    }
    
    // Filtrage par recherche textuelle
    if (filters.textSearch && filters.textSearch.trim() !== '') {
      const searchTerm = filters.textSearch.toLowerCase().trim();
      const filteredNodeIds: string[] = [];
      
      for (const node of nodes) {
        if (!node.label.toLowerCase().includes(searchTerm) && 
            !node.tooltip?.toLowerCase().includes(searchTerm)) {
          filteredNodeIds.push(node.id);
        }
      }
      
      // Supprimer les nœuds qui ne correspondent pas à la recherche
      for (let i = nodes.length - 1; i >= 0; i--) {
        if (filteredNodeIds.includes(nodes[i].id)) {
          nodes.splice(i, 1);
        }
      }
      
      // Supprimer les liens qui pointent vers des nœuds supprimés
      for (let i = links.length - 1; i >= 0; i--) {
        if (filteredNodeIds.includes(links[i].source) || 
            filteredNodeIds.includes(links[i].target)) {
          links.splice(i, 1);
        }
      }
    }
    
    // Filtrage par plage de dates
    if (filters.dateRange) {
      const [startDate, endDate] = filters.dateRange;
      // Nous supposons que l'info de date est stockée dans les métadonnées des nœuds
      const filteredNodeIds: string[] = [];
      
      for (const node of nodes) {
        const timestamp = node.metadata?.timestamp;
        
        if (timestamp) {
          const nodeDate = new Date(timestamp);
          
          if (nodeDate < startDate || nodeDate > endDate) {
            filteredNodeIds.push(node.id);
          }
        }
      }
      
      // Supprimer les nœuds hors de la plage de dates
      for (let i = nodes.length - 1; i >= 0; i--) {
        if (filteredNodeIds.includes(nodes[i].id)) {
          nodes.splice(i, 1);
        }
      }
      
      // Supprimer les liens qui pointent vers des nœuds supprimés
      for (let i = links.length - 1; i >= 0; i--) {
        if (filteredNodeIds.includes(links[i].source) || 
            filteredNodeIds.includes(links[i].target)) {
          links.splice(i, 1);
        }
      }
    }
    
    // Mettre à jour les métadonnées
    const metadata = {
      ...visualization.metadata,
      filteredNodeCount: nodes.length,
      filteredLinkCount: links.length,
      appliedFilters: { ...filters },
      originalNodeCount: visualization.nodes.length,
      originalLinkCount: visualization.links.length
    };
    
    return {
      ...visualization,
      nodes,
      links,
      metadata,
      filters
    };
  }

  /**
   * Applique des interactions à une visualisation
   * 
   * @param visualization La visualisation
   * @param interaction L'interaction à appliquer
   * @returns La visualisation mise à jour avec l'interaction
   */
  applyInteraction(
    visualization: Visualization,
    interaction: {
      type: 'highlight' | 'select' | 'expand' | 'collapse' | 'focus',
      nodeIds: string[]
    }
  ): Visualization {
    // Créer des copies profondes pour ne pas modifier l'original
    const nodes = [...visualization.nodes];
    const links = [...visualization.links];
    
    switch (interaction.type) {
      case 'highlight':
        // Réinitialiser tous les surlignages
        nodes.forEach(node => {
          node.highlighted = false;
        });
        links.forEach(link => {
          link.highlighted = false;
        });
        
        // Surligner les nœuds spécifiés
        for (const nodeId of interaction.nodeIds) {
          const nodeIndex = nodes.findIndex(n => n.id === nodeId);
          if (nodeIndex !== -1) {
            nodes[nodeIndex].highlighted = true;
          }
          
          // Surligner également les liens connectés
          for (let i = 0; i < links.length; i++) {
            if (links[i].source === nodeId || links[i].target === nodeId) {
              links[i].highlighted = true;
            }
          }
        }
        break;
        
      case 'select':
        // Réinitialiser toutes les sélections
        nodes.forEach(node => {
          node.selected = false;
        });
        
        // Sélectionner les nœuds spécifiés
        for (const nodeId of interaction.nodeIds) {
          const nodeIndex = nodes.findIndex(n => n.id === nodeId);
          if (nodeIndex !== -1) {
            nodes[nodeIndex].selected = true;
          }
        }
        break;
        
      case 'expand':
        // Développer les nœuds spécifiés
        for (const nodeId of interaction.nodeIds) {
          const nodeIndex = nodes.findIndex(n => n.id === nodeId);
          if (nodeIndex !== -1) {
            nodes[nodeIndex].collapsed = false;
          }
        }
        break;
        
      case 'collapse':
        // Replier les nœuds spécifiés
        for (const nodeId of interaction.nodeIds) {
          const nodeIndex = nodes.findIndex(n => n.id === nodeId);
          if (nodeIndex !== -1) {
            nodes[nodeIndex].collapsed = true;
          }
        }
        break;
        
      case 'focus':
        // Cela pourrait impliquer un recentrage de la visualisation
        // et potentiellement un zoom sur les nœuds spécifiés
        
        // Mettre à jour les métadonnées pour indiquer les nœuds focalisés
        if (!visualization.metadata) {
          visualization.metadata = {};
        }
        visualization.metadata.focusedNodeIds = interaction.nodeIds;
        
        // Mettre à jour l'interactivité
        if (!visualization.interactivity) {
          visualization.interactivity = {
            zoomable: true,
            draggable: true,
            selectable: true,
            tooltips: true,
            expandableNodes: true
          };
        }
        
        // Réajuster le zoom pour se concentrer sur les nœuds
        visualization.interactivity.initialZoom = 1.5;
        break;
    }
    
    // Mettre à jour les métadonnées
    const metadata = {
      ...visualization.metadata,
      lastInteraction: interaction
    };
    
    return {
      ...visualization,
      nodes,
      links,
      metadata
    };
  }

  /**
   * Crée une version simplifiée d'une visualisation pour améliorer les performances
   * 
   * @param visualization La visualisation à simplifier
   * @param options Options de simplification
   * @returns La visualisation simplifiée
   */
  simplifyVisualization(
    visualization: Visualization,
    options: {
      maxNodes?: number,
      minNodeImportance?: number
    } = {}
  ): Visualization {
    const maxNodes = options.maxNodes || 100;
    const minNodeImportance = options.minNodeImportance || 0.3;
    
    if (visualization.nodes.length <= maxNodes) {
      return visualization; // Pas besoin de simplifier
    }
    
    // Calculer l'importance de chaque nœud
    const nodeImportance = new Map<string, number>();
    
    for (const node of visualization.nodes) {
      let importance = 0;
      
      // Importance basée sur les métriques
      if (node.metrics) {
        importance += (node.metrics.quality || 0.5) * 0.4;
        importance += (node.metrics.relevance || 0.5) * 0.3;
        importance += (node.metrics.confidence || 0.5) * 0.3;
      }
      
      // Importance basée sur les connexions
      const connectionCount = visualization.links.filter(
        link => link.source === node.id || link.target === node.id
      ).length;
      importance += Math.min(connectionCount / 10, 1) * 0.5;
      
      // Importance basée sur le type
      if (node.type === 'conclusion' || node.type === 'hypothesis') {
        importance += 0.2;
      }
      
      // Importance basée sur la mise en évidence
      if (node.highlighted || node.selected) {
        importance += 0.3;
      }
      
      nodeImportance.set(node.id, importance);
    }
    
    // Trier les nœuds par importance
    const nodesSorted = [...visualization.nodes].sort(
      (a, b) => (nodeImportance.get(b.id) || 0) - (nodeImportance.get(a.id) || 0)
    );
    
    // Prendre les nœuds les plus importants
    const nodesTop = nodesSorted.slice(0, maxNodes);
    const topNodeIds = new Set(nodesTop.map(n => n.id));
    
    // Filtrer les liens qui concernent uniquement les nœuds conservés
    const filteredLinks = visualization.links.filter(
      link => topNodeIds.has(link.source) && topNodeIds.has(link.target)
    );
    
    // Ajouter des indicateurs de nœuds agrégés
    // Compter les nœuds cachés par type
    const hiddenNodesByType: Record<string, number> = {};
    for (const node of visualization.nodes) {
      if (!topNodeIds.has(node.id)) {
        hiddenNodesByType[node.type] = (hiddenNodesByType[node.type] || 0) + 1;
      }
    }
    
    // Créer des nœuds "placeholder" pour représenter les nœuds cachés
    const placeholderNodes: VisualizationNode[] = [];
    
    for (const [type, count] of Object.entries(hiddenNodesByType)) {
      if (count > 0) {
        placeholderNodes.push({
          id: `placeholder-${type}`,
          label: `${count} nœuds ${type} cachés`,
          type: type as ThoughtType,
          metrics: { confidence: 0.5, relevance: 0.5, quality: 0.5 },
          size: 8 + Math.min(count, 10),
          color: this.thoughtTypeColors[type] || '#757575',
          tooltip: `${count} nœuds de type "${type}" cachés par simplification`,
          metadata: {
            isPlaceholder: true,
            hiddenCount: count
          }
        });
      }
    }
    
    // Créer des liens vers les placeholders
    const placeholderLinks: VisualizationLink[] = [];
    
    for (const placeholder of placeholderNodes) {
      // Trouver les nœuds visibles avec lesquels les nœuds cachés pourraient être connectés
      const type = placeholder.type;
      const visibleNodesOfSimilarType = nodesTop.filter(n => 
        n.type === type || 
        (type === 'revision' && n.type === 'regular') ||
        (type === 'meta' && (n.type === 'hypothesis' || n.type === 'conclusion'))
      );
      
      // Ajouter des liens vers quelques nœuds visibles
      for (let i = 0; i < Math.min(visibleNodesOfSimilarType.length, 3); i++) {
        placeholderLinks.push({
          source: placeholder.id,
          target: visibleNodesOfSimilarType[i].id,
          type: 'associates',
          strength: 0.3,
          width: 1,
          color: '#aaaaaa',
          dashed: true,
          tooltip: 'Connexion simplifiée'
        });
      }
    }
    
    // Combiner les nœuds et liens
    const simplifiedNodes = [...nodesTop, ...placeholderNodes];
    const simplifiedLinks = [...filteredLinks, ...placeholderLinks];
    
    // Mettre à jour les métadonnées
    const metadata = {
      ...visualization.metadata,
      simplificationApplied: true,
      originalNodeCount: visualization.nodes.length,
      originalLinkCount: visualization.links.length,
      hiddenNodeCount: visualization.nodes.length - nodesTop.length,
      hiddenNodesByType
    };
    
    return {
      ...visualization,
      nodes: simplifiedNodes,
      links: simplifiedLinks,
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