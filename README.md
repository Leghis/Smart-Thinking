# Smart-Thinking

[![smithery badge](https://smithery.ai/badge/@Leghis/smart-thinking)](https://smithery.ai/server/@Leghis/smart-thinking)
[![npm version](https://img.shields.io/npm/v/smart-thinking-mcp.svg)](https://www.npmjs.com/package/smart-thinking-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1.6-blue)](https://www.typescriptlang.org/)

## Vue d'ensemble

Smart-Thinking est un serveur MCP (Model Context Protocol) sophistiqué qui fournit un cadre de raisonnement multi-dimensionnel, adaptatif et auto-vérifiable pour les assistants IA comme Claude. Contrairement aux approches de raisonnement linéaire, Smart-Thinking utilise une architecture basée sur des graphes qui permet des connexions complexes entre les pensées, offrant ainsi une capacité de raisonnement plus nuancée et plus proche de la cognition humaine.

## Caractéristiques clés

### Architecture cognitive avancée
- Graphe de pensée multi-dimensionnel remplaçant les séquences linéaires traditionnelles
- Estimation dynamique et auto-adaptative du nombre de pensées nécessaires
- Types de connexions riches et nuancés entre les pensées (supports, contradicts, refines, etc.)
- Métriques de pensée contextuelles (confidence, relevance, quality)

### Système de vérification robuste
- Vérification automatique des faits et calculs avec 8 statuts différents
- Détection des contradictions et incertitudes dans le raisonnement
- Scores de fiabilité adaptés à chaque type de vérification
- Génération de résumés de certitude adaptés au contexte

### Fonctionnalités avancées
- Mémoire persistante pour les sessions précédentes
- Mécanismes d'auto-apprentissage pour améliorer le raisonnement
- Personnalisation adaptée à l'utilisateur pour un raisonnement pertinent
- Visualisations interactives du processus de raisonnement
- Collaboration multi-agents pour le travail d'équipe
- Intégration transparente avec l'écosystème d'outils MCP

## Configuration avec Claude Desktop

Ajoutez cette configuration à votre fichier `claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "smart-thinking": {
      "command": "npx",
      "args": ["-y", "smart-thinking-mcp"]
    }
  }
}
```
### Installing via Smithery

To install smart-thinking for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@Leghis/smart-thinking):

```bash
npx -y @smithery/cli install @Leghis/smart-thinking --client claude
```

## Utilisation

### Paramètres principaux

| Paramètre | Type | Description |
|-----------|------|-------------|
| `thought` | string | Contenu de la pensée à analyser (obligatoire) |
| `thoughtType` | string | Type de pensée ('regular', 'revision', 'meta', 'hypothesis', 'conclusion') |
| `connections` | array | Connexions à d'autres pensées |
| `requestVerification` | boolean | Activer la vérification automatique |
| `containsCalculations` | boolean | Indiquer si la pensée contient des calculs |
| `generateVisualization` | boolean | Générer une visualisation du graphe de pensée |
| `suggestTools` | boolean | Suggérer des outils MCP pertinents |
| `sessionId` | string | Identifiant de session pour la persistance |

### Exemples d'utilisation

#### Raisonnement simple
```
Utilise l'outil Smart-Thinking pour analyser les avantages et inconvénients des énergies renouvelables.
```

#### Avec vérification automatique
```
Utilise Smart-Thinking avec vérification pour évaluer les affirmations suivantes sur le changement climatique.
```

#### Avec visualisation
```
Utilise Smart-Thinking avec visualisation pour développer une stratégie marketing multicouche.
```

#### Analyse collaborative
```
Utilise Smart-Thinking en mode collaboratif pour analyser ce problème complexe d'optimisation.
```

## Système de vérification

Smart-Thinking intègre un système sophistiqué de vérification qui évalue la fiabilité des informations et des calculs. Il prend en charge 8 statuts de vérification distincts :

| Statut | Description |
|--------|-------------|
| `verified` | Information vérifiée avec confiance |
| `partially_verified` | Information partiellement vérifiée |
| `unverified` | Information non vérifiée |
| `contradicted` | Information contredite par d'autres sources |
| `inconclusive` | Vérification non concluante |
| `absence_of_information` | Absence d'information sur le sujet |
| `uncertain` | Information incertaine à cause de contradictions |
| `contradictory` | Information intrinsèquement contradictoire |

Le système calcule un score de fiabilité qui combine ces statuts avec d'autres métriques comme la confiance, la pertinence et la qualité.

### Calcul du score de fiabilité

Le score de fiabilité est calculé selon une formule qui équilibre :
- Les métriques de base (confiance, pertinence, qualité)
- Le statut de vérification
- Les résultats de vérification des calculs (si présents)
- L'historique des scores précédents (pour un lissage temporel)

Les seuils et les scores ont été optimisés par simulation pour garantir une cohérence maximale.

## Visualisation

Smart-Thinking propose plusieurs types de visualisations du graphe de pensée :

- Chronologique : Organisation temporelle des pensées
- Thématique : Clusters par thèmes similaires
- Hiérarchique : Structure arborescente
- Force : Disposition basée sur les forces d'attraction/répulsion
- Radiale : Cercles concentriques autour d'une pensée centrale

Les visualisations peuvent être filtrées selon :
- Types de pensées
- Types de connexions
- Seuils de métriques
- Recherche textuelle
- Plages de dates

## Persistance des données

Smart-Thinking implémente un système robuste de persistance des données qui stocke :
- Les graphes de pensée par session
- Les résultats de vérification pour une réutilisation future
- Les métriques calculées pour analyse et amélioration
- Les préférences utilisateur pour personnalisation

Les données sont stockées dans des fichiers JSON structurés sur le système de fichiers, garantissant la persistance entre les sessions.

## Comparaison avec Sequential-Thinking

| Fonctionnalité | Sequential-Thinking | Smart-Thinking |
|----------------|---------------------|---------------|
| Structure de pensée | Linéaire | Multi-dimensionnelle (graphe) |
| Types de connexions | Limités | Riches et nuancés (16+ types) |
| Adaptation | Statique | Dynamique et contextuelle |
| Vérification | Basique | Avancée (8 statuts différents) |
| Visualisation | Simple | Interactive et paramétrable |
| Mémoire | Temporaire | Persistante avec vectorisation |
| Collaboration | Non | Oui (multi-agents) |
| Personnalisation | Limitée | Adaptative à l'utilisateur |
| Auto-apprentissage | Non | Oui |
| Métriques | Basiques | Contextuelle et multi-facteurs |

## API et intégration

Smart-Thinking peut être intégré dans d'autres applications Node.js :

```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SmartThinking } from 'smart-thinking-mcp';

// Initialiser Smart-Thinking
const smartThinking = new SmartThinking({
  persistenceEnabled: true,
  verificationEnabled: true
});

// Utiliser les fonctionnalités
const result = await smartThinking.processThought({
  thought: "Cette pensée sera analysée et vérifiée",
  requestVerification: true
});

console.log(result.qualityMetrics);
console.log(result.verificationStatus);
```

## Licence

MIT
