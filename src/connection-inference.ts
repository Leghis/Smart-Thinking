import type {
  Connection,
  ConnectionAttributes,
  ConnectionType,
  Hyperlink,
  ThoughtNode,
} from './types';
import type { SimilarityEngine, TermVector } from './similarity-engine';

export interface ClusterInfo {
  nodeIds: string[];
  label?: string;
  cohesion: number;
}

export interface ConnectionInferenceStore {
  getThought(id: string): ThoughtNode | undefined;
  getSessionThoughts(sessionId?: string): ThoughtNode[];
  getAllHyperlinks(sessionId?: string): Hyperlink[];
  createHyperlink(
    nodeIds: string[],
    type: ConnectionType,
    label?: string,
    attributes?: ConnectionAttributes,
    strength?: number,
  ): string;
}

export type Certainty = NonNullable<ConnectionAttributes['certainty']>;

const RECIPROCAL_CONNECTION_TYPES: Partial<Record<ConnectionType, ConnectionType>> = {
  supports: 'supports',
  contradicts: 'contradicts',
  refines: 'derives',
  derives: 'refines',
  branches: 'branches',
  associates: 'associates',
  exemplifies: 'generalizes',
  generalizes: 'exemplifies',
  compares: 'compares',
  contrasts: 'contrasts',
  questions: 'questions',
  extends: 'extended-by',
  analyzes: 'analyzed-by',
  synthesizes: 'component-of',
  applies: 'applied-by',
  evaluates: 'evaluated-by',
  cites: 'cited-by',
  'extended-by': 'extends',
  'analyzed-by': 'analyzes',
  'component-of': 'synthesizes',
  'applied-by': 'applies',
  'evaluated-by': 'evaluates',
  'cited-by': 'cites',
};

const BIDIRECTIONAL_CONNECTION_TYPES: ReadonlySet<ConnectionType> = new Set<ConnectionType>([
  'associates',
  'compares',
  'contrasts',
  'supports',
  'contradicts',
]);

interface TransitivityRule {
  secondType: ConnectionType;
  resultType: ConnectionType;
  confidenceMultiplier: number;
}

const TRANSITIVITY_RULES: Partial<Record<ConnectionType, readonly TransitivityRule[]>> = {
  supports: [{ secondType: 'supports', resultType: 'supports', confidenceMultiplier: 0.8 }],
  contradicts: [{ secondType: 'supports', resultType: 'contradicts', confidenceMultiplier: 0.7 }],
  derives: [{ secondType: 'derives', resultType: 'derives', confidenceMultiplier: 0.9 }],
};

const INFERENCE_MARKERS = {
  contradiction: ['cependant', 'mais', 'toutefois', 'contrairement', 'oppose', 'inversement', 'contredit', 'différent', 'désaccord', 'conteste', 'au contraire', 'réfute', 'pourtant', 'malgré', 'bien que', 'alors que', 'pas d\'accord', 'faux', 'incorrect'],
  support: ['confirme', 'soutient', 'renforce', 'valide', 'appuie', 'corrobore', 'accord', 'similaire', 'de même', 'en effet', 'prouve', 'démontre'],
  derivation: ['donc', 'par conséquent', 'résulte', 'implique', 'entraîne', 'parce que', 'car', 'puisque', 'étant donné', 'conclusion', 'synthèse'],
  exemplification: ['par exemple', 'comme', 'illustre', 'notamment', 'tel que'],
  question: ['pourquoi', 'comment', 'remet en question'],
  refinement: ['précise', 'détaille', 'améliore', 'corrige', 'en d\'autres termes', 'spécifiquement'],
};


const MARKER_REGEX_CACHE = new Map<string, RegExp>();

