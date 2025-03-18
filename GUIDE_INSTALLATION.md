# Guide d'installation et de test de Smart-Thinking

Ce guide vous aidera à installer et tester le serveur MCP Smart-Thinking.

## Prérequis

- Node.js (v18 ou supérieur)
- npm (v8 ou supérieur)
- Claude Desktop installé

## Installation

1. **Installer les dépendances**

   ```bash
   cd "/Users/leghis/Downloads/projet improvise/Smart-Thinking"
   npm install
   ```

2. **Compiler le projet**

   ```bash
   npm run build
   ```

3. **Rendre le fichier exécutable** (uniquement sur macOS/Linux)

   ```bash
   chmod +x build/index.js
   ```

4. **Lier le package localement pour les tests**

   ```bash
   npm link
   ```

## Configuration avec Claude Desktop

1. **Créer ou modifier le fichier de configuration de Claude Desktop**

   Ouvrir le fichier : `~/Library/Application Support/Claude/claude_desktop_config.json`

   Si le fichier n'existe pas, créez-le avec le contenu suivant:

   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "npx",
         "args": ["smart-thinking-mcp"]
       }
     }
   }
   ```

2. **Redémarrer Claude Desktop**

   Fermez complètement l'application Claude Desktop et redémarrez-la pour charger le nouveau serveur MCP.

## Tests

Une fois Claude Desktop redémarré, vous pouvez tester Smart-Thinking avec les prompts suivants:

1. **Test de base**:
   ```
   Utilise l'outil Smart-Thinking pour analyser les avantages et inconvénients des énergies renouvelables.
   ```

2. **Test avec visualisation**:
   ```
   Utilise Smart-Thinking avec visualisation (generateVisualization=true) pour développer une stratégie marketing pour un nouveau produit tech.
   ```

3. **Test avec suggestions d'outils**:
   ```
   Utilise Smart-Thinking avec suggestTools=true pour rechercher et analyser les dernières avancées en intelligence artificielle.
   ```

4. **Processus de pensée complexe**:
   ```
   Utilise l'outil Smart-Thinking pour développer un raisonnement structuré sur le problème suivant : "Comment les villes peuvent-elles se préparer efficacement au changement climatique?". Utilise plusieurs types de pensée (regular, meta, hypothesis) et crée des connexions entre elles.
   ```

## Vérification du fonctionnement

Pour confirmer que Smart-Thinking fonctionne correctement, vérifiez :

1. **Dans le terminal** : vous devriez voir des logs indiquant que Smart-Thinking traite les pensées
2. **Dans la réponse de Claude** : les résultats devraient inclure :
   - Un identifiant de pensée (thoughtId)
   - Des métriques de qualité (confidence, relevance, quality)
   - Des suggestions d'outils (si demandées)
   - Une visualisation (si demandée)
   - Des suggestions pour les prochaines étapes de raisonnement

## Déploiement sur npm

### 1. Préparation du package

#### Étape 1: Vérifier le fichier package.json

Assurez-vous que le fichier package.json contient les informations correctes :
- Le nom du package (smart-thinking-mcp)
- La version (commencez par 1.0.0)
- La description
- Les auteurs
- La licence
- Les mots-clés appropriés pour la découvrabilité

#### Étape 2: Compiler le projet final

```bash
# S'assurer que tout est bien compilé avant publication
npm run build
```

#### Étape 3: Tester le package localement

```bash
# Tester que le package fonctionne correctement
node build/index.js
```

### 2. Création d'un compte npm (si nécessaire)

1. Visitez [npmjs.com](https://www.npmjs.com/) et cliquez sur "Sign Up"
2. Remplissez le formulaire avec votre nom d'utilisateur, email et mot de passe
3. Vérifiez votre adresse email (un lien vous sera envoyé)

### 3. Publication sur npm

#### Étape 1: Se connecter à npm

```bash
# Entrez vos identifiants quand demandé
npm login
```

#### Étape 2: Publier le package

```bash
# Pour une première publication avec accès public
npm publish --access public
```

#### Étape 3: Vérifier la publication

Visitez `https://www.npmjs.com/package/smart-thinking-mcp` pour confirmer que votre package est bien publié.

### 4. Installation globale après publication

Une fois publié, n'importe qui peut installer votre package avec :

```bash
npm install -g smart-thinking-mcp
```

### 5. Mises à jour futures

Pour les mises à jour ultérieures, mettez à jour le numéro de version :

```bash
# Mise à jour d'un correctif (1.0.0 -> 1.0.1)
npm version patch

# Mise à jour mineure (1.0.0 -> 1.1.0)
npm version minor

# Mise à jour majeure (1.0.0 -> 2.0.0)
npm version major

# Publier la nouvelle version
npm publish
```

