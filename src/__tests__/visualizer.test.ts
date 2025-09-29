import { Visualizer } from '../visualizer';
import { ThoughtGraph } from '../thought-graph';

function createThoughtGraph(): ThoughtGraph {
  const graph = new ThoughtGraph('session-tests');
  return graph;
}

describe('Visualizer', () => {
  it('génère des nœuds et liens cohérents à partir du graphe', async () => {
    const graph = createThoughtGraph();
    const premierId = graph.addThought('Les capteurs sont installés', 'regular');
    const secondId = graph.addThought('Nous en déduisons une maintenance imminente', 'conclusion', [
      {
        targetId: premierId,
        type: 'supports',
        strength: 0.8,
        description: 'Observation directe',
      },
    ]);

    graph.updateThoughtMetrics(premierId, { confidence: 0.9, relevance: 0.75, quality: 0.8 });
    graph.updateThoughtMetrics(secondId, { confidence: 0.85, relevance: 0.7, quality: 0.82 });

    const visualizer = new Visualizer();
    const visualization = visualizer.generateVisualization(graph, secondId);

    expect(visualization.nodes).toHaveLength(2);
    expect(visualization.links).toHaveLength(1);

    const centralNode = visualization.nodes.find((node) => node.id === secondId);
    expect(centralNode?.highlighted).toBe(true);
    expect(centralNode?.metrics.confidence).toBeCloseTo(0.85);
    expect(centralNode?.tooltip).toContain('maintenance imminente');

    const lien = visualization.links[0];
    expect(new Set([lien.source, lien.target])).toEqual(new Set([premierId, secondId]));
    expect(lien.color).toBeDefined();
    expect(visualization.metadata.thoughtCount).toBe(2);
  });

  it('génère des visualisations thématiques et radiales avec clusters', () => {
    const graph = createThoughtGraph();
    const baseId = graph.addThought('Analyse énergétique des capteurs intelligents', 'regular');
    const revisionId = graph.addThought('Révision de l\'analyse énergétique des capteurs', 'revision', [
      {
        targetId: baseId,
        type: 'refines',
        strength: 0.7,
      },
    ]);
    const metaId = graph.addThought('Meta: bilan énergétique global', 'meta', [
      {
        targetId: revisionId,
        type: 'synthesizes',
        strength: 0.6,
      },
    ]);

    graph.updateThoughtMetrics(baseId, { confidence: 0.8, relevance: 0.7, quality: 0.8 });
    graph.updateThoughtMetrics(revisionId, { confidence: 0.75, relevance: 0.65, quality: 0.7 });
    graph.updateThoughtMetrics(metaId, { confidence: 0.7, relevance: 0.6, quality: 0.68 });

    const visualizer = new Visualizer();

    const thematic = visualizer.generateThematicVisualization(graph);
    expect((thematic.clusters ?? []).length).toBeGreaterThan(0);
    expect(thematic.metadata.type).toBe('thematic');

    const radial = visualizer.generateRadialVisualization(graph);
    expect(radial.layout?.type).toBe('radial');
    expect(radial.metadata.thoughtCount).toBe(3);
  });
});