function escapeMarker(marker: string): string {
  return marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Word-boundary marker matching: 'mais' no longer matches 'jamais'. */
function hasMarker(text: string, markers: readonly string[]): boolean {
  return markers.some((marker) => {
    let regex = MARKER_REGEX_CACHE.get(marker);
    if (!regex) {
      regex = new RegExp(`(?:^|[^a-z0-9àâäéèêëîïôöùûüç])${escapeMarker(marker)}(?:$|[^a-z0-9àâäéèêëîïôöùûüç])`, 'i');
      MARKER_REGEX_CACHE.set(marker, regex);
    }
    return regex.test(text);
  });
}

export function getReciprocalConnectionType(type: ConnectionType): ConnectionType {
  return RECIPROCAL_CONNECTION_TYPES[type] ?? 'associates';
}

export function shouldCreateReciprocalConnection(type: ConnectionType): boolean {
  return BIDIRECTIONAL_CONNECTION_TYPES.has(type);
}

export function mapConfidenceToCertainty(confidence: number): Certainty {
  if (confidence >= 0.9) return 'definite';
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.5) return 'moderate';
  if (confidence >= 0.3) return 'low';
  return 'speculative';
}

export function inferConnectionType(
  sourceThought: ThoughtNode,
  targetThought: ThoughtNode,
): ConnectionType {
  const sourceContent = sourceThought.content.toLowerCase();
  const targetContent = targetThought.content.toLowerCase();
  const combinedContent = `${sourceContent} ${targetContent}`;

  if (hasMarker(combinedContent, INFERENCE_MARKERS.contradiction)) {
    return 'contradicts';
  }

  if (hasMarker(combinedContent, INFERENCE_MARKERS.derivation)) {
    if (sourceThought.type === 'conclusion' && targetThought.type !== 'conclusion') return 'synthesizes';
    if (sourceThought.type === 'meta') return 'analyzes';
    if (hasMarker(combinedContent, ['si']) && hasMarker(combinedContent, ['alors'])) return 'applies';
    return 'derives';
  }

  if (hasMarker(combinedContent, INFERENCE_MARKERS.exemplification)) {
    if (hasMarker(sourceContent, INFERENCE_MARKERS.exemplification)) return 'exemplifies';
    if (hasMarker(targetContent, INFERENCE_MARKERS.exemplification)) return 'generalizes';
    return 'exemplifies';
  }

  if (hasMarker(combinedContent, INFERENCE_MARKERS.question) || combinedContent.includes('?')) {
    return 'questions';
  }

  if (hasMarker(combinedContent, INFERENCE_MARKERS.refinement) || sourceThought.type === 'revision') {
    return 'refines';
  }

  if (hasMarker(combinedContent, INFERENCE_MARKERS.support)) {
    return 'supports';
  }

  if (sourceThought.type === 'conclusion' && targetThought.type !== 'conclusion') return 'synthesizes';
  if (sourceThought.type === 'hypothesis' && targetThought.type === 'regular') return 'generalizes';
  if (sourceThought.type === 'regular' && targetThought.type === 'hypothesis') return 'exemplifies';
  if (sourceThought.type === 'meta') return 'analyzes';

  return 'associates';
}

