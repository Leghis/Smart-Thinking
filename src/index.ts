#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
import path from 'path';
import { promises as fs } from 'fs';

/**
 * Point d'entrée du serveur MCP Smart-Thinking
 */

// Protection contre les messages non-JSON envoyés à stdout
const originalStdoutWrite = process.stdout.write;

// Utiliser une autre approche pour éviter les problèmes de types
const safeStdoutWrite = function() {
  // Arguments[0] est le premier argument (chunk)
  const chunk = arguments[0];

  if (typeof chunk === 'string') {
    const trimmed = chunk.trim();

    // Si ça ressemble à du JSON mais n'en est pas
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && !isValidJSON(trimmed)) {
      console.error('[ERREUR] JSON invalide détecté:', chunk);
      // Tenter de le corriger en l'encapsulant dans un format valide
      try {
        const safeMessage = JSON.stringify({
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: chunk
              }
            ]
          }
        });
        // Utiliser directement la fonction originale
        return originalStdoutWrite.call(process.stdout, safeMessage, arguments[1], arguments[2]);
      } catch(e) {
        console.error('[ERREUR] Impossible de corriger le JSON:', e);
        // En cas d'échec, rediriger vers stderr
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

// Fonction utilitaire pour vérifier la validité JSON
function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Fonction de logging sécurisée pour le debugging
function safeLog(message: string): void {
  // Toujours utiliser stderr pour le debugging
  console.error(`[DEBUG] ${message}`);
}

/**
 * Vérifie les calculs dans une pensée si nécessaire
 * 
 * @param thought Le contenu de la pensée à vérifier
 * @param explicitlyRequested Si la vérification est explicitement demandée
 * @param evaluator L'instance du QualityEvaluator
 * @returns Un objet contenant les résultats de la vérification
 */
async function verifyCalculationsIfNeeded(
  thought: string, 
  explicitlyRequested: boolean = false, 
  evaluator: QualityEvaluator
): Promise<{
  verifiedCalculations: CalculationVerificationResult[] | undefined,
  initialVerification: boolean,
  verificationInProgress: boolean,
  preverifiedThought: string
}> {
  let verifiedCalculations: CalculationVerificationResult[] | undefined = undefined;
  let initialVerification = false;
  let verificationInProgress = false;
  let preverifiedThought = thought;
  
  // Détecter les calculs via des regex simples pour éviter un traitement lourd initial si non nécessaire
  const hasSimpleCalculations = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(thought);
  const hasComplexCalculations = /calcul\s*(?:complexe|avancé)?\s*:?\s*([^=]+)=\s*\d+/.test(thought);
  
  // Si des calculs sont présents ou explicité par le paramètre containsCalculations
  if (explicitlyRequested || hasSimpleCalculations || hasComplexCalculations) {
    console.error('Smart-Thinking: Détection préliminaire de calculs, vérification immédiate...');
    verificationInProgress = true; // Indiquer que la vérification est en cours
    
    try {
      // Utiliser la méthode asynchrone pour détecter et vérifier les calculs
      verifiedCalculations = await evaluator.detectAndVerifyCalculations(thought);
      
      // Marquer comme vérifié dès que des calculs ont été traités, qu'ils soient corrects ou non
      initialVerification = verifiedCalculations.length > 0;
      
      // Si des calculs ont été détectés, annoter la pensée
      if (verifiedCalculations.length > 0) {
        preverifiedThought = evaluator.annotateThoughtWithVerifications(thought, verifiedCalculations);
        console.error(`Smart-Thinking: ${verifiedCalculations.length} calculs détectés et vérifiés préalablement`);
      }
    } catch (error) {
      console.error('Smart-Thinking: Erreur lors de la vérification préliminaire des calculs:', error);
      verificationInProgress = true;
      initialVerification = false;
    }
  }
  
  return {
    verifiedCalculations,
    initialVerification,
    verificationInProgress,
    preverifiedThought
  };
}

/**
 * Vérifie si une pensée similaire a déjà été vérifiée dans des étapes précédentes
 * 
 * @param thought La pensée actuelle
 * @param thoughtGraph Le graphe de pensées
 * @param thoughtId L'ID de la pensée actuelle
 * @param connections Les connexions avec d'autres pensées
 * @param embeddingService Le service d'embeddings
 * @returns Un résultat de vérification si trouvé, null sinon
 */
async function checkPreviousVerification(
  thought: ThoughtNode,
  thoughtGraph: ThoughtGraph,
  thoughtId: string,
  connections: Connection[] | undefined,
  embeddingService: EmbeddingService
): Promise<{
  previousVerification: any | null,
  verification?: VerificationResult,
  isVerified: boolean,
  verificationStatus: VerificationDetailedStatus,
  certaintySummary: string
}> {
  // Valeurs par défaut
  const result = {
    previousVerification: null,
    isVerified: false,
    verificationStatus: 'unverified' as VerificationDetailedStatus,
    certaintySummary: 'Information non vérifiée'
  };
  
  // Si pas de connexions ou pas de pensée, rien à vérifier
  if (!connections || connections.length === 0 || !thought) {
    return result;
  }
  
  console.error('Smart-Thinking: Vérification des connections avec les pensées précédentes...');
  
  // Parcourir les connexions pour trouver les pensées précédentes
  for (const connection of connections) {
    const targetId = connection.targetId;
    const previousThought = thoughtGraph.getThought(targetId);
    
    if (previousThought?.metadata?.verificationResult) {
      console.error(`Pensée précédente trouvée avec vérification: ${targetId}`);
      
      try {
        // Obtenir les embeddings des deux textes
        const thoughtEmbedding = await embeddingService.getEmbedding(thought.content);
        const previousThoughtEmbedding = await embeddingService.getEmbedding(previousThought.content);
        
        // Calculer la similarité entre les embeddings
        const similarity = embeddingService.calculateCosineSimilarity(
          thoughtEmbedding,
          previousThoughtEmbedding
        );
        
        console.error(`Similarité sémantique avec la pensée précédente: ${similarity}`);
        
        // Si la similarité est suffisamment élevée, réutiliser le statut de vérification
        if (similarity > 0.85) {
          const previousVerificationData = previousThought.metadata.verificationResult;
          
          // Stocker la référence à la précédente vérification
          thought.metadata.previousVerification = {
            thoughtId: targetId,
            similarity,
            status: previousVerificationData.status,
            confidence: previousVerificationData.confidence,
            timestamp: previousVerificationData.timestamp
          };
          
          // Préparer la réponse avec les informations de vérification
          return {
            previousVerification: previousVerificationData,
            isVerified: ['verified', 'partially_verified'].includes(previousVerificationData.status),
            verificationStatus: previousVerificationData.status as VerificationDetailedStatus,
            certaintySummary: `Information vérifiée précédemment dans le raisonnement avec ${Math.round(similarity * 100)}% de similarité. Niveau de confiance: ${Math.round(previousVerificationData.confidence * 100)}%.`,
            verification: {
              status: previousVerificationData.status,
              confidence: previousVerificationData.confidence,
              sources: previousVerificationData.sources || [],
              verificationSteps: ['Information vérifiée dans une étape précédente du raisonnement'],
              notes: `Cette information est très similaire (${Math.round(similarity * 100)}%) à une information déjà vérifiée précédemment.`
            }
          };
        }
      } catch (error) {
        console.error('Erreur lors de la comparaison sémantique:', error);
      }
    }
  }
  
  // Aucune vérification précédente n'a été trouvée
  return result;
}

/**
 * Effectue une vérification approfondie d'une pensée
 * 
 * @param thought La pensée à vérifier
 * @param thoughtId L'ID de la pensée
 * @param thoughtGraph Le graphe de pensées
 * @param evaluator L'évaluateur de qualité
 * @param toolIntegrator L'intégrateur d'outils
 * @param metricsCalculator Le calculateur de métriques
 * @param containsCalculations Si la pensée contient des calculs
 * @param sessionId L'ID de session
 * @param qualityMetrics Métriques de qualité de la pensée
 * @param currentResponse La réponse actuelle à mettre à jour
 * @returns Un objet avec les résultats de la vérification
 */
async function performDeepVerification(
  thought: ThoughtNode,
  thoughtId: string,
  thoughtGraph: ThoughtGraph,
  evaluator: QualityEvaluator,
  toolIntegrator: ToolIntegrator,
  metricsCalculator: MetricsCalculator,
  containsCalculations: boolean = false,
  sessionId: string = 'default',
  qualityMetrics: ThoughtMetrics,
  currentResponse: SmartThinkingResponse
): Promise<Partial<SmartThinkingResponse>> {
  const response: Partial<SmartThinkingResponse> = {};
  
  console.error('Smart-Thinking: Confiance faible ou vérification demandée, vérification complète nécessaire...');
  
  // Mettre à jour le statut pendant la vérification
  response.verificationStatus = 'verification_in_progress';
  console.error(`Smart-Thinking: Utilisation de l'ID de session: ${sessionId}`);
  
  try {
    // Effectuer la vérification approfondie
    const verification = await evaluator.deepVerify(
      thought,
      toolIntegrator,
      containsCalculations,
      false,  // Ne pas forcer la vérification si déjà vérifiée
      sessionId  // Passer l'ID de session
    );
    
    // Mettre à jour la réponse avec les résultats de la vérification
    response.verification = verification;
    
    // Marquer comme vérifié selon les résultats
    response.isVerified = verification.status === 'verified' || 
                      verification.status === 'partially_verified' || 
                      (!!verification.verifiedCalculations && verification.verifiedCalculations.length > 0);
    response.verificationStatus = verification.status;
    
    // Calculer le score de fiabilité
    response.reliabilityScore = metricsCalculator.calculateReliabilityScore(
      qualityMetrics,
      verification.status as VerificationStatus,
      verification.verifiedCalculations
    );
    
    // Générer un résumé de certitude
    response.certaintySummary = metricsCalculator.generateCertaintySummary(
      verification.status as VerificationStatus,
      response.reliabilityScore,
      verification.verifiedCalculations
    );
    
    // Mise à jour du contenu si des calculs ont été vérifiés
    if (verification.verifiedCalculations && verification.verifiedCalculations.length > 0) {
      response.thought = evaluator.annotateThoughtWithVerifications(
        currentResponse.thought,
        verification.verifiedCalculations
      );
      thoughtGraph.updateThoughtContent(thoughtId, response.thought);
    }
    
    // Stocker les informations dans les métadonnées pour réutilisation future
    if (thought) {
      thought.metadata.sessionId = sessionId;
      thought.metadata.verificationResult = {
        status: verification.status,
        confidence: verification.confidence,
        timestamp: new Date(),
        sources: verification.sources
      };
    }
  } catch (error) {
    console.error('Smart-Thinking: Erreur lors de la vérification complète:', error);
    response.verificationStatus = 'inconclusive';
    response.certaintySummary = `Erreur lors de la vérification: ${error instanceof Error ? error.message : 'Erreur inconnue'}. Niveau de confiance: ${Math.round(qualityMetrics.confidence * 100)}%.`;
  }
  
  return response;
}

// Récupérer les informations du package.json pour la version
// La version sera mise à jour en 2.0.0 lors de la mise à jour majeure via npm version major
const packageInfo = require(path.join(__dirname, '..', 'package.json'));
const version = packageInfo.version || '1.0.3';

// Afficher un message de bienvenue sur stderr (n'affecte pas la communication JSON)
console.error(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║      Smart-Thinking MCP Server                               ║
║      Un outil de raisonnement multi-dimensionnel avancé      ║
║                                                              ║
║      Version: ${version}                                     ║
║                                                              ║
║      Démarrage du serveur...                                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Seuils de confiance pour la vérification
const MINIMUM_CONFIDENCE_THRESHOLD = 0.7;
const VERIFICATION_REQUIRED_THRESHOLD = 0.5;

// Clé API Cohere pour les embeddings
const COHERE_API_KEY = 'DckObDtnnRkPQQK6dwooI7mAB60HmmhNh1OBD23K';

// Créer une instance de chaque composant
const embeddingService = new EmbeddingService(COHERE_API_KEY);
const metricsCalculator = new MetricsCalculator();
const qualityEvaluator = new QualityEvaluator();
const toolIntegrator = new ToolIntegrator();
const thoughtGraph = new ThoughtGraph(undefined, embeddingService, qualityEvaluator);
const memoryManager = new MemoryManager(embeddingService);
const visualizer = new Visualizer();
const verificationMemory = VerificationMemory.getInstance();

// Configurer les dépendances
verificationMemory.setEmbeddingService(embeddingService);

// Injecter le ToolIntegrator dans le QualityEvaluator
qualityEvaluator.setToolIntegrator(toolIntegrator);

// Configurer l'écouteur d'événements pour les calculs vérifiés
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

// Définir le schéma des paramètres pour l'outil smartthinking
const SmartThinkingParamsSchema = z.object({
  thought: z.string().describe(
      'Le contenu de la pensée actuelle - OBLIGATOIRE - Exemple: "L\'intelligence artificielle va transformer profondément le marché du travail" - ' +
      'Smart-Thinking est un outil de raisonnement multi-dimensionnel qui organise les pensées en graphe plutôt qu\'en séquence linéaire, ' +
      'permettant une analyse plus riche, flexible et interconnectée des problèmes complexes.'
  ),

  thoughtType: z.enum(['regular', 'revision', 'meta', 'hypothesis', 'conclusion']).default('regular')
      .describe(
          'Le type de pensée - Définit la nature et la fonction de cette pensée dans le graphe:\n' +
          '- "regular": Pensée standard/normale pour développer une idée\n' +
          '- "meta": Réflexion sur le processus de pensée lui-même pour évaluer la démarche\n' +
          '- "revision": Modification ou amélioration d\'une pensée précédente\n' +
          '- "hypothesis": Formulation d\'une hypothèse à tester ou explorer\n' +
          '- "conclusion": Synthèse finale ou déduction globale'
      ),

  connections: z.array(z.any()).default([])
      .describe(
          'Connexions à d\'autres pensées - Permet de créer des liens entre les pensées pour former un graphe - ' +
          'Format: [{targetId: "id-pensée-précédente", type: "type-connexion", strength: 0.8}] - ' +
          'Types de connexions disponibles:\n' +
          '- "supports": Pensée qui renforce une autre\n' +
          '- "contradicts": Pensée qui s\'oppose à une autre\n' +
          '- "refines": Pensée qui précise ou améliore une autre\n' +
          '- "branches": Pensée qui explore une nouvelle direction\n' +
          '- "derives": Pensée qui découle logiquement d\'une autre\n' +
          '- "associates": Pensée simplement liée à une autre'
      ),

  requestSuggestions: z.boolean().default(false)
      .describe(
          'Demander des suggestions d\'amélioration du raisonnement - Exemple: true - ' +
          'Fournit des recommandations spécifiques pour améliorer la qualité, la pertinence et la rigueur de la pensée actuelle, ' +
          'et détecte les biais cognitifs potentiels'
      ),

  generateVisualization: z.boolean().default(false)
      .describe(
          'Générer une visualisation du graphe de pensée - Exemple: true - ' +
          'Crée une représentation visuelle du réseau de pensées et leurs connexions selon le type de visualisation choisi'
      ),

  visualizationType: z.enum(['graph', 'chronological', 'thematic', 'hierarchical', 'force', 'radial']).default('graph')
      .describe(
          'Type de visualisation à générer:\n' +
          '- "graph": Réseau de connexions entre pensées montrant les relations directes\n' +
          '- "chronological": Timeline séquentielle montrant l\'évolution temporelle du raisonnement\n' +
          '- "thematic": Clusters par thème regroupant les pensées selon leurs similitudes conceptuelles\n' +
          '- "hierarchical": Structure arborescente montrant les niveaux hiérarchiques entre les pensées\n' +
          '- "force": Disposition dynamique basée sur les forces d\'attraction/répulsion\n' +
          '- "radial": Disposition en cercles concentriques autour d\'une pensée centrale'
      ),

  suggestTools: z.boolean().default(true)
      .describe(
          'Suggérer des outils MCP pertinents pour cette étape - Exemple: true - ' +
          'Recommande des outils externes (recherche web, exécution de code, etc.) basés sur le contenu de la pensée ' +
          'pour enrichir le raisonnement avec des données ou des analyses complémentaires'
      ),

  sessionId: z.string().optional()
      .describe(
          'Identifiant de session pour maintenir l\'\u00e9tat entre les appels - Optionnel - ' +
          'Permet de conserver le graphe de pensées entre plusieurs invocations et de bâtir un raisonnement progressif'
      ),

  userId: z.string().optional()
      .describe(
          'Identifiant de l\'utilisateur pour la personnalisation - Optionnel - ' +
          'Adapte les recommandations aux préférences et au style de raisonnement de l\'utilisateur'
      ),

  help: z.boolean().default(true)
      .describe(
          'Afficher le guide d\'utilisation complet - Exemple: true - ' +
          'Renvoie une documentation détaillée sur l\'utilisation de Smart-Thinking, ses fonctionnalités et des exemples d\'utilisation'
      ),

  requestVerification: z.boolean().default(false)
      .describe(
          'Demander explicitement une vérification des informations - Exemple: true - ' +
          'Force le système à vérifier les informations, même si le niveau de confiance est élevé'
      ),

  containsCalculations: z.boolean().default(false)
      .describe(
          'Indique si la pensée contient des calculs à vérifier - Exemple: true - ' +
          'Active la vérification spécifique pour les expressions mathématiques et les calculs'
      ),

  // Nouvelles options avancées de visualisation
  visualizationOptions: z.object({
    clusterBy: z.enum(['type', 'theme', 'metric', 'connectivity']).optional()
        .describe('Critère de regroupement des nœuds en clusters'),
    direction: z.enum(['LR', 'RL', 'TB', 'BT']).optional().default('TB')
        .describe('Direction de la disposition hiérarchique (Left-Right, Right-Left, Top-Bottom, Bottom-Top)'),
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

// Le guide d'utilisation est maintenant intégré directement dans les descriptions des paramètres

// Définir l'outil smartthinking
server.tool(
    'smartthinking',
    SmartThinkingParamsSchema.shape,

    async (params: SmartThinkingParams) => {
      // Si le paramètre help est activé et qu'aucune pensée n'est fournie, afficher le guide d'utilisation
      if (params.help && !params.thought) {
        const guideContent = `# Guide d'utilisation de Smart-Thinking

## Qu'est-ce que Smart-Thinking?

Smart-Thinking est un outil de raisonnement avancé qui permet d'organiser les pensées en un graphe multi-dimensionnel plutôt qu'en une séquence linéaire. Il représente une évolution majeure par rapport au raisonnement séquentiel classique.

## Principales caractéristiques

### 1. Structure en graphe multi-dimensionnel
- **Organisation non-linéaire** des pensées avec des connexions multiples
- **Types de pensées variés**:
  - **regular**: Pensée standard/normale
  - **meta**: Réflexion sur le processus de pensée lui-même
  - **hypothesis**: Formulation d'une hypothèse à tester
  - **revision**: Modification ou amélioration d'une pensée précédente
  - **conclusion**: Synthèse ou déduction finale
- **Types de connexions**:
  - **supports**: Pensée qui renforce une autre
  - **contradicts**: Pensée qui s'oppose à une autre
  - **refines**: Pensée qui précise ou améliore une autre
  - **branches**: Pensée qui explore une nouvelle direction
  - **derives**: Pensée qui découle logiquement d'une autre
  - **associates**: Pensée simplement liée à une autre

### 2. Évaluation automatique de la qualité
- Mesure de **confiance** (degré de certitude)
- Mesure de **pertinence** (lien avec le contexte)
- Mesure de **qualité globale** (structure, clarté, profondeur)
- Détection des **biais cognitifs potentiels**

### 3. Mémoire persistante
- Conservation des pensées entre les sessions
- Récupération contextuelle d'informations pertinentes
- Enrichissement progressif de la base de connaissances

### 4. Visualisations avancées
- **graph**: Réseau standard de connexions entre pensées
- **chronological**: Timeline du développement du raisonnement
- **thematic**: Regroupement par clusters thématiques
- **hierarchical**: Structure arborescente avec niveaux hiérarchiques
- **force**: Disposition dynamique basée sur forces d'attraction/répulsion
- **radial**: Disposition en cercles concentriques autour d'un nœud central

### 5. Intégration d'outils externes
- Suggestions contextuelles d'outils MCP pertinents
- Priorisation intelligente selon le contexte actuel

## Exemples d'utilisation

### Exemple 1: Pensée initiale simple
\`\`\`
Utilise l'outil smartthinking avec thought="L'intelligence artificielle va transformer profondément le marché du travail dans les prochaines décennies."
\`\`\`

### Exemple 2: Avec visualisation avancée
\`\`\`
Utilise l'outil smartthinking avec:
thought="Les énergies renouvelables représentent une solution viable au changement climatique, mais posent des défis d'implémentation."
generateVisualization=true
visualizationType="force"
visualizationOptions={clusterBy:"theme"}
\`\`\`

### Exemple 3: Pensée de type hypothèse avec suggestions
\`\`\`
Utilise l'outil smartthinking avec:
thought="Si nous réduisons les émissions de carbone de 50% d'ici 2030, nous pourrons limiter le réchauffement global à moins de 2°C."
thoughtType="hypothesis"
requestSuggestions=true
\`\`\`

### Exemple 4: Connexion à une pensée précédente
\`\`\`
Utilise l'outil smartthinking avec:
thought="Cette approche présente toutefois des défis économiques importants pour les pays en développement."
connections=[{targetId:"PENSEE-ID-PRECEDENTE", type:"refines", strength:0.8}]
\`\`\`

## Conseils d'utilisation avancée

1. **Commencez simplement**: Débutez avec des pensées de type "regular" avant d'explorer des types plus spécifiques
2. **Utilisez les méta-pensées**: Évaluez régulièrement votre processus avec des pensées de type "meta"
3. **Créez des connexions riches**: Variez les types de connexions pour un réseau de pensée plus nuancé
4. **Alternez analyse et synthèse**: Combinez l'exploration détaillée avec des moments de synthèse
5. **Exploitez les visualisations**: Utilisez différents types de visualisation selon vos besoins d'analyse
6. **Filtrez et interagissez**: Utilisez les options avancées de filtrage et d'interactivité pour explorer les graphes complexes

Pour plus d'informations, consultez le paramètre help=true de l'outil.
`;

        return {
          content: [
            {
              type: 'text',
              text: guideContent
            }
          ]
        };
      }

      // Vérifier explicitement si le paramètre 'thought' est présent
      if (!params.thought) {
        console.error('Smart-Thinking: ERROR - Paramètre "thought" manquant');
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: "Le paramètre 'thought' est obligatoire.",
                example: "Pour utiliser cet outil correctement, veuillez fournir une pensée à analyser.",
                usage: {
                  thought: "Voici ma pensée à analyser",
                  thoughtType: "regular",
                  generateVisualization: true
                },
                tip: "Utilisez help=true pour afficher le guide d'utilisation complet."
              }, null, 2)
            }
          ]
        };
      }

      // Utiliser console.error pour les messages de débogage qui ne seront pas interprétés comme JSON
      console.error('Smart-Thinking: traitement de la pensée:', params.thought);

      // Vérifier les calculs dans la pensée en utilisant la fonction dédiée
      const calculationResult = await verifyCalculationsIfNeeded(
        params.thought, 
        !!params.containsCalculations, 
        qualityEvaluator
      );
      
      // Récupérer les résultats de la vérification préliminaire
      const {
        verifiedCalculations,
        initialVerification,
        verificationInProgress,
        preverifiedThought
      } = calculationResult;

      // Ajouter la pensée au graphe (avec annotations si des calculs ont été vérifiés)
      const thoughtId = thoughtGraph.addThought(
          preverifiedThought,
          params.thoughtType,
          params.connections
      );

      // Évaluer la qualité de la pensée
      const qualityMetrics = qualityEvaluator.evaluate(thoughtId, thoughtGraph);

      // Mettre à jour les métriques dans le graphe
      thoughtGraph.updateThoughtMetrics(thoughtId, qualityMetrics);

      // Déterminer le statut de vérification approprié
      let verificationStatus: VerificationDetailedStatus = 'unverified';
      let certaintySummary = "Information non vérifiée";

      if (verificationInProgress) {
        if (initialVerification) {
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

      // Préparer la réponse avec l'état de vérification initial
      const response: SmartThinkingResponse = {
        thoughtId,
        thought: preverifiedThought, // Utiliser la pensée annotée si des calculs ont été vérifiés
        thoughtType: params.thoughtType || 'regular',
        qualityMetrics,
        isVerified: initialVerification, // Initialiser selon la vérification préliminaire
        verificationStatus: verificationStatus,
        certaintySummary: certaintySummary,
        reliabilityScore: metricsCalculator.calculateReliabilityScore(
          qualityMetrics, 
          initialVerification ? 'partially_verified' as VerificationStatus : 'unverified' as VerificationStatus, 
          verifiedCalculations
        )
      };
      
      // S'assurer que si des calculs ont été vérifiés, le statut reflète cette vérification
      if (verifiedCalculations && verifiedCalculations.length > 0) {
        response.isVerified = true;
        response.verificationStatus = 'partially_verified';
      }

      // Si des vérifications de calculs ont été effectuées
      if (verifiedCalculations && verifiedCalculations.length > 0) {
        // Ajouter dès maintenant les informations de vérification
        response.verification = {
          status: initialVerification ? 'partially_verified' : 'inconclusive',
          confidence: qualityMetrics.confidence,
          sources: ['Vérification préliminaire des calculs'],
          verificationSteps: ['Détection et vérification préliminaire des expressions mathématiques'],
          verifiedCalculations
        };

        // Ajuster le score de fiabilité en fonction de l'exactitude des calculs
        const correctCalculations = verifiedCalculations.filter(calc => calc.isCorrect).length;
        const totalCalculations = verifiedCalculations.length;
        if (totalCalculations > 0) {
          const calculationAccuracy = correctCalculations / totalCalculations;
          response.reliabilityScore = (qualityMetrics.confidence * 0.7) + (calculationAccuracy * 0.3);
        }
      }

      // Vérifier si l'information a déjà été vérifiée dans des étapes précédentes
      const thought = thoughtGraph.getThought(thoughtId);
      
      // Utiliser la fonction pour vérifier si une pensée similaire a déjà été vérifiée
      const previousResult = await checkPreviousVerification(
        thought as ThoughtNode,
        thoughtGraph,
        thoughtId,
        params.connections,
        embeddingService
      );
      
      // Si une vérification précédente a été trouvée, mettre à jour la réponse
      if (previousResult.previousVerification) {
        response.isVerified = previousResult.isVerified;
        response.verificationStatus = previousResult.verificationStatus;
        response.certaintySummary = previousResult.certaintySummary;
        response.verification = previousResult.verification;
        response.reliabilityScore = metricsCalculator.calculateReliabilityScore(
          qualityMetrics,
          previousResult.verificationStatus as VerificationStatus,
          verifiedCalculations
        );
      }

      // Vérifier si une vérification profonde est nécessaire
      if ((qualityMetrics.confidence < VERIFICATION_REQUIRED_THRESHOLD || params.requestVerification) && !previousResult.previousVerification) {
        // Effectuer une vérification profonde et mettre à jour la réponse
        const verificationResult = await performDeepVerification(
          thought as ThoughtNode,
          thoughtId,
          thoughtGraph,
          qualityEvaluator,
          toolIntegrator,
          metricsCalculator,
          params.containsCalculations,
          params.sessionId || 'default',
          qualityMetrics,
          response
        );
        
        // Mettre à jour la réponse avec les résultats de la vérification
        Object.assign(response, verificationResult);
      }

      // Si demandé, suggérer des outils
      if (params.suggestTools) {
        response.suggestedTools = toolIntegrator.suggestTools(params.thought);
      }

      // Si demandé, générer une visualisation avec les nouvelles options
      if (params.generateVisualization) {
        const visualizationType = params.visualizationType || 'graph';
        const visualizationOptions = params.visualizationOptions || {};

        switch (visualizationType) {
          case 'chronological':
            response.visualization = visualizer.generateChronologicalVisualization(thoughtGraph);
            break;
          case 'thematic':
            response.visualization = visualizer.generateThematicVisualization(thoughtGraph);
            break;
          case 'hierarchical':
            response.visualization = visualizer.generateHierarchicalVisualization(
                thoughtGraph,
                visualizationOptions.centerNode,
                {
                  direction: visualizationOptions.direction as any, // Cast pour TS
                  levelSeparation: 100,
                  clusterBy: visualizationOptions.clusterBy as any // Cast pour TS
                }
            );
            break;
          case 'force':
            response.visualization = visualizer.generateForceDirectedVisualization(
                thoughtGraph,
                {
                  clusterBy: visualizationOptions.clusterBy as any, // Cast pour TS
                  forceStrength: 0.5,
                  centerNode: visualizationOptions.centerNode
                }
            );
            break;
          case 'radial':
            response.visualization = visualizer.generateRadialVisualization(
                thoughtGraph,
                visualizationOptions.centerNode,
                {
                  maxDepth: visualizationOptions.maxDepth,
                  radialDistance: 120
                }
            );
            break;
          case 'graph':
          default:
            response.visualization = visualizer.generateVisualization(thoughtGraph, thoughtId);
            break;
        }

        // Appliquer les filtres si spécifiés
        if (visualizationOptions.filters && response.visualization) {
          response.visualization = visualizer.applyFilters(
              response.visualization,
              visualizationOptions.filters as FilterOptions // Cast pour TS
          );
        }

        // Simplifier la visualisation si elle est trop grande
        if (response.visualization && response.visualization.nodes.length > 100) {
          response.visualization = visualizer.simplifyVisualization(response.visualization);
        }
      }

      // Récupérer les mémoires pertinentes
      response.relevantMemories = await memoryManager.getRelevantMemories(params.thought);

      // Suggérer les prochaines étapes - pas besoin d'être asynchrone
      response.suggestedNextSteps = thoughtGraph.suggestNextSteps();

      // Stocker la pensée actuelle dans la mémoire pour les sessions futures
      if (response.qualityMetrics.quality > 0.7) {
        // Ne stocker que les pensées de haute qualité
        const tags = params.thought
            .toLowerCase()
            .split(/\W+/)
            .filter((word: string) => word.length > 4)
            .slice(0, 5);

        memoryManager.addMemory(params.thought, tags);
      }

      console.error('Smart-Thinking: pensée traitée avec succès, id:', thoughtId);

      // Formater la réponse pour MCP (doit inclure le champ content obligatoire)
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

// Créer et connecter le transport
const transport = new StdioServerTransport();

// Assurer que le répertoire data existe lors du démarrage
async function ensureDataDirExists() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
    console.error('Smart-Thinking: Répertoire data créé ou confirmé');
  } catch (error) {
    console.error('Smart-Thinking: Erreur lors de la création du répertoire data:', error);
    // Ne pas interrompre l'application si la création échoue
  }
}

// Démarrer le serveur
async function start() {
  try {
    // S'assurer que le répertoire data existe
    await ensureDataDirExists();

    await server.connect(transport);
    // Utiliser console.error pour éviter que ces messages soient interprétés comme du JSON
    console.error('Smart-Thinking MCP Server démarré avec succès.');
    console.error('L\'outil "smartthinking" est maintenant disponible pour Claude.');
    console.error('La documentation est automatiquement fournie à Claude lors de la première utilisation.');

    // Afficher un exemple d'utilisation pour aider les utilisateurs
    console.error('\n-------------------- EXEMPLE D\'UTILISATION --------------------');
    console.error('Pour utiliser l\'outil correctement, demandez à Claude:');
    console.error('"Utilise l\'outil smartthinking avec la pensée suivante: Voici ma pensée à analyser"');
    console.error('ou');
    console.error('"Utilise l\'outil smartthinking avec les paramètres suivants:\n');
    console.error('thought: Voici ma pensée à analyser\n');
    console.error('thoughtType: regular\n');
    console.error('generateVisualization: true\n');
    console.error('visualizationType: hierarchical"');
    console.error('\nPour des options avancées:');
    console.error('"Utilise l\'outil smartthinking avec:\n');
    console.error('thought: Voici ma pensée à analyser\n');
    console.error('visualizationType: force\n');
    console.error('visualizationOptions: {clusterBy: "theme", centerNode: "id-du-noeud"}"');
    console.error('\nPar défaut, l\'outil fournit sa documentation à Claude. Si vous voulez désactiver cela:');
    console.error('"Utilise l\'outil smartthinking avec help=false et thought=..."');
    console.error('----------------------------------------------------------------\n');
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

function generateCertaintySummary(status: VerificationStatus, score: number, verifiedCalculations?: CalculationVerificationResult[]): string {
  return metricsCalculator.generateCertaintySummary(status, score, verifiedCalculations);
}

start();