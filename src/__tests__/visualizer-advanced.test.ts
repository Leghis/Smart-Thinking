import { ThoughtGraph } from '../thought-graph';
import type { ThoughtNode, Visualization, VisualizationNode } from '../types';
import { Visualizer } from '../visualizer';

function setTimestamp(thought: ThoughtNode | undefined, iso: string): void {
  if (!thought) return;
  thought.metadata.timestamp = iso;
  thought.timestamp = new Date(iso);
}

function buildGraph(): { graph: ThoughtGraph; ids: string[] } {
  const graph = new ThoughtGraph('viz-advanced-session');

  const a = graph.addThought('Hypothèse sur les capteurs thermiques industriels', 'hypothesis');
  const b = graph.addThought('Analyse comparative des données capteurs thermiques', 'regular', [
    { targetId: a, type: 'supports', strength: 0.8, description: 'Validation terrain' },
  ]);
  const c = graph.addThought('Révision des données de température critiques', 'revision', [
    { targetId: b, type: 'refines', strength: 0.7, description: 'Correction modèle' },
  ]);
  const d = graph.addThought('Meta-analyse de cohérence énergétique globale', 'meta', [
    { targetId: c, type: 'synthesizes', strength: 0.6, description: 'Synthèse transversale' },
  ]);
  const e = graph.addThought('Conclusion opérationnelle pour maintenance prédictive', 'conclusion', [
    { targetId: d, type: 'derives', strength: 0.9, description: 'Décision finale' },
    { targetId: b, type: 'associates', strength: 0.5, description: 'Contexte secondaire' },
  ]);

  graph.updateThoughtMetrics(a, { confidence: 0.3, relevance: 0.55, quality: 0.35 });
  graph.updateThoughtMetrics(b, { confidence: 0.72, relevance: 0.78, quality: 0.76 });
  graph.updateThoughtMetrics(c, { confidence: 0.66, relevance: 0.69, quality: 0.59 });
  graph.updateThoughtMetrics(d, { confidence: 0.81, relevance: 0.73, quality: 0.82 });
  graph.updateThoughtMetrics(e, { confidence: 0.87, relevance: 0.84, quality: 0.9 });

  setTimestamp(graph.getThought(a), '2025-01-01T10:00:00.000Z');
  setTimestamp(graph.getThought(b), '2025-01-02T10:00:00.000Z');
  setTimestamp(graph.getThought(c), '2025-01-03T10:00:00.000Z');
  setTimestamp(graph.getThought(d), '2025-01-04T10:00:00.000Z');
  setTimestamp(graph.getThought(e), '2025-01-05T10:00:00.000Z');

  // Enrichir un lien avec justification pour couvrir les tooltips enrichis.
  const thoughtB = graph.getThought(b);
  if (thoughtB && thoughtB.connections[0]) {
    thoughtB.connections[0].justification = {
      summary: 'Lien validé par le raisonnement.'
    };
  }

  return { graph, ids: [a, b, c, d, e] };
}

function withNodeTimestamps(visualization: Visualization, map: Record<string, string>): Visualization {
  const nodes = visualization.nodes.map(node => ({
    ...node,
    metadata: {
      ...(node.metadata || {}),
      timestamp: map[node.id]
    }
  }));

  return {
    ...visualization,
    nodes
  };
}

function createLargeVisualization(count: number): Visualization {
  const nodes: VisualizationNode[] = [];
  const links: Visualization['links'] = [];

  for (let i = 0; i < count; i++) {
    const type = i % 5 === 0
      ? 'conclusion'
      : i % 4 === 0
        ? 'hypothesis'
        : i % 3 === 0
          ? 'meta'
          : i % 2 === 0
            ? 'revision'
            : 'regular';

    nodes.push({
      id: `n-${i}`,
      label: `Noeud ${i}`,
      type,
      metrics: {
        confidence: (i % 10) / 10,
        relevance: ((i + 3) % 10) / 10,
        quality: ((i + 5) % 10) / 10,
      },
      highlighted: i === 0,
      selected: i === 1,
      metadata: {
        timestamp: `2025-02-${String((i % 9) + 1).padStart(2, '0')}T00:00:00.000Z`
      }
    });

    if (i > 0) {
      links.push({
        source: `n-${i - 1}`,
        target: `n-${i}`,
        type: i % 2 === 0 ? 'supports' : 'associates',
        strength: 0.4 + ((i % 4) * 0.1),
      });
    }
  }

  return {
    nodes,
    links,
    metadata: {
      type: 'graph',
      thoughtCount: count,
      linkCount: links.length,
    }
  };
}

