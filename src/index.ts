#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EnhancedStdioServerTransport } from './utils/platform-stdio';
import { z } from 'zod';
import { MemoryManager } from './memory-manager';
import { ToolIntegrator } from './tool-integrator';
import { QualityEvaluator } from './quality-evaluator';
import { Visualizer } from './visualizer';
import { SimilarityEngine } from './similarity-engine';
import { FeatureFlags } from './feature-flags';
import { MetricsCalculator } from './metrics-calculator';
import { SmartThinkingParams } from './types';
import { VerificationMemory } from './verification-memory';
import { ServiceContainer } from './services/service-container';
import path from 'path';
import { constants as fsConstants, promises as fs } from 'fs';
import { PlatformConfig } from './config';
import { PathUtils } from './utils/path-utils';
import { ReasoningOrchestrator } from './reasoning-orchestrator';

/**
 * Point d'entrée du serveur MCP Smart-Thinking
 */

// Protection contre les messages non-JSON envoyés à stdout
const originalStdoutWrite = process.stdout.write;

// Fonction de gestion des sorties pour éviter les problèmes de types
const safeStdoutWrite = function() {
  const chunk = arguments[0];

  if (typeof chunk === 'string') {
    const trimmed = chunk.trim();

    // Si ça ressemble à du JSON mais n'en est pas
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && !isValidJSON(trimmed)) {
      console.error('[ERREUR] JSON invalide détecté:', chunk);
      try {
        // Sur Windows, ajoutons un saut de ligne supplémentaire pour éviter les problèmes de buffering
        const safeMessage = JSON.stringify({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: chunk }]
          }
        }) + (PlatformConfig.IS_WINDOWS ? '\n' : '');
        
        return originalStdoutWrite.call(process.stdout, safeMessage, arguments[1], arguments[2]);
      } catch(e) {
        console.error('[ERREUR] Impossible de corriger le JSON:', e);
        process.stderr.write(chunk, arguments[1] as any);
        if (typeof arguments[2] === 'function') arguments[2]();
        return true;
      }
    }

    // Si c'est du texte brut (non-JSON)
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      console.error('[INFO] Texte non-JSON redirigé vers stderr:', chunk);
      process.stderr.write(chunk, arguments[1] as any);
      if (typeof arguments[2] === 'function') arguments[2]();
      return true;
    }
  }

  // Comportement normal pour le JSON valide ou les non-strings
  return originalStdoutWrite.apply(process.stdout, arguments as any);
};

// Remplacer process.stdout.write par notre version sécurisée
process.stdout.write = safeStdoutWrite as any;

/**
 * Vérifie si une chaîne est un JSON valide
 * @param str Chaîne à vérifier
 * @returns true si la chaîne est un JSON valide
 */