export function inferConnectionAttributes(
  sourceThought: ThoughtNode,
  targetThought: ThoughtNode,
  type: ConnectionType,
): ConnectionAttributes {
  const attributes: ConnectionAttributes = {};

  if (sourceThought.timestamp.getTime() < targetThought.timestamp.getTime()) {
    attributes.temporality = 'before';
  } else if (sourceThought.timestamp.getTime() > targetThought.timestamp.getTime()) {
    attributes.temporality = 'after';
  } else {
    attributes.temporality = 'concurrent';
  }

  const certaintyMarkersLow = ['peut-être', 'semble', 'possible', 'pourrait', 'probablement', 'suggère'];
  const certaintyMarkersHigh = ['certainement', 'clairement', 'évidemment', 'prouvé', 'démontré', 'sans aucun doute'];
  const combinedContent = `${sourceThought.content.toLowerCase()} ${targetThought.content.toLowerCase()}`;

  if (hasMarker(combinedContent, certaintyMarkersHigh)) {
    attributes.certainty = 'high';
  } else if (certaintyMarkersLow.some((marker) => combinedContent.includes(marker))) {
    attributes.certainty = 'low';
  } else {
    attributes.certainty = 'moderate';
  }

  switch (type) {
    case 'supports':
    case 'contradicts':
      attributes.nature = 'associative'; break;
    case 'derives':
      attributes.nature = combinedContent.includes('parce que') || combinedContent.includes('car') ? 'causal' : 'sequential'; break;
    case 'refines':
    case 'generalizes':
    case 'exemplifies':
    case 'component-of':
    case 'synthesizes':
      attributes.nature = 'hierarchical'; break;
    case 'branches':
      attributes.nature = 'sequential'; break;
    case 'analyzes':
    case 'evaluates':
    case 'applies':
      attributes.nature = 'causal'; break;
    default:
      attributes.nature = 'associative';
  }

  attributes.directionality = shouldCreateReciprocalConnection(type)
    ? 'bidirectional'
    : 'unidirectional';

  const sourceLength = sourceThought.content.length;
  const targetLength = targetThought.content.length;
  if (Math.abs(sourceLength - targetLength) < 50) {
    attributes.scope = 'specific';
  } else if (sourceLength > targetLength * 1.5 || targetLength > sourceLength * 1.5) {
    attributes.scope = 'broad';
  } else {
    attributes.scope = 'partial';
  }

  return attributes;
}

export function addInferredConnection(
  getThought: (id: string) => ThoughtNode | undefined,
  sourceId: string,
  targetId: string,
  type: ConnectionType,
  confidence: number,
): boolean {
  if (sourceId === targetId) return false;

  const sourceThought = getThought(sourceId);
  const targetThought = getThought(targetId);
  if (!sourceThought || !targetThought) return false;

  const justification = {
    summary: 'Connexion inférée automatiquement par SimilarityEngine',
    heuristics: [
      {
        metric: 'similarity',
        weight: confidence,
        score: confidence,
        rationale: 'Score de similarité calculé lors de l’inférence automatique',
      },
    ],
    timestamp: new Date().toISOString(),
  };

  const base: Omit<Connection, 'targetId' | 'type'> = {
    strength: confidence,
    inferred: true,
    inferenceConfidence: confidence,
    attributes: { certainty: mapConfidenceToCertainty(confidence) },
    createdByStepId: 'auto-inference',
    justification,
    heuristicWeights: justification.heuristics,
  };

  sourceThought.connections.push({ ...base, targetId, type });

  if (shouldCreateReciprocalConnection(type)) {
    targetThought.connections.push({
      ...base,
      targetId: sourceId,
      type: getReciprocalConnectionType(type),
    });
  }

  return true;
}

function buildLookup(thoughts: ThoughtNode[]): Map<string, ThoughtNode> {
  return new Map(thoughts.map((thought) => [thought.id, thought] as const));
}

function buildOutgoingIndex(thoughts: ThoughtNode[]): Map<string, Set<string>> {
  return new Map(
    thoughts.map((thought) => [
      thought.id,
      new Set(thought.connections.map((connection) => connection.targetId)),
    ] as const),
  );
}

function extractClusterLabel(members: string[], lookup: Map<string, ThoughtNode>): string | undefined {
  const content = members
    .map((id) => lookup.get(id)?.content ?? '')
    .join(' ')
    .toLowerCase();
  const words = content.split(/\W+/).filter((word) => word.length > 4);
  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  let label: string | undefined;
  let bestCount = 0;
  for (const [word, count] of counts) {
    if (count > bestCount || (count === bestCount && label !== undefined && word < label)) {
      label = word;
      bestCount = count;
    }
  }
  return label;
}

