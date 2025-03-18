# Smart-Thinking MCP Server

Un serveur MCP (Model Context Protocol) qui fournit un cadre de raisonnement multi-dimensionnel, adaptatif et collaboratif pour les assistants IA comme Claude.

## Caractéristiques

- 🧠 **Architecture de raisonnement multi-dimensionnelle** basée sur un graphe plutôt qu'une séquence linéaire
- 🔄 **Estimation dynamique et auto-adaptative** du nombre de pensées nécessaires
- 💾 **Intégration d'une mémoire persistante** pour les sessions précédentes
- 📈 **Mécanismes d'auto-apprentissage** pour améliorer le raisonnement au fil du temps
- 🔍 **Intégration native de la recherche** et de la vérification des faits
- 👤 **Personnalisation adaptée à l'utilisateur** pour un raisonnement plus pertinent
- 📊 **Visualisations avancées** du processus de raisonnement
- ⚖️ **Système d'évaluation de la qualité** du raisonnement
- 👥 **Capacités de collaboration avancées** pour le travail d'équipe
- 🔌 **Écosystème d'outils MCP** profondément intégré
- 🤔 **Fonctionnalités de méta-cognition avancées** pour l'auto-analyse

## Installation

```bash
# Installer depuis npm
npm install -g smart-thinking-mcp

# Ou depuis GitHub
git clone https://github.com/votre-nom/smart-thinking-mcp.git
cd smart-thinking-mcp
npm install
npm run build
```

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

## Utilisation

Une fois configuré, Smart-Thinking peut être utilisé par Claude pour structurer son raisonnement. Les paramètres disponibles incluent :

- `thought`: Le contenu de la pensée actuelle
- `thoughtType`: Le type de pensée (regular, revision, meta, hypothesis, conclusion)
- `connections`: Connexions à d'autres pensées
- `requestSuggestions`: Demander des suggestions d'amélioration
- `generateVisualization`: Générer une visualisation du graphe de pensée
- `suggestTools`: Suggérer des outils MCP pertinents

### Exemples d'utilisation

1. **Raisonnement simple**
   ```
   Utilise l'outil Smart-Thinking pour analyser les avantages et inconvénients des énergies renouvelables.
   ```

2. **Avec visualisation**
   ```
   Utilise Smart-Thinking avec visualisation pour développer une stratégie marketing.
   ```

3. **Avec recherche intégrée**
   ```
   Utilise Smart-Thinking avec recherche pour analyser les dernières avancées en IA.
   ```

## Comparaison avec Sequential-Thinking

Smart-Thinking représente une évolution majeure par rapport à Sequential-Thinking, apportant:

1. Une structure de pensée multidimensionnelle plutôt que linéaire
2. Une capacité d'adaptation dynamique au contexte et aux besoins
3. Des fonctionnalités avancées de mémoire, d'auto-apprentissage et de collaboration
4. Une intégration plus profonde avec l'écosystème d'outils MCP

## Architecture technique

```
smart-thinking-mcp/
├── src/
│   ├── index.ts              # Point d'entrée du serveur MCP
│   ├── thought-graph.ts      # Implémentation du graphe de pensée
│   ├── memory-manager.ts     # Gestionnaire de mémoire persistante
│   ├── tool-integrator.ts    # Intégration avec d'autres outils MCP
│   ├── quality-evaluator.ts  # Évaluation de la qualité des pensées
│   ├── visualizer.ts         # Générateur de visualisations
│   └── types.ts              # Définitions des types TypeScript
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## Licence

MIT