describe('Visualizer advanced coverage', () => {
  it('génère les vues principales: chrono, hiérarchique, force et radial', () => {
    const { graph, ids } = buildGraph();
    const [a, b] = ids;
    const visualizer = new Visualizer();

    const chronological = visualizer.generateChronologicalVisualization(graph);
    expect(chronological.layout?.type).toBe('chronological');
    expect(chronological.nodes.length).toBeGreaterThanOrEqual(5);
    expect(chronological.links.length).toBeGreaterThan(0);

    const hierarchical = visualizer.generateHierarchicalVisualization(graph, b, {
      direction: 'LR',
      levelSeparation: 140,
      clusterBy: 'metric',
    });
    expect(hierarchical.layout?.type).toBe('hierarchical');
    expect(hierarchical.layout?.direction).toBe('LR');
    expect(hierarchical.metadata?.rootId).toBe(b);
    expect((hierarchical.clusters ?? []).length).toBe(3);

    const force = visualizer.generateForceDirectedVisualization(graph, {
      clusterBy: 'connectivity',
      forceStrength: 0.9,
      centerNode: a,
    });
    expect(force.layout?.type).toBe('force');
    expect(force.layout?.forceStrength).toBe(0.9);
    expect((force.clusters ?? []).length).toBe(3);
    expect(force.nodes.some(n => n.id === a && n.highlighted)).toBe(true);

    const radial = visualizer.generateRadialVisualization(graph, b, { maxDepth: 2, radialDistance: 90 });
    expect(radial.layout?.type).toBe('radial');
    expect(radial.layout?.centerNode).toBe(b);
    expect(radial.nodes.length).toBeGreaterThan(1);
    expect(radial.metadata?.centerNodeId).toBe(b);
  });

  it('applique les filtres composés et conserve les métadonnées de filtrage', () => {
    const { graph, ids } = buildGraph();
    const [a, b, c, d, e] = ids;
    const visualizer = new Visualizer();

    const base = visualizer.generateVisualization(graph, e);
    const enriched = withNodeTimestamps(base, {
      [a]: '2025-01-01T10:00:00.000Z',
      [b]: '2025-01-02T10:00:00.000Z',
      [c]: '2025-01-03T10:00:00.000Z',
      [d]: '2025-01-04T10:00:00.000Z',
      [e]: '2025-01-05T10:00:00.000Z',
    });

    const filtered = visualizer.applyFilters(enriched, {
      nodeTypes: ['conclusion', 'meta', 'regular'],
      connectionTypes: ['supports', 'derives', 'associates'],
      metricThresholds: {
        confidence: [0.6, 1],
        relevance: [0.6, 1],
        quality: [0.55, 1],
      },
      textSearch: 'maintenance',
      dateRange: [new Date('2025-01-04T00:00:00.000Z'), new Date('2025-01-06T00:00:00.000Z')],
    });

    expect(filtered.nodes.every(node => node.type === 'conclusion' || node.type === 'meta' || node.type === 'regular')).toBe(true);
    expect(filtered.links.every(link => ['supports', 'derives', 'associates'].includes(link.type))).toBe(true);
    expect(filtered.metadata?.appliedFilters).toBeDefined();
    expect(filtered.metadata?.filteredNodeCount).toBe(filtered.nodes.length);
    expect(filtered.metadata?.originalNodeCount).toBe(enriched.nodes.length);
  });

  it('applique les interactions highlight/select/expand/collapse/focus', () => {
    const visualization = createLargeVisualization(10);
    const visualizer = new Visualizer();

    const highlighted = visualizer.applyInteraction(visualization, {
      type: 'highlight',
      nodeIds: ['n-1', 'n-2'],
    });
    expect(highlighted.nodes.filter(n => n.highlighted).map(n => n.id).sort()).toEqual(['n-1', 'n-2']);
    expect(highlighted.links.some(l => l.highlighted)).toBe(true);

    const selected = visualizer.applyInteraction(highlighted, {
      type: 'select',
      nodeIds: ['n-3'],
    });
    expect(selected.nodes.find(n => n.id === 'n-3')?.selected).toBe(true);

    const expanded = visualizer.applyInteraction(selected, {
      type: 'expand',
      nodeIds: ['n-3'],
    });
    expect(expanded.nodes.find(n => n.id === 'n-3')?.collapsed).toBe(false);

    const collapsed = visualizer.applyInteraction(expanded, {
      type: 'collapse',
      nodeIds: ['n-3'],
    });
    expect(collapsed.nodes.find(n => n.id === 'n-3')?.collapsed).toBe(true);

    const focused = visualizer.applyInteraction(collapsed, {
      type: 'focus',
      nodeIds: ['n-3', 'n-4'],
    });
    expect(focused.metadata?.focusedNodeIds).toEqual(['n-3', 'n-4']);
    expect(focused.interactivity?.initialZoom).toBe(1.5);
    expect(focused.metadata?.lastInteraction).toBeDefined();
  });

  it('simplifie les graphes volumineux et conserve les graphes déjà compacts', () => {
    const visualizer = new Visualizer();

    const compact = createLargeVisualization(5);
    const unchanged = visualizer.simplifyVisualization(compact, { maxNodes: 10 });
    expect(unchanged).toBe(compact);

    const large = createLargeVisualization(40);
    const simplified = visualizer.simplifyVisualization(large, {
      maxNodes: 8,
      minNodeImportance: 0.75,
    });

    expect(simplified.nodes.length).toBeLessThanOrEqual(8 + 5);
    expect(simplified.metadata?.simplificationApplied).toBe(true);
    expect(simplified.metadata?.hiddenNodeCount).toBeGreaterThan(0);
    expect(simplified.nodes.some(node => node.id.startsWith('placeholder-'))).toBe(true);
  });

  it('retourne des visualisations vides quand le graphe est vide', () => {
    const visualizer = new Visualizer();
    const emptyGraph = new ThoughtGraph('empty-viz');

    expect(visualizer.generateVisualization(emptyGraph).metadata?.isEmpty).toBe(true);
    expect(visualizer.generateChronologicalVisualization(emptyGraph).metadata?.isEmpty).toBe(true);
    expect(visualizer.generateThematicVisualization(emptyGraph).metadata?.isEmpty).toBe(true);
    expect(visualizer.generateHierarchicalVisualization(emptyGraph).metadata?.isEmpty).toBe(true);
    expect(visualizer.generateForceDirectedVisualization(emptyGraph).metadata?.isEmpty).toBe(true);
    expect(visualizer.generateRadialVisualization(emptyGraph).metadata?.isEmpty).toBe(true);
  });
});
