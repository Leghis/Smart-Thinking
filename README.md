# Smart-Thinking

[![smithery badge](https://smithery.ai/badge/@Leghis/smart-thinking)](https://smithery.ai/server/@Leghis/smart-thinking)
[![npm version](https://img.shields.io/npm/v/smart-thinking-mcp.svg)](https://www.npmjs.com/package/smart-thinking-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1.6-blue)](https://www.typescriptlang.org/)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-blue)](https://github.com/Leghis/smart-thinking-mcp)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS-blue)](https://github.com/Leghis/smart-thinking-mcp)
[![Platform: Linux](https://img.shields.io/badge/Platform-Linux-blue)](https://github.com/Leghis/smart-thinking-mcp)

<a href="https://glama.ai/mcp/servers/@Leghis/Smart-Thinking">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Leghis/Smart-Thinking/badge" alt="Smart-Thinking MCP server" />
</a>

## Vue d'ensemble

Smart-Thinking est un serveur MCP (Model Context Protocol) sophistiqué qui fournit un cadre de raisonnement multi-dimensionnel, adaptatif et auto-vérifiable pour les assistants IA comme Claude. Contrairement aux approches de raisonnement linéaire, Smart-Thinking utilise une architecture basée sur des graphes qui permet des connexions complexes entre les pensées, offrant ainsi une capacité de raisonnement plus nuancée et plus proche de la cognition humaine.

Smart-Thinking est entièrement compatible avec toutes les plateformes (Windows, macOS, Linux) et s'intègre parfaitement avec de nombreux clients MCP, notamment Claude Desktop, Cline, Windsurf et d'autres applications compatibles MCP.

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

### Compatibilité cross-plateforme
- Fonctionne de manière identique sur Windows, macOS et Linux
- Compatible avec NVM (Node Version Manager) sur toutes les plateformes
- Gestion automatique des chemins de fichiers selon la plateforme
- Configuration simplifiée pour chaque environnement
- Résolution automatique des problèmes spécifiques à chaque OS

## Installation

### Option 1: Installation globale (recommandée)

```bash
# Sur macOS/Linux
npm install -g smart-thinking-mcp

# Sur Windows (depuis PowerShell ou CMD)
npm install -g smart-thinking-mcp
```

### Option 2: Installation via Smithery

Pour installer Smart-Thinking automatiquement via [Smithery](https://smithery.ai/server/@Leghis/smart-thinking):

```bash
npx -y @smithery/cli install @Leghis/smart-thinking --client claude
```

### Option 3: Utilisation via npx (sans installation)

```bash
# Sur macOS/Linux
npx -y smart-thinking-mcp

# Sur Windows (moins recommandé, préférez l'installation globale)
npx -y smart-thinking-mcp
```

### Option 4: Installation depuis le code source

```bash
# Cloner le dépôt
git clone https://github.com/votre-utilisateur/Smart-Thinking.git
cd Smart-Thinking

# Installer les dépendances
npm install

# Compiler le projet
npm run build

# Créer un lien npm global
npm link
```

## Configuration avec Claude Desktop

### Configuration sur macOS

Ajoutez cette configuration à votre fichier `~/Library/Application Support/Claude/claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "smart-thinking": {
      "command": "smart-thinking-mcp"
    }
  }
}
```

OU via npx:

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

### Configuration sur Windows

Ajoutez cette configuration à votre fichier `%APPDATA%\Claude\claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "smart-thinking": {
      "command": "C:/Users/VotreNom/AppData/Roaming/npm/smart-thinking-mcp.cmd"
    }
  }
}
```

OU avec le chemin complet vers Node.js (recommandé pour Windows):

```json
{
  "mcpServers": {
    "smart-thinking": {
      "command": "C:/Program Files/nodejs/node.exe",
      "args": ["C:/Users/VotreNom/AppData/Roaming/npm/node_modules/smart-thinking-mcp/build/index.js"]
    }
  }
}
```

**Important**: 
- Remplacez `VotreNom` par votre nom d'utilisateur Windows.
- Utilisez des forward slashes (`/`) dans les chemins Windows, même si l'OS utilise des backslashes (`\`).

Pour des instructions d'installation détaillées, consultez le [Guide d'installation](./GUIDE_INSTALLATION.md).

## Système de fichiers cross-plateforme

Smart-Thinking implémente une gestion avancée du système de fichiers compatible avec toutes les plateformes:

### Fonctionnalités du système de fichiers

- **Normalisation automatique des chemins**: Conversion transparente entre les séparateurs de chemin Windows (`\`) et Unix (`/`)
- **Détection de plateforme intégrée**: Adaptation automatique selon l'OS (Windows, macOS, Linux)
- **Gestion des chemins spéciaux**: Support pour les chemins UNC Windows, WSL et les chemins avec espaces
- **Répertoire de données auto-configuré**: Création et gestion automatique du répertoire de données
- **Fallback intelligent**: Création automatique d'un répertoire alternatif en cas de problème d'accès
- **Chemins de configuration spécifiques à la plateforme**: Localisation correcte des fichiers de configuration selon l'OS

### Configuration du répertoire de données

Par défaut, Smart-Thinking crée et utilise un dossier `data` dans son répertoire de travail. Vous pouvez également spécifier un répertoire personnalisé avec la variable d'environnement `SMART_THINKING_DATA_DIR`:

```json
{
  "mcpServers": {
    "smart-thinking": {
      "command": "smart-thinking-mcp",
      "env": {
        "SMART_THINKING_DATA_DIR": "/chemin/absolu/vers/data"
      }
    }
  }
}
```

### Support pour NVM (Node Version Manager)

Smart-Thinking détecte automatiquement si Node.js est installé via NVM et adapte les chemins en conséquence, offrant une compatibilité parfaite sur toutes les plateformes, y compris Windows avec NVM.

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
Utilise Smart-Thinking avec vérification (requestVerification=true) pour évaluer les affirmations suivantes sur le changement climatique.
```

#### Avec visualisation
```
Utilise Smart-Thinking avec visualisation (generateVisualization=true) pour développer une stratégie marketing multicouche.
```

#### Analyse collaborative
```
Utilise Smart-Thinking avec un identifiant de session (sessionId="projet-innovation") pour analyser ce problème complexe d'optimisation.
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

- **Graphe standard**: Disposition standard du réseau de pensées
- **Chronologique**: Organisation temporelle des pensées
- **Thématique**: Clusters par thèmes similaires
- **Hiérarchique**: Structure arborescente
- **Force**: Disposition basée sur les forces d'attraction/répulsion
- **Radiale**: Cercles concentriques autour d'une pensée centrale

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

Les données sont stockées de manière compatible cross-plateforme dans des fichiers JSON structurés sur le système de fichiers, garantissant la persistance entre les sessions.

## Compatibilité avec les clients MCP

Smart-Thinking est compatible avec de nombreux clients MCP, dont :

- **Claude Desktop App**: Support complet des outils, ressources et prompts
- **Cline**: Support pour les outils et ressources
- **Continue**: Support complet pour toutes les fonctionnalités MCP
- **5ire**: Support pour les outils
- **Cursor**: Support pour les outils
- **Windsurf Editor**: Support pour les outils AI Flow
- **Et plus encore...**

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
| Compatibilité plateforme | Limitée | Complète (Windows, macOS, Linux) |

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

## Résolution des problèmes

### Vérification rapide du fonctionnement

Pour vérifier que Smart-Thinking fonctionne correctement:

```bash
# Sur macOS/Linux
smart-thinking-mcp

# Sur Windows
smart-thinking-mcp.cmd
```

Vous devriez voir le message de démarrage du serveur.

### Consulter les logs

Si vous rencontrez des difficultés, consultez les logs de Claude Desktop :

- Sur macOS : `~/Library/Logs/Claude/mcp*.log`
- Sur Windows : `%USERPROFILE%\AppData\Local\Claude\logs\mcp*.log`
- Sur Linux : `~/.local/share/Claude/logs/mcp*.log`

### Problèmes courants et solutions

| Problème | Solution |
|----------|----------|
| Smart-Thinking n'apparaît pas dans Claude | Vérifiez les chemins dans la configuration, redémarrez Claude Desktop |
| Erreurs d'accès aux fichiers | Vérifiez les permissions du répertoire de données |
| Problèmes de connexion sur Windows | Utilisez des chemins complets et absolus avec forward slashes |
| Erreurs avec NVM sur Windows | Utilisez le chemin complet vers la version active de Node.js |

Pour les problèmes spécifiques à Windows et NVM, consultez la section dédiée dans le [Guide d'installation](./GUIDE_INSTALLATION.md).

## Contribution

Les contributions sont les bienvenues ! Consultez notre [Guide de contribution](./CONTRIBUTING.md) pour plus d'informations.

## Licence

[MIT](./LICENSE)