function isValidJSON(str: string): boolean {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed) return false;
  
  // Vérifier si la chaîne a une structure JSON de base
  if (!(trimmed.startsWith('{') && trimmed.endsWith('}')) && 
      !(trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return false;
  }
  
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

// Récupérer les informations du package.json pour la version
const packageInfo = require(path.join(__dirname, '..', 'package.json'));
const version = packageInfo.version || '1.0.3';

// Afficher un message de bienvenue (désactivé pour éviter les messages en rouge sur Cline)
// console.error(`
// ╔══════════════════════════════════════════════════════════════╗
// ║                                                              ║
// ║      Smart-Thinking MCP Server                               ║
// ║      Un outil de raisonnement multi-dimensionnel avancé      ║
// ║                                                              ║
// ║      Version: ${version}                                     ║
// ║                                                              ║
// ║      Démarrage du serveur...                                ║
// ║                                                              ║
// ╚══════════════════════════════════════════════════════════════╝
// `);

// Initialisation des services
if (FeatureFlags.externalEmbeddingEnabled) {
  console.warn('FeatureFlags.externalEmbeddingEnabled est activé mais aucun fournisseur externe n\'est disponible.');
}
const similarityEngine = new SimilarityEngine();
const metricsCalculator = new MetricsCalculator();
const qualityEvaluator = new QualityEvaluator();
const toolIntegrator = new ToolIntegrator();
// Note: ThoughtGraph and MemoryManager instances are typically created per request or session
// For simplicity in this example, we'll manage session context within the handler.
// A more robust implementation might use a factory or manage instances per session ID.
const globalSimilarityEngine = similarityEngine; // Keep a global instance
const globalQualityEvaluator = qualityEvaluator; // Keep a global instance
const globalToolIntegrator = toolIntegrator; // Keep a global instance
const globalMetricsCalculator = metricsCalculator; // Keep a global instance
// Get ServiceContainer instance first
const serviceContainer = ServiceContainer.getInstance();
// Initialize services if not already done (assuming initializeServices handles idempotency or is called only once)
serviceContainer.initializeServices(globalToolIntegrator, globalMetricsCalculator, globalSimilarityEngine);
// Now get the verification service
const globalVerificationService = serviceContainer.getVerificationService();
const globalMemoryManager = new MemoryManager(globalSimilarityEngine); // Global memory manager for persistence
const visualizer = new Visualizer(); // Visualizer can likely remain global
const verificationMemory = VerificationMemory.getInstance(); // Singleton

// Configuration des dépendances (assurez-vous que les services globaux sont configurés)
verificationMemory.setSimilarityEngine(globalSimilarityEngine);
// Ensure quality evaluator uses the correct verification service instance
globalQualityEvaluator.setVerificationService(globalVerificationService);

const orchestrator = new ReasoningOrchestrator({
  similarityEngine: globalSimilarityEngine,
  qualityEvaluator: globalQualityEvaluator,
  verificationService: globalVerificationService,
  toolIntegrator: globalToolIntegrator,
  metricsCalculator: globalMetricsCalculator,
  visualizer,
  memoryManager: globalMemoryManager
});

// Note: Event listeners on a per-session graph would need careful management.
// For this fix, we'll assume events are handled within the request lifecycle or globally if appropriate.

// Créer une instance du serveur MCP
const server = new McpServer({
  name: "smart-thinking-mcp",
  version: version,
  capabilities: {}
});

// ======================================================================
// REFACTORISATION DES SCHÉMAS POUR COMPATIBILITÉ MCP
// ======================================================================

// 1. Définition des types d'énumération en constantes nommées pour plus de clarté
const ThoughtTypeEnum = z.enum(['regular', 'revision', 'meta', 'hypothesis', 'conclusion']);

const ConnectionTypeEnum = z.enum([
  'supports', 'contradicts', 'refines', 'branches', 'derives', 'associates', 
  'exemplifies', 'generalizes', 'compares', 'contrasts', 'questions', 
  'extends', 'analyzes', 'synthesizes', 'applies', 'evaluates', 'cites',
  'extended-by', 'analyzed-by', 'component-of', 'applied-by', 'evaluated-by', 'cited-by'
]);

const TemporalityEnum = z.enum(['before', 'after', 'during', 'concurrent']);
const CertaintyEnum = z.enum(['definite', 'high', 'moderate', 'low', 'speculative']);
const DirectionalityEnum = z.enum(['unidirectional', 'bidirectional', 'multidirectional']);
const ScopeEnum = z.enum(['broad', 'specific', 'partial', 'complete']);
const NatureEnum = z.enum(['causal', 'correlational', 'sequential', 'hierarchical', 'associative']);
const VisualizationTypeEnum = z.enum(['graph', 'chronological', 'thematic', 'hierarchical', 'force', 'radial']);
const ClusterByEnum = z.enum(['type', 'theme', 'metric', 'connectivity']);
const DirectionEnum = z.enum(['LR', 'RL', 'TB', 'BT']);

// 2. Définition explicite des schémas d'attributs
const ConnectionAttributesSchema = z.object({
  temporality: TemporalityEnum.optional(),
  certainty: CertaintyEnum.optional(),
  directionality: DirectionalityEnum.optional(),
  scope: ScopeEnum.optional(),
  nature: NatureEnum.optional(),
  // Utiliser un type spécifique au lieu de any
  customAttributes: z.record(z.string()).optional()
});

// 3. Schéma pour les connexions avec tous les types explicites
const ConnectionSchema = z.object({
  targetId: z.string().describe("ID de la pensée cible"),
  type: ConnectionTypeEnum.describe("Type de connexion"),
  strength: z.number().min(0).max(1).describe("Force de la connexion (0 à 1)"),
  description: z.string().optional().describe("Description optionnelle de la connexion"),
  attributes: ConnectionAttributesSchema.optional(),
  inferred: z.boolean().optional().describe("Si la connexion a été inférée automatiquement"),
  inferenceConfidence: z.number().min(0).max(1).optional().describe("Confiance dans l'inférence (0 à 1)"),
  bidirectional: z.boolean().optional().describe("Si la relation est intrinsèquement bidirectionnelle")
});

// 4. Schémas pour les options avancées
// Remplacer les z.any() par des types spécifiques
const MetricThresholdsSchema = z.object({
  confidence: z.tuple([z.number(), z.number()]).optional(),
  relevance: z.tuple([z.number(), z.number()]).optional(),
  quality: z.tuple([z.number(), z.number()]).optional()
});

const FilterOptionsSchema = z.object({
  nodeTypes: z.array(ThoughtTypeEnum).optional(),
  connectionTypes: z.array(ConnectionTypeEnum).optional(),
  metricThresholds: MetricThresholdsSchema.optional(),
  textSearch: z.string().optional(),
  dateRange: z.tuple([z.date(), z.date()]).optional(),
  // Remplacer z.any() par z.unknown() pour les types inconnus
  customFilters: z.record(z.unknown()).optional()
}).optional();

const InteractivityOptionsSchema = z.object({
  zoomable: z.boolean().optional(),
  draggable: z.boolean().optional(),
  selectable: z.boolean().optional(),
  tooltips: z.boolean().optional(),
  expandableNodes: z.boolean().optional(),
  initialZoom: z.number().optional(),
  zoomRange: z.tuple([z.number(), z.number()]).optional(),
  highlightOnHover: z.boolean().optional()
}).optional();

// 5. Schéma des options de visualisation
const VisualizationOptionsSchema = z.object({
  clusterBy: ClusterByEnum.optional()
      .describe('Critère de regroupement des nœuds en clusters'),
  direction: DirectionEnum.optional().default('TB')
      .describe('Direction de la disposition hiérarchique'),
  centerNode: z.string().optional()
      .describe('ID du nœud central pour les visualisations radiales ou hiérarchiques'),
  maxDepth: z.number().optional()
      .describe('Profondeur maximale pour les visualisations hiérarchiques ou radiales'),
  filters: FilterOptionsSchema
      .describe('Options de filtrage des nœuds et des liens'),
  interactivity: InteractivityOptionsSchema
      .describe('Options d\'interactivité pour la visualisation')
}).optional();

/**
 * Schéma des paramètres pour l'outil smartthinking
 * ----------------------------------------------
 * Ce schéma définit tous les paramètres que Claude peut utiliser
 * pour interagir avec l'outil Smart-Thinking
 */
const SmartThinkingParamsSchema = z.object({
  thought: z.string().describe(
      'Le contenu de la pensée à analyser - PARAMÈTRE OBLIGATOIRE - Cette pensée sera ajoutée au graphe de raisonnement'
  ),

  thoughtType: ThoughtTypeEnum.default('regular')
      .describe(
          'Type de pensée dans le graphe de raisonnement - Détermine la fonction de cette pensée'
      ),

  connections: z.array(ConnectionSchema).default([])
      .describe(
          'Connexions à d\'autres pensées - Permet de lier cette pensée à d\'autres pensées du graphe'
      ),

  requestSuggestions: z.boolean().default(false)
      .describe(
          'Demander des suggestions d\'amélioration du raisonnement'
      ),

  generateVisualization: z.boolean().default(false)
      .describe(
          'Générer une visualisation du graphe de pensée'
      ),

  visualizationType: VisualizationTypeEnum.default('graph')
      .describe(
          'Type de visualisation à générer'
      ),

  suggestTools: z.boolean().default(true)
      .describe(
          'Suggérer des outils MCP pertinents pour cette étape du raisonnement'
      ),

  sessionId: z.string().optional()
      .describe(
          'Identifiant de session pour maintenir l\'état entre les appels'
      ),

  userId: z.string().optional()
      .describe(
          'Identifiant de l\'utilisateur pour la personnalisation'
      ),

  help: z.boolean().default(true)
      .describe(
          'Afficher le guide d\'utilisation complet'
      ),

  requestVerification: z.boolean().default(false)
      .describe(
          'Demander explicitement une vérification des informations'
      ),

  containsCalculations: z.boolean().default(false)
      .describe(
          'Indique si la pensée contient des calculs à vérifier'
      ),

  visualizationOptions: VisualizationOptionsSchema
      .describe('Options avancées pour la visualisation')
});

/**
 * Définition de l'outil smartthinking
 * -----------------------------------
 * Cet outil permet à Claude d'utiliser le système de raisonnement Smart-Thinking
 */
server.tool(
    'smartthinking',
    SmartThinkingParamsSchema.shape,

    async (params: SmartThinkingParams) => {
      if (params.help && !params.thought) {
        return {
          content: [
            {
              type: 'text',
              text: `# Smart-Thinking - Guide d'utilisation

Smart-Thinking est un outil de raisonnement multi-dimensionnel qui organise les pensées en graphe plutôt qu'en séquence linéaire, permettant une analyse plus riche et interconnectée des problèmes complexes.

## Paramètres principaux

- **thought** (obligatoire): La pensée à analyser
- **thoughtType**: Type de pensée (regular, revision, meta, hypothesis, conclusion)
- **connections**: Liens vers d'autres pensées [{targetId, type, strength}]
- **requestSuggestions**: Demander des suggestions d'amélioration
- **generateVisualization**: Créer une représentation visuelle du graphe
- **requestVerification**: Vérifier les informations contenues dans la pensée
- **containsCalculations**: Activer la vérification des calculs mathématiques

## Types de pensées

- **regular**: Pensée standard pour développer une idée
- **meta**: Réflexion sur le processus de raisonnement lui-même
- **hypothesis**: Formulation d'une hypothèse à tester
- **revision**: Modification d'une pensée précédente
- **conclusion**: Synthèse finale ou déduction

## Types de connexions

- **supports**: Pensée qui renforce une autre
- **contradicts**: Pensée qui s'oppose à une autre
- **refines**: Pensée qui précise ou améliore une autre
- **branches**: Pensée qui explore une nouvelle direction
- **derives**: Pensée qui découle logiquement d'une autre
- **associates**: Pensée simplement liée à une autre

## Types de visualisations

- **graph**: Réseau standard de connexions
- **chronological**: Timeline d'évolution du raisonnement
- **thematic**: Clusters par thèmes similaires
- **hierarchical**: Structure arborescente
- **force**: Disposition basée sur forces d'attraction/répulsion
- **radial**: Cercles concentriques autour d'une pensée centrale

## Exemple d'utilisation

\`\`\`
Utilise l'outil smartthinking avec:
thought: "L'intelligence artificielle transformera profondément le marché du travail"
thoughtType: "hypothesis"
generateVisualization: true
\`\`\`
`
            }
          ]
        };
      }

      if (!params.thought) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: "Le paramètre 'thought' est obligatoire.",
                message: "Vous devez fournir une pensée à analyser."
              }, null, 2)
            }
          ]
        };
      }

      const { response } = await orchestrator.run(params);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
);

