#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EnhancedStdioServerTransport } from './utils/platform-stdio';
import { z } from 'zod';
import { ThoughtGraph } from './thought-graph';
import { MemoryManager } from './memory-manager';
import { ToolIntegrator } from './tool-integrator';
import { QualityEvaluator } from './quality-evaluator';
import { Visualizer } from './visualizer';
import { EmbeddingService } from './embedding-service';
import { MetricsCalculator } from './metrics-calculator';
import { SmartThinkingParams, SmartThinkingResponse, FilterOptions, InteractivityOptions, VerificationStatus, VerificationResult, CalculationVerificationResult, VerificationDetailedStatus, ThoughtMetrics, Connection, ThoughtNode } from './types';
import { VerificationMemory } from './verification-memory';
import { ServiceContainer } from './services/service-container';
import path from 'path';
import { promises as fs } from 'fs';
import { VerificationConfig, PlatformConfig } from './config';
import { PathUtils } from './utils/path-utils';

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
  } catch (e) {
    return false;
  }
}

// Récupérer les informations du package.json pour la version
const packageInfo = require(path.join(__dirname, '..', 'package.json'));
const version = packageInfo.version || '1.0.3';

// Afficher un message de bienvenue
console.error(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║      Smart-Thinking MCP Server                               ║
║      Un outil de raisonnement multi-dimensionnel avancé      ║
║                                                              ║
║      Version: ${version}                                     ║
║                                                              ║
║      Démarrage du serveur...                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Initialisation des services
const COHERE_API_KEY = 'DckObDtnnRkPQQK6dwooI7mAB60HmmhNh1OBD23K';
const embeddingService = new EmbeddingService(COHERE_API_KEY);
const metricsCalculator = new MetricsCalculator();
const qualityEvaluator = new QualityEvaluator();
const toolIntegrator = new ToolIntegrator();
const thoughtGraph = new ThoughtGraph(undefined, embeddingService, qualityEvaluator);
const memoryManager = new MemoryManager(embeddingService);
const visualizer = new Visualizer();
const verificationMemory = VerificationMemory.getInstance();

// Configuration des dépendances
verificationMemory.setEmbeddingService(embeddingService);
const serviceContainer = ServiceContainer.getInstance();
serviceContainer.initializeServices(toolIntegrator, metricsCalculator, embeddingService);
const verificationService = serviceContainer.getVerificationService();
qualityEvaluator.setVerificationService(verificationService);

// Configuration des écouteurs d'événements
thoughtGraph.on('calculations-verified', (data: {thoughtId: string, verifiedCalculations: CalculationVerificationResult[], updatedContent: string}) => {
  console.error(`Smart-Thinking: Calculs vérifiés pour la pensée ${data.thoughtId}`);
});

// Créer une instance du serveur MCP
const server = new McpServer({
  name: "smart-thinking-mcp",
  version: version,
  capabilities: {}
});

// Schémas Zod pour les options avancées
const FilterOptionsSchema = z.object({
  nodeTypes: z.array(z.enum(['regular', 'revision', 'meta', 'hypothesis', 'conclusion'])).optional(),
  connectionTypes: z.array(z.enum(['supports', 'contradicts', 'refines', 'branches', 'derives', 'associates'])).optional(),
  metricThresholds: z.object({
    confidence: z.tuple([z.number(), z.number()]).optional(),
    relevance: z.tuple([z.number(), z.number()]).optional(),
    quality: z.tuple([z.number(), z.number()]).optional()
  }).optional(),
  textSearch: z.string().optional(),
  dateRange: z.tuple([z.date(), z.date()]).optional(),
  customFilters: z.record(z.any()).optional()
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

  thoughtType: z.enum(['regular', 'revision', 'meta', 'hypothesis', 'conclusion']).default('regular')
      .describe(
          'Type de pensée dans le graphe de raisonnement - Détermine la fonction de cette pensée'
      ),

  connections: z.array(z.any()).default([])
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

  visualizationType: z.enum(['graph', 'chronological', 'thematic', 'hierarchical', 'force', 'radial']).default('graph')
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

  visualizationOptions: z.object({
    clusterBy: z.enum(['type', 'theme', 'metric', 'connectivity']).optional()
        .describe('Critère de regroupement des nœuds en clusters'),
    direction: z.enum(['LR', 'RL', 'TB', 'BT']).optional().default('TB')
        .describe('Direction de la disposition hiérarchique'),
    centerNode: z.string().optional()
        .describe('ID du nœud central pour les visualisations radiales ou hiérarchiques'),
    maxDepth: z.number().optional()
        .describe('Profondeur maximale pour les visualisations hiérarchiques ou radiales'),
    filters: FilterOptionsSchema
        .describe('Options de filtrage des nœuds et des liens'),
    interactivity: InteractivityOptionsSchema
        .describe('Options d\'interactivité pour la visualisation')
  }).optional()
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
      // Si help=true et aucune pensée n'est fournie, afficher le guide d'utilisation
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

      // Vérifier si le paramètre 'thought' est présent
      if (!params.thought) {
        console.error('Smart-Thinking: ERROR - Paramètre "thought" manquant');
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

      console.error('Smart-Thinking: traitement de la pensée:', params.thought);

      // Traitement de la pensée
      const preliminaryResult = await verificationService.performPreliminaryVerification(
        params.thought,
        !!params.containsCalculations
      );
      
      const thoughtId = thoughtGraph.addThought(
          preliminaryResult.preverifiedThought,
          params.thoughtType,
          params.connections
      );

      // Évaluation de la qualité
      const qualityMetrics = qualityEvaluator.evaluate(thoughtId, thoughtGraph);
      thoughtGraph.updateThoughtMetrics(thoughtId, qualityMetrics);

      // Détermination du statut de vérification
      let verificationStatus: VerificationDetailedStatus = 'unverified';
      let certaintySummary = "Information non vérifiée";

      if (preliminaryResult.verificationInProgress) {
        if (preliminaryResult.initialVerification) {
          verificationStatus = 'partially_verified';
          certaintySummary = `Calculs vérifiés préalablement, niveau de confiance initial: ${Math.round(qualityMetrics.confidence * 100)}%.`;
        } else {
          verificationStatus = 'verification_in_progress';
          certaintySummary = "Vérification des calculs en cours...";
        }
      } else if (params.containsCalculations) {
        certaintySummary = `Information non vérifiée, niveau de confiance: ${Math.round(qualityMetrics.confidence * 100)}%. Aucun calcul n'a été détecté pour vérification.`;
      } else {
        certaintySummary = `Information non vérifiée, niveau de confiance: ${Math.round(qualityMetrics.confidence * 100)}%. Pour une vérification complète, utilisez le paramètre requestVerification=true.`;
      }

      // Préparation de la réponse initiale
      const response: SmartThinkingResponse = {
        thoughtId,
        thought: preliminaryResult.preverifiedThought,
        thoughtType: params.thoughtType || 'regular',
        qualityMetrics,
        isVerified: preliminaryResult.initialVerification,
        verificationStatus: verificationStatus,
        certaintySummary: certaintySummary,
        reliabilityScore: metricsCalculator.calculateReliabilityScore(
          qualityMetrics, 
          preliminaryResult.initialVerification ? 'partially_verified' as VerificationStatus : 'unverified' as VerificationStatus, 
          preliminaryResult.verifiedCalculations,
          undefined // Pas de score précédent pour la première pensée
        )
      };
      
      // Traitement des calculs vérifiés
      if (preliminaryResult.verifiedCalculations && preliminaryResult.verifiedCalculations.length > 0) {
        response.isVerified = true;
        response.verificationStatus = 'partially_verified';
        response.verification = {
          status: preliminaryResult.initialVerification ? 'partially_verified' : 'inconclusive',
          confidence: qualityMetrics.confidence,
          sources: ['Vérification préliminaire des calculs'],
          verificationSteps: ['Détection et vérification préliminaire des expressions mathématiques'],
          verifiedCalculations: preliminaryResult.verifiedCalculations
        };

        const correctCalculations = preliminaryResult.verifiedCalculations.filter((calc: CalculationVerificationResult) => calc.isCorrect).length;
        const totalCalculations = preliminaryResult.verifiedCalculations.length;
        if (totalCalculations > 0) {
          const calculationAccuracy = correctCalculations / totalCalculations;
          response.reliabilityScore = (qualityMetrics.confidence * 0.7) + (calculationAccuracy * 0.3);
        }
      }

      // Vérification des informations précédemment vérifiées
      const thought = thoughtGraph.getThought(thoughtId);
      // Récupérer les IDs des pensées connectées
      const connectedThoughtIds = params.connections?.map(conn => conn.targetId) || [];
      // Appel amélioré avec type de pensée et connexions
      const previousResult = await verificationService.checkPreviousVerification(
        thought?.content || params.thought,
        params.sessionId || 'default',
        params.thoughtType || 'regular',
        connectedThoughtIds
      );
      
      if (previousResult.previousVerification) {
        response.isVerified = previousResult.isVerified;
        response.verificationStatus = previousResult.verificationStatus;
        response.certaintySummary = previousResult.certaintySummary;
        response.verification = previousResult.verification;
        response.reliabilityScore = metricsCalculator.calculateReliabilityScore(
          qualityMetrics,
          previousResult.verificationStatus as VerificationStatus,
          preliminaryResult.verifiedCalculations,
          response.reliabilityScore // Utiliser le score déjà calculé comme référence
        );
        
        if (thought) {
          thought.metadata.previousVerification = {
            similarity: previousResult.previousVerification.similarity,
            status: previousResult.previousVerification.status,
            confidence: previousResult.previousVerification.confidence,
            timestamp: previousResult.previousVerification.timestamp
          };
        }
      }

      // Vérification approfondie si nécessaire
      if ((qualityMetrics.confidence < VerificationConfig.CONFIDENCE.VERIFICATION_REQUIRED || params.requestVerification) && !previousResult.previousVerification) {
        console.error('Smart-Thinking: Confiance faible ou vérification demandée, vérification complète nécessaire...');
        
        try {
          if (thought) {
            response.verificationStatus = 'verification_in_progress';
            
            const verification = await verificationService.deepVerify(
              thought,
              params.containsCalculations || false,
              false,
              params.sessionId || 'default'
            );
            
            response.verification = verification;
            response.isVerified = verification.status === 'verified' || 
                            verification.status === 'partially_verified' || 
                            (!!verification.verifiedCalculations && verification.verifiedCalculations.length > 0);
            response.verificationStatus = verification.status;
            response.reliabilityScore = metricsCalculator.calculateReliabilityScore(
              qualityMetrics,
              verification.status as VerificationStatus,
              verification.verifiedCalculations,
              response.reliabilityScore // Utiliser le score déjà calculé comme référence
            );
            response.certaintySummary = metricsCalculator.generateCertaintySummary(
              verification.status as VerificationStatus,
              response.reliabilityScore
            );
            
            if (verification.verifiedCalculations && verification.verifiedCalculations.length > 0) {
              response.thought = verificationService.annotateThoughtWithVerifications(
                response.thought,
                verification.verifiedCalculations
              );
              thoughtGraph.updateThoughtContent(thoughtId, response.thought);
            }
          }
        } catch (error) {
          console.error('Smart-Thinking: Erreur lors de la vérification complète:', error);
          response.verificationStatus = 'inconclusive';
          response.certaintySummary = `Erreur lors de la vérification: ${error instanceof Error ? error.message : 'Erreur inconnue'}. Niveau de confiance: ${Math.round(qualityMetrics.confidence * 100)}%.`;
        }
      }

      // Fonctionnalités additionnelles selon les paramètres
      if (params.suggestTools) {
        response.suggestedTools = toolIntegrator.suggestTools(params.thought);
      }

      // Génération de visualisation si demandée
      if (params.generateVisualization) {
        try {
          const visualizationType = params.visualizationType || 'graph';
          const visualizationOptions = params.visualizationOptions || {};
          
          const generateVisualizationAsync = async () => {
            switch (visualizationType) {
              case 'chronological':
                return await Promise.resolve(visualizer.generateChronologicalVisualization(thoughtGraph));
              case 'thematic':
                return await Promise.resolve(visualizer.generateThematicVisualization(thoughtGraph));
              case 'hierarchical':
                return await Promise.resolve(visualizer.generateHierarchicalVisualization(
                  thoughtGraph,
                  visualizationOptions.centerNode,
                  {
                    direction: visualizationOptions.direction as any,
                    levelSeparation: 100,
                    clusterBy: visualizationOptions.clusterBy as any
                  }
                ));
              case 'force':
                return await Promise.resolve(visualizer.generateForceDirectedVisualization(
                  thoughtGraph,
                  {
                    clusterBy: visualizationOptions.clusterBy as any,
                    forceStrength: 0.5,
                    centerNode: visualizationOptions.centerNode
                  }
                ));
              case 'radial':
                return await Promise.resolve(visualizer.generateRadialVisualization(
                  thoughtGraph,
                  visualizationOptions.centerNode,
                  {
                    maxDepth: visualizationOptions.maxDepth,
                    radialDistance: 120
                  }
                ));
              case 'graph':
              default:
                return await Promise.resolve(visualizer.generateVisualization(thoughtGraph, thoughtId));
            }
          };
          
          response.visualization = await generateVisualizationAsync();
          
          if (visualizationOptions.filters && response.visualization) {
            response.visualization = visualizer.applyFilters(
              response.visualization,
              visualizationOptions.filters as FilterOptions
            );
          }
          
          if (response.visualization && response.visualization.nodes.length > 100) {
            response.visualization = visualizer.simplifyVisualization(response.visualization);
          }
        } catch (error) {
          console.error('Smart-Thinking: Erreur lors de la génération de la visualisation:', error);
        }
      }

      // Récupération des mémoires et suggestions
      const relevantMemoriesPromise = memoryManager.getRelevantMemories(params.thought);
      response.suggestedNextSteps = thoughtGraph.suggestNextSteps();
      response.relevantMemories = await relevantMemoriesPromise;

      // Stockage de la pensée dans la mémoire si sa qualité est suffisante
      if (response.qualityMetrics.quality > 0.7) {
        const tags = params.thought
            .toLowerCase()
            .split(/\W+/)
            .filter((word: string) => word.length > 4)
            .slice(0, 5);

        memoryManager.addMemory(params.thought, tags);
      }

      console.error('Smart-Thinking: pensée traitée avec succès, id:', thoughtId);

      // Retour de la réponse formatée pour MCP
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
    console.error(`Smart-Thinking: Répertoire data créé ou confirmé: ${dataDir}`);
    
    // Sur Windows, vérifier les droits d'accès explicitement
    if (PlatformConfig.IS_WINDOWS) {
      try {
        // Vérifier l'accès en écriture
        await fs.access(dataDir, fs.constants.W_OK);
      } catch (accessError) {
        console.error(`Smart-Thinking: AVERTISSEMENT - Problème de permissions sur le répertoire data: ${accessError instanceof Error ? accessError.message : String(accessError)}`);
        console.error('Smart-Thinking: Essayez d\'exécuter l\'application avec des droits d\'administrateur ou choisissez un autre emplacement.');
      }
    }
  } catch (error) {
    console.error(`Smart-Thinking: Erreur lors de la création du répertoire data: ${error}`);
    
    // Essayer un répertoire alternatif sur Windows en cas d'échec
    if (PlatformConfig.IS_WINDOWS) {
      const altDataDir = path.join(process.env.USERPROFILE || '', 'Documents', 'Smart-Thinking', 'data');
      try {
        await fs.mkdir(altDataDir, { recursive: true });
        console.error(`Smart-Thinking: Création d'un répertoire data alternatif: ${altDataDir}`);
      } catch (altError) {
        console.error(`Smart-Thinking: Échec de la création du répertoire alternatif: ${altError}`);
      }
    }
  }
}

// Démarrage du serveur
async function start() {
  try {
    await ensureDataDirExists();
    await server.connect(transport);
    console.error('Smart-Thinking MCP Server démarré avec succès.');
    console.error('L\'outil "smartthinking" est maintenant disponible pour Claude.');
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

start();