import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'events';
import type {
  Connection,
  ConnectionAttributes,
  ConnectionType,
  Hyperlink,
  NextStepSuggestion,
  ThoughtMetrics,
  ThoughtNode,
  ThoughtType,
} from './types';
import type { SimilarityEngine } from './similarity-engine';
import type { QualityEvaluator } from './quality-evaluator';
import { LIMITS } from './constants';
import { ValidationError } from './errors';
import {
  ConnectionInference,
  getReciprocalConnectionType,
} from './connection-inference';
import { suggestNextSteps as buildNextStepSuggestions } from './step-suggester';

export class ThoughtGraph {
  private nodes: Map<string, ThoughtNode> = new Map();
  private hyperlinks: Map<string, Hyperlink> = new Map();
  private sessionId: string;
  private similarityEngine?: SimilarityEngine;
  private qualityEvaluator?: QualityEvaluator;
  private eventEmitter = new EventEmitter();
  private inference: ConnectionInference;

  constructor(sessionId?: string, similarityEngine?: SimilarityEngine, qualityEvaluator?: QualityEvaluator) {
    this.sessionId = sessionId || `session-${randomUUID()}`;
    this.similarityEngine = similarityEngine;
    this.qualityEvaluator = qualityEvaluator;
    this.inference = new ConnectionInference(this, similarityEngine);
  }

  addThought(
    content: string,
    type: ThoughtType = 'regular',
    connections: Connection[] = [],
  ): string {
    const id = `thought-${randomUUID()}`;
    const acceptedConnections = connections.slice(0, LIMITS.MAX_CONNECTIONS_PER_THOUGHT);
    if (acceptedConnections.length < connections.length) {
      console.warn(
        `Smart-Thinking: thought ${id} exceeds LIMITS.MAX_CONNECTIONS_PER_THOUGHT (${LIMITS.MAX_CONNECTIONS_PER_THOUGHT}); extra connections ignored.`,
      );
    }

    const node: ThoughtNode = {
      id,
      content,
      type,
      timestamp: new Date(),
      connections: [...acceptedConnections],
      metrics: {
        confidence: 0.5,
        relevance: 0.5,
        quality: 0.5,
      },
      metadata: {
        sessionId: this.sessionId,
      },
    };

    this.nodes.set(id, node);
    this.establishConnections(id, acceptedConnections);
    this.eventEmitter.emit('thought-added', id, node);
    return id;
  }

  async updateMetricsForThought(thoughtId: string): Promise<void> {
    if (!this.qualityEvaluator) {
      console.warn('QualityEvaluator not available for metric update.');
      return;
    }
    const thought = this.getThought(thoughtId);
    if (!thought) return;

    try {
      const metrics = await this.qualityEvaluator.evaluate(thoughtId, this);
      this.updateThoughtMetrics(thoughtId, metrics);
      this.eventEmitter.emit('metrics-updated', thoughtId, metrics);
    } catch (error) {
      console.error(`Failed to update metrics for thought ${thoughtId}:`, error);
    }
  }

  private establishConnections(sourceId: string, connections: Connection[]): void {
    for (const connection of connections) {
      const targetNode = this.nodes.get(connection.targetId);
      if (!targetNode) continue;
      if (targetNode.connections.length >= LIMITS.MAX_CONNECTIONS_PER_THOUGHT) {
        console.warn(
          `Smart-Thinking: thought ${targetNode.id} is at LIMITS.MAX_CONNECTIONS_PER_THOUGHT; skipped reciprocal connection from ${sourceId}.`,
        );
        continue;
      }

      const existingReciprocal = targetNode.connections.find((conn) => conn.targetId === sourceId);
      if (existingReciprocal) continue;

      targetNode.connections.push({
        targetId: sourceId,
        type: getReciprocalConnectionType(connection.type),
        strength: connection.strength,
        description: connection.description,
        attributes: connection.attributes,
        inferred: connection.inferred,
        inferenceConfidence: connection.inferenceConfidence,
        bidirectional: connection.bidirectional,
        createdByStepId: connection.createdByStepId,
        justification: connection.justification,
        heuristicWeights: connection.heuristicWeights,
      });
    }
  }