// Initialisation du transport avec notre version améliorée pour la compatibilité cross-plateforme
const transport = new EnhancedStdioServerTransport();

/**
 * Crée le répertoire de données si nécessaire
 * Compatible avec toutes les plateformes (Windows, Mac, Linux)
 */
async function ensureDataDirExists() {
  // Utiliser l'utilitaire de chemins pour un chemin normalisé
  const dataDir = PathUtils.getDataDirectory();
  
  try {
    await fs.mkdir(dataDir, { recursive: true });
    // console.error(`Smart-Thinking: Répertoire data créé ou confirmé: ${dataDir}`);
    
    // Sur Windows, vérifier les droits d'accès explicitement
    if (PlatformConfig.IS_WINDOWS) {
      try {
        // Vérifier l'accès en écriture
        await fs.access(dataDir, fsConstants.W_OK);
      } catch {
        // console.error(`Smart-Thinking: AVERTISSEMENT - Problème de permissions sur le répertoire data: ${accessError instanceof Error ? accessError.message : String(accessError)}`);
        // console.error('Smart-Thinking: Essayez d\'exécuter l\'application avec des droits d\'administrateur ou choisissez un autre emplacement.');
      }
    }
  } catch {
    // Erreur ignorée, utiliser un répertoire par défaut sans message
    // Essayer un répertoire alternatif sur Windows en cas d'échec
    if (PlatformConfig.IS_WINDOWS) {
      const altDataDir = path.join(process.env.USERPROFILE || '', 'Documents', 'Smart-Thinking', 'data');
      try {
        await fs.mkdir(altDataDir, { recursive: true });
        // Log supprimé pour éviter les messages sur Cline
      } catch {
        // Log d'erreur supprimé
      }
    }
  }
}

// Démarrage du serveur
async function start() {
  try {
    await ensureDataDirExists();
    await server.connect(transport);
    // Démarrage silencieux pour éviter les messages en rouge sur Cline
    // console.error('Smart-Thinking MCP Server démarré avec succès.');
    // console.error('L\'outil "smartthinking" est maintenant disponible pour Claude.');
  } catch {
    // Sortie silencieuse en cas d'erreur pour éviter les messages en rouge
    process.exit(1);
  }
}

start();