// Cohesion only counts edges whose two endpoints belong to this cluster's own membership set.
export function exploreCommunity(
  startId: string,
  lookup: Map<string, ThoughtNode>,
  visited: Set<string> = new Set(),
): ClusterInfo {
  const members = new Set<string>([startId]);
  const queue: string[] = [startId];
  let head = 0;
  const strengths: number[] = [];
  const internalEdges = new Set<string>();

  while (head < queue.length) {
    const currentId = queue[head++];
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const thought = lookup.get(currentId);
    if (!thought) continue;

    for (const connection of thought.connections) {
      if (!members.has(connection.targetId) && !visited.has(connection.targetId) && connection.strength > 0.5) {
        if (lookup.has(connection.targetId)) {
          members.add(connection.targetId);
          queue.push(connection.targetId);
        }
      }

      if (members.has(connection.targetId)) {
        const edgeId = [currentId, connection.targetId].sort().join('\u0000');
        if (!internalEdges.has(edgeId)) {
          internalEdges.add(edgeId);
          strengths.push(connection.strength);
        }
      }
    }
  }

  const cohesion = strengths.length > 0
    ? strengths.reduce((sum, score) => sum + score, 0) / strengths.length
    : 0;

  return {
    nodeIds: queue,
    label: extractClusterLabel(queue, lookup),
    cohesion,
  };
}