## Comparaison détaillée entre Smart-Thinking et Sequential-Thinking

### 1. Architecture de raisonnement

**Sequential-Thinking**:
- Structure linéaire avec pensées numérotées
- Progression séquentielle d'une pensée à l'autre
- Branches limitées et révisions possibles mais secondaires

**Smart-Thinking**:
- Architecture en graphe multi-dimensionnel
- Types variés de connexions (support, contradiction, raffinement, etc.)
- Exploration parallèle de plusieurs aspects d'un problème
- Navigation naturelle entre différents niveaux et branches de pensée

**Exemple concret**: Pour analyser "l'impact de l'IA sur l'emploi", Sequential-Thinking obligerait à une progression linéaire (définition > aspects positifs > aspects négatifs > conclusion), tandis que Smart-Thinking permettrait d'explorer simultanément différentes branches (aspects technologiques, économiques, éthiques) avec des connexions entre elles.

### 2. Adaptation dynamique

**Sequential-Thinking**:
- Estimation fixe ou manuelle du nombre de pensées nécessaires
- Rigidité dans la structure prédéfinie

**Smart-Thinking**:
- Estimation auto-adaptative basée sur la progression
- Ajustement dynamique selon la complexité du problème
- Points d'arrêt conditionnels basés sur des critères de qualité

### 3. Mémoire et apprentissage

**Sequential-Thinking**:
- Pas de mémoire entre les sessions
- Chaque raisonnement repart de zéro

**Smart-Thinking**:
- Base de connaissances persistante
- Récupération contextuelle des informations pertinentes
- Apprentissage des patterns de raisonnement efficaces
- Amélioration continue basée sur les expériences passées

### 4. Évaluation de qualité

**Sequential-Thinking**:
- Pas d'évaluation automatique de la qualité
- Pas de détection des biais ou faiblesses

**Smart-Thinking**:
- Métriques précises pour la confiance, la pertinence et la qualité
- Détection des biais cognitifs courants
- Suggestions d'amélioration personnalisées
- Évaluation de la cohérence globale du raisonnement

### 5. Visualisation

**Sequential-Thinking**:
- Pas de visualisation intégrée
- Représentation textuelle uniquement

**Smart-Thinking**:
- Visualisations multiples (graphe, chronologique, thématique)
- Représentation visuelle des connexions et leur importance
- Navigation interactive dans le réseau de pensées
- Mise en évidence des patterns et clusters thématiques

### 6. Intégration avec l'écosystème d'outils

**Sequential-Thinking**:
- Recommandations d'outils basiques sans contexte approfondi

**Smart-Thinking**:
- Recommandations d'outils intelligentes basées sur l'analyse du contenu
- Scores de confiance et justifications détaillées
- Prioritisation adaptative des outils selon le contexte
- Intégration profonde avec les résultats des outils dans le graphe de pensée

### 7. Tableau comparatif global

| Critère | Sequential-Thinking (note/10) | Smart-Thinking (note/10) | Différence |
|---------|-------------------------------|---------------------------|------------|
| Flexibilité de raisonnement | 5 | 9 | +4 |
| Adaptation dynamique | 4 | 8 | +4 |
| Mémoire persistante | 3 | 8 | +5 |
| Auto-apprentissage | 2 | 9 | +7 |
| Évaluation de qualité | 4 | 8 | +4 |
| Visualisation | 2 | 9 | +7 |
| Intégration d'outils | 6 | 9 | +3 |
| Personnalisation | 3 | 8 | +5 |
| Collaboration | 3 | 8 | +5 |
| Méta-cognition | 4 | 9 | +5 |
| **Score moyen** | **3.6** | **8.5** | **+4.9** |

**Conclusion** : Smart-Thinking représente une amélioration considérable par rapport à Sequential-Thinking, avec un score moyen supérieur de 4.9 points. Les améliorations les plus significatives concernent l'auto-apprentissage, la visualisation et la mémoire persistante. Ces avancées transforment l'expérience de raisonnement structuré en la rendant beaucoup plus naturelle, flexible et puissante.

## Résolution des problèmes

Si vous rencontrez des erreurs:

1. **Vérifiez les logs de Claude Desktop** (Menu Aide > Ouvrir les journaux)
2. **Vérifiez que le serveur MCP est bien démarré** (vous devriez voir un message de confirmation dans le terminal)
3. **Vérifiez que le fichier de configuration est correctement formaté**
4. **Assurez-vous que toutes les dépendances sont installées** (`npm install`)

Pour plus d'informations, consultez la documentation de Model Context Protocol sur [modelcontextprotocol.io](https://modelcontextprotocol.io).
