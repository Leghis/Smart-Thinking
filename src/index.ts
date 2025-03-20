#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ThoughtGraph } from './thought-graph';
import { MemoryManager } from './memory-manager';
import { ToolIntegrator } from './tool-integrator';
import { QualityEvaluator } from './quality-evaluator';
import { Visualizer } from './visualizer';
import { SmartThinkingParams, SmartThinkingResponse } from './types';
import path from 'path';
import { promises as fs } from 'fs';

/**
 * Point d'entrée du serveur MCP Smart-Thinking
 */

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

// Créer une instance de chaque composant
const thoughtGraph = new ThoughtGraph();
const memoryManager = new MemoryManager();
const toolIntegrator = new ToolIntegrator();
const qualityEvaluator = new QualityEvaluator();
const visualizer = new Visualizer();

// Créer une instance du serveur MCP
const server = new McpServer({
  name: "smart-thinking-mcp",
  version: version,
  capabilities: {}
});

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
  
  visualizationType: z.enum(['graph', 'chronological', 'thematic']).default('graph')
    .describe(
      'Type de visualisation à générer:\n' +
      '- "graph": Réseau de connexions entre pensées montrant les relations directes\n' +
      '- "chronological": Timeline séquentielle montrant l\'évolution temporelle du raisonnement\n' +
      '- "thematic": Clusters par thème regroupant les pensées selon leurs similitudes conceptuelles'
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
    )
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
- **graph**: Réseau de connexions entre pensées
- **chronological**: Timeline du développement du raisonnement
- **thematic**: Regroupement par clusters thématiques

### 5. Intégration d'outils externes
- Suggestions contextuelles d'outils MCP pertinents
- Priorisation intelligente selon le contexte actuel

## Exemples d'utilisation

### Exemple 1: Pensée initiale simple
\`\`\`
Utilise l'outil smartthinking avec thought="L'intelligence artificielle va transformer profondément le marché du travail dans les prochaines décennies."
\`\`\`

### Exemple 2: Avec visualisation
\`\`\`
Utilise l'outil smartthinking avec:
thought="Les énergies renouvelables représentent une solution viable au changement climatique, mais posent des défis d'implémentation."
generateVisualization=true
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
    
    // Ajouter la pensée au graphe
    const thoughtId = thoughtGraph.addThought(
      params.thought, 
      params.thoughtType,
      params.connections
    );
    
    // Évaluer la qualité de la pensée
    const qualityMetrics = qualityEvaluator.evaluate(thoughtId, thoughtGraph);
    
    // Mettre à jour les métriques dans le graphe
    thoughtGraph.updateThoughtMetrics(thoughtId, qualityMetrics);
    
    // Préparer la réponse
    const response: SmartThinkingResponse = {
      thoughtId,
      thought: params.thought,
      thoughtType: params.thoughtType || 'regular',
      qualityMetrics
    };
    
    // Si demandé, suggérer des outils
    if (params.suggestTools) {
      response.suggestedTools = toolIntegrator.suggestTools(params.thought);
    }
    
    // Si demandé, générer une visualisation
    if (params.generateVisualization) {
      const visualizationType = params.visualizationType || 'graph';
      
      switch (visualizationType) {
        case 'chronological':
          response.visualization = visualizer.generateChronologicalVisualization(thoughtGraph);
          break;
        case 'thematic':
          response.visualization = visualizer.generateThematicVisualization(thoughtGraph);
          break;
        case 'graph':
        default:
          response.visualization = visualizer.generateVisualization(thoughtGraph, thoughtId);
          break;
      }
    }
    
    // Récupérer les mémoires pertinentes
    response.relevantMemories = memoryManager.getRelevantMemories(params.thought);
    
    // Suggérer les prochaines étapes
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
    console.error('generateVisualization: true"');
    console.error('\nPar défaut, l\'outil fournit sa documentation à Claude. Si vous voulez désactiver cela:');
    console.error('"Utilise l\'outil smartthinking avec help=false et thought=..."');
    console.error('----------------------------------------------------------------\n');
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

start();