export function detectClusters(thoughts: ThoughtNode[]): ClusterInfo[] {
  const lookup = buildLookup(thoughts);
  const visited = new Set<string>();
  const clusters: ClusterInfo[] = [];

  for (const thought of thoughts) {
    if (visited.has(thought.id)) continue;

    const cluster = exploreCommunity(thought.id, lookup, visited);
    if (cluster.nodeIds.length >= 2) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

export class ConnectionInference {
  constructor(
    private readonly store: ConnectionInferenceStore,
    private readonly similarityEngine?: SimilarityEngine,
  ) {}

  async inferRelations(confidenceThreshold = 0.7, sessionId?: string): Promise<number> {
    const thoughts = this.store.getSessionThoughts(sessionId);
    if (thoughts.length < 2) return 0;

    const lookup = buildLookup(thoughts);
    let newRelations = 0;
    newRelations += await this.inferRelationsBySimilarity(thoughts, confidenceThreshold);
    newRelations += this.inferRelationsByTransitivity(thoughts, lookup, confidenceThreshold);
    newRelations += this.inferRelationsByPatterns(thoughts, lookup, confidenceThreshold, sessionId);
    return newRelations;
  }

  addInferredConnection(
    sourceId: string,
    targetId: string,
    type: ConnectionType,
    confidence: number,
  ): boolean {
    return addInferredConnection(
      (id) => this.store.getThought(id),
      sourceId,
      targetId,
      type,
      confidence,
    );
  }

  enrichThoughtConnections(thoughtId: string): number {
    const thought = this.store.getThought(thoughtId);
    if (!thought) return 0;

    let enrichedCount = 0;
    for (const connection of thought.connections) {
      if (connection.attributes || connection.inferred) continue;

      const targetThought = this.store.getThought(connection.targetId);
      if (!targetThought) continue;

      connection.attributes = inferConnectionAttributes(thought, targetThought, connection.type);
      enrichedCount++;
    }

    return enrichedCount;
  }

  private async inferRelationsBySimilarity(
    thoughts: ThoughtNode[],
    confidenceThreshold: number,
  ): Promise<number> {
    if (thoughts.length < 2 || !this.similarityEngine) return 0;

    const MAX_INFERENCE_NODES = 80;
    const scopedThoughts =
      thoughts.length > MAX_INFERENCE_NODES
        ? [...thoughts]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, MAX_INFERENCE_NODES)
        : thoughts;

    let vectors: TermVector[];
    try {
      vectors = await this.similarityEngine.generateVectors(scopedThoughts.map((thought) => thought.content));
    } catch (error) {
      console.error('Failed to compute vectors for similarity inference:', error);
      return 0;
    }

    if (vectors.length !== scopedThoughts.length) {
      console.error('Mismatch between number of thoughts and vectors received.');
      return 0;
    }

    const outgoing = buildOutgoingIndex(scopedThoughts);
    let newRelationsCount = 0;

    for (let i = 0; i < scopedThoughts.length; i++) {
      for (let j = i + 1; j < scopedThoughts.length; j++) {
        const sourceThought = scopedThoughts[i];
        const targetThought = scopedThoughts[j];
        const similarityScore = this.similarityEngine.calculateCosineSimilarity(vectors[i], vectors[j]);
        if (similarityScore < confidenceThreshold) continue;

        const alreadyLinked = outgoing.get(sourceThought.id)?.has(targetThought.id) === true
          || outgoing.get(targetThought.id)?.has(sourceThought.id) === true;
        if (alreadyLinked) continue;

        const connectionType = inferConnectionType(sourceThought, targetThought);
        if (this.addInferredConnection(sourceThought.id, targetThought.id, connectionType, similarityScore)) {
          outgoing.get(sourceThought.id)?.add(targetThought.id);
          outgoing.get(targetThought.id)?.add(sourceThought.id);
          newRelationsCount++;
        }
      }
    }

    return newRelationsCount;
  }

  private inferRelationsByTransitivity(
    thoughts: ThoughtNode[],
    lookup: Map<string, ThoughtNode>,
    confidenceThreshold: number,
  ): number {
    let newRelationsCount = 0;

    for (const thought of thoughts) {
      for (const conn1 of thought.connections) {
        const secondThought = lookup.get(conn1.targetId);
        if (!secondThought) continue;

        for (const rule of TRANSITIVITY_RULES[conn1.type] ?? []) {
          for (const conn2 of secondThought.connections) {
            if (conn2.type !== rule.secondType) continue;

            const thirdThought = lookup.get(conn2.targetId);
            if (!thirdThought || thirdThought.id === thought.id) continue;

            const hasConnection = thought.connections.some((conn) => conn.targetId === thirdThought.id);
            const hasReciprocalConnection = thirdThought.connections.some((conn) => conn.targetId === thought.id);
            if (hasConnection || hasReciprocalConnection) continue;

            const confidence = conn1.strength * conn2.strength * rule.confidenceMultiplier;
            if (confidence < confidenceThreshold) continue;

            if (this.addInferredConnection(thought.id, thirdThought.id, rule.resultType, confidence)) {
              newRelationsCount++;
            }
          }
        }
      }
    }

    return newRelationsCount;
  }

  private inferRelationsByPatterns(
    thoughts: ThoughtNode[],
    lookup: Map<string, ThoughtNode>,
    confidenceThreshold: number,
    sessionId?: string,
  ): number {
    const clusters = detectClusters(thoughts);
    const existingHyperlinks = this.store.getAllHyperlinks(sessionId);
    let newRelationsCount = 0;

    for (const cluster of clusters) {
      if (cluster.nodeIds.length < 3) continue;

      if (cluster.cohesion >= confidenceThreshold) {
        const existingHyperlink = existingHyperlinks.find(
          (hyperlink) =>
            hyperlink.nodeIds.length === cluster.nodeIds.length
            && cluster.nodeIds.every((id) => hyperlink.nodeIds.includes(id)),
        );

        if (!existingHyperlink) {
          this.store.createHyperlink(
            cluster.nodeIds,
            'associates',
            `Cluster: ${cluster.label ?? 'Sans nom'}`,
            { nature: 'associative', scope: 'broad' },
            cluster.cohesion,
          );
          newRelationsCount++;
        }
      }

      for (let i = 0; i < cluster.nodeIds.length; i++) {
        for (let j = i + 1; j < cluster.nodeIds.length; j++) {
          const thought1 = lookup.get(cluster.nodeIds[i]);
          const thought2 = lookup.get(cluster.nodeIds[j]);
          if (!thought1 || !thought2) continue;

          const hasConnection = thought1.connections.some((conn) => conn.targetId === thought2.id);
          const hasReciprocalConnection = thought2.connections.some((conn) => conn.targetId === thought1.id);
          if (hasConnection || hasReciprocalConnection) continue;

          const confidence = cluster.cohesion * 0.9;
          if (confidence < confidenceThreshold) continue;

          if (this.addInferredConnection(thought1.id, thought2.id, 'associates', confidence)) {
            newRelationsCount++;
          }
        }
      }
    }

    return newRelationsCount;
  }
}