  getThought(id: string): ThoughtNode | undefined {
    return this.nodes.get(id);
  }

  updateThoughtMetrics(id: string, metrics: Partial<ThoughtMetrics>): boolean {
    const thought = this.nodes.get(id);
    if (!thought) return false;

    if (!thought.metrics) {
      thought.metrics = { confidence: 0.5, relevance: 0.5, quality: 0.5 };
    }

    thought.metrics = {
      ...thought.metrics,
      ...metrics,
    };

    return true;
  }

  getAllThoughts(sessionId?: string): ThoughtNode[] {
    const allNodes = Array.from(this.nodes.values());
    if (!sessionId) return allNodes;
    return allNodes.filter((node) => node.metadata?.sessionId === sessionId);
  }

  getSessionThoughts(sessionId?: string): ThoughtNode[] {
    return this.getAllThoughts(sessionId ?? this.sessionId);
  }

  getRecentThoughts(limit: number = 5, sessionId?: string): ThoughtNode[] {
    const thoughts = this.getAllThoughts(sessionId);
    return thoughts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getConnectedThoughts(thoughtId: string): ThoughtNode[] {
    const thought = this.nodes.get(thoughtId);
    if (!thought) return [];

    return thought.connections
      .map((conn) => this.nodes.get(conn.targetId))
      .filter((node): node is ThoughtNode => node !== undefined);
  }

  async getRelevantThoughts(context: string, limit: number = 5, sessionId?: string): Promise<ThoughtNode[]> {
    const scopedThoughts = this.getAllThoughts(sessionId ?? this.sessionId);

    if (scopedThoughts.length === 0 || !this.similarityEngine) {
      console.warn('SimilarityEngine not available or no thoughts in graph. Falling back to keyword relevance.');
      return this.getRelevantThoughtsWithKeywords(context, limit, scopedThoughts);
    }

    try {
      const similarResults = await this.similarityEngine.findSimilarTexts(
        context,
        scopedThoughts.map((thought) => thought.content),
        limit,
      );

      const buckets = new Map<string, ThoughtNode[]>();
      for (const thought of scopedThoughts) {
        const bucket = buckets.get(thought.content);
        if (bucket) {
          bucket.push(thought);
        } else {
          buckets.set(thought.content, [thought]);
        }
      }

      const selected: ThoughtNode[] = [];
      for (const result of similarResults) {
        const node = buckets.get(result.text)?.shift();
        if (node) selected.push(node);
      }
      return selected;
    } catch (error) {
      console.error('Erreur lors de la recherche de pensées pertinentes avec embeddings:', error);
      return this.getRelevantThoughtsWithKeywords(context, limit, scopedThoughts);
    }
  }

  private getRelevantThoughtsWithKeywords(
    context: string,
    limit: number,
    thoughts: ThoughtNode[],
  ): ThoughtNode[] {
    const contextWords = context.toLowerCase().split(/\W+/).filter((word) => word.length > 3);
    if (contextWords.length === 0) return [];

    return thoughts
      .map((thought) => {
        const thoughtWords = thought.content.toLowerCase().split(/\W+/).filter((word) => word.length > 3);
        const matchingWords = contextWords.filter((word) => thoughtWords.includes(word));
        return { thought, score: matchingWords.length / contextWords.length };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.thought);
  }

  createHyperlink(
    nodeIds: string[],
    type: ConnectionType,
    label?: string,
    attributes?: ConnectionAttributes,
    strength: number = 0.5,
  ): string {
    const distinctIds = [...new Set(nodeIds)];
    const missingIds = distinctIds.filter((id) => !this.nodes.has(id));
    if (missingIds.length > 0) {
      throw new ValidationError('Hyperlink references unknown thoughts.', { missingIds });
    }
    if (distinctIds.length < 2) {
      throw new ValidationError('A hyperlink requires at least two distinct thoughts.', { nodeIds });
    }

    const id = `hl-${randomUUID()}`;
    const hyperlink: Hyperlink = {
      id,
      nodeIds: distinctIds,
      type,
      label,
      attributes,
      strength,
      inferred: false,
      confidence: 1.0,
      metadata: {
        createdAt: new Date(),
        sessionId: this.sessionId,
      },
    };

    this.hyperlinks.set(id, hyperlink);
    return id;
  }

  getHyperlink(id: string): Hyperlink | undefined {
    return this.hyperlinks.get(id);
  }

  getAllHyperlinks(sessionId?: string): Hyperlink[] {
    const allLinks = Array.from(this.hyperlinks.values());
    if (!sessionId) return allLinks;
    return allLinks.filter((link) => link.metadata?.sessionId === sessionId);
  }

  getHyperlinksForThought(thoughtId: string, sessionId?: string): Hyperlink[] {
    const thought = this.getThought(thoughtId);
    if (!thought || (sessionId && thought.metadata?.sessionId !== sessionId)) {
      return [];
    }

    const allLinks = this.getAllHyperlinks(sessionId);
    return allLinks.filter((hyperlink) => hyperlink.nodeIds.includes(thoughtId));
  }

  async inferRelations(confidenceThreshold: number = 0.7, sessionId?: string): Promise<number> {
    if (!this.similarityEngine) {
      console.error('SimilarityEngine non disponible pour l\'inférence de relations');
    }
    return this.inference.inferRelations(confidenceThreshold, sessionId ?? this.sessionId);
  }

  enrichThoughtConnections(thoughtId: string): number {
    return this.inference.enrichThoughtConnections(thoughtId);
  }

  async suggestNextSteps(limit: number = 3, sessionId?: string): Promise<NextStepSuggestion[]> {
    const scopedSession = sessionId ?? this.sessionId;
    const thoughts = this.getAllThoughts(scopedSession);
    const hyperlinks = this.getAllHyperlinks(scopedSession);
    return buildNextStepSuggestions(thoughts, hyperlinks, limit);
  }

  updateThoughtContent(id: string, newContent: string): boolean {
    const thought = this.nodes.get(id);
    if (!thought) return false;

    const oldContent = thought.content;
    thought.content = newContent;
    thought.metadata.lastUpdated = new Date();
    this.eventEmitter.emit('thought-updated', id, thought, { oldContent });
    return true;
  }

  clear(): void {
    this.nodes.clear();
    this.hyperlinks.clear();
  }

  exportToJson(): string {
    return JSON.stringify(Array.from(this.nodes.values()));
  }

  exportEnrichedGraph(): string {
    const exportData = {
      nodes: Array.from(this.nodes.values()),
      hyperlinks: Array.from(this.hyperlinks.values()),
    };

    return JSON.stringify(exportData, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }

  importFromJson(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (!Array.isArray(parsed)) {
        throw new ValidationError('Expected a JSON array of thought nodes.');
      }

      this.clear();
      for (const raw of parsed) {
        const node = raw as ThoughtNode;
        this.rehydrateNode(node);
        this.nodes.set(node.id, node);
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'importation du graphe:', error);
      return false;
    }
  }

  // Merge semantics: each top-level array replaces its collection independently; omitted or invalid fields leave the existing collection untouched.
  importEnrichedGraph(json: string): boolean {
    try {
      const data = JSON.parse(json) as { nodes?: unknown; hyperlinks?: unknown };

      if (Array.isArray(data.nodes)) {
        this.nodes.clear();
        for (const raw of data.nodes) {
          const node = raw as ThoughtNode;
          this.rehydrateNode(node);
          this.nodes.set(node.id, node);
        }
      }

      if (Array.isArray(data.hyperlinks)) {
        this.hyperlinks.clear();
        for (const raw of data.hyperlinks) {
          const hyperlink = raw as Hyperlink;
          if (hyperlink.metadata?.createdAt) {
            hyperlink.metadata.createdAt = new Date(hyperlink.metadata.createdAt as string);
          }
          this.hyperlinks.set(hyperlink.id, hyperlink);
        }
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'importation du graphe enrichi:', error);
      return false;
    }
  }

  private rehydrateNode(node: ThoughtNode): void {
    if (node.timestamp) node.timestamp = new Date(node.timestamp);
    if (node.metadata?.lastUpdated) node.metadata.lastUpdated = new Date(node.metadata.lastUpdated as string);
    if (node.metadata?.verificationTimestamp) {
      node.metadata.verificationTimestamp = new Date(node.metadata.verificationTimestamp as string);
    }
  }
}
