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

/**
 * Point d'entrée du serveur MCP Smart-Thinking
 */

// Afficher un message de bienvenue sur stderr (n'affecte pas la communication JSON)
console.error(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║      Smart-Thinking MCP Server                               ║
║      Un outil de raisonnement multi-dimensionnel avancé      ║
║                                                              ║
║      Version: 1.0.0                                          ║
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
  version: "1.0.0",
  capabilities: {}
});

// Définir le schéma des paramètres pour l'outil smartthinking
const SmartThinkingParamsSchema = z.object({
  thought: z.string().describe('Le contenu de la pensée actuelle - OBLIGATOIRE - Exemple: "Voici ma pensée à analyser"'),
  thoughtType: z.enum(['regular', 'revision', 'meta', 'hypothesis', 'conclusion']).default('regular')
    .describe('Le type de pensée - Exemple: "regular" pour une pensée standard, "meta" pour une réflexion sur le processus'),
  connections: z.array(z.any()).default([]).describe('Connexions à d\'autres pensées - Laisser vide pour une première pensée'),
  requestSuggestions: z.boolean().default(false).describe('Demander des suggestions d\'amélioration du raisonnement - Exemple: true'),
  generateVisualization: z.boolean().default(false).describe('Générer une visualisation du graphe de pensée - Exemple: true'),
  suggestTools: z.boolean().default(true).describe('Suggérer des outils MCP pertinents pour cette étape - Exemple: true'),
  sessionId: z.string().optional().describe('Identifiant de session pour maintenir l\'état entre les appels - Optionnel'),
  userId: z.string().optional().describe('Identifiant de l\'utilisateur pour la personnalisation - Optionnel'),
  visualizationType: z.enum(['graph', 'chronological', 'thematic']).default('graph')
    .describe('Type de visualisation à générer - Exemple: "graph" pour un réseau, "chronological" pour une timeline')
});

// Définir l'outil smartthinking
server.tool(
  'smartthinking',
  SmartThinkingParamsSchema.shape,
  
  async (params: SmartThinkingParams) => {
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
              }
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

// Démarrer le serveur
async function start() {
  try {
    await server.connect(transport);
    // Utiliser console.error pour éviter que ces messages soient interprétés comme du JSON
    console.error('Smart-Thinking MCP Server démarré avec succès.');
    console.error('L\'outil "smartthinking" est maintenant disponible pour Claude.');
    
    // Afficher un exemple d'utilisation pour aider les utilisateurs
    console.error('\n-------------------- EXEMPLE D\'UTILISATION --------------------');
    console.error('Pour utiliser l\'outil correctement, demandez à Claude:');
    console.error('"Utilise l\'outil smartthinking avec la pensée suivante: Voici ma pensée à analyser"');
    console.error('ou');
    console.error('"Utilise l\'outil smartthinking avec les paramètres suivants:\n');
    console.error('thought: Voici ma pensée à analyser\n');
    console.error('thoughtType: regular\n');
    console.error('generateVisualization: true"');
    console.error('----------------------------------------------------------------\n');
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

start();