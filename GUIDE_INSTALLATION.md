# Guide d'installation et de test de Smart-Thinking

Ce guide vous aidera à installer et tester le serveur MCP Smart-Thinking sur toutes les plateformes (Windows, macOS, Linux).

## Prérequis

- Node.js (v14 ou supérieur, v18 recommandé)
- npm (v7 ou supérieur)
- Claude Desktop installé

## Installation

### Option 1: Installation globale depuis npm (recommandée)

La méthode la plus simple et la plus fiable pour installer Smart-Thinking:

```bash
# Installation globale du package
npm install -g smart-thinking-mcp
```

### Option 2: Installation depuis le code source

1. **Cloner le dépôt ou télécharger les sources**

2. **Installer les dépendances**

   ```bash
   # Sur macOS/Linux
   cd "/chemin/vers/Smart-Thinking"
   npm install

   # Sur Windows (CMD)
   cd "C:\chemin\vers\Smart-Thinking"
   npm install
   ```

3. **Compiler le projet**

   ```bash
   npm run build
   ```

4. **Lier le package localement pour les tests**

   ```bash
   npm link
   ```

   Ou créer un package installable localement:

   ```bash
   npm pack
   npm install -g ./smart-thinking-mcp-7.0.0.tgz
   ```

## Configuration avec Claude Desktop

### Configuration sur macOS

1. **Créer ou modifier le fichier de configuration de Claude Desktop**

   Ouvrir ou créer le fichier:

   ```bash
   mkdir -p ~/Library/Application\ Support/Claude/
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

   Contenu pour l'installation globale:

   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "smart-thinking-mcp"
       }
     }
   }
   ```

   OU pour l'installation via npx:

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

   OU pour l'exécution à partir du code source:

   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "node",
         "args": ["/chemin/absolu/vers/Smart-Thinking/build/index.js"]
       }
     }
   }
   ```

### Configuration sur Windows

1. **Créer ou modifier le fichier de configuration**

   Ouvrez l'invite de commande (avec droits d'administrateur pour faciliter la création):

   ```cmd
   mkdir %APPDATA%\Claude
   notepad %APPDATA%\Claude\claude_desktop_config.json
   ```

   Si vous avez installé Smart-Thinking globalement:

   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "C:/Users/VotreNom/AppData/Roaming/npm/smart-thinking-mcp.cmd"
       }
     }
   }
   ```

   OU avec les chemins absolus vers node et le fichier JavaScript:

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
   - Utilisez toujours des barres obliques (`/`) dans les chemins Windows, même si l'OS utilise des antislashs (`\`).
   - Utilisez toujours des chemins absolus sur Windows.

   Si vous utilisez NVM pour Windows:

   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "C:/Users/VotreNom/AppData/Roaming/nvm/v18.x.x/node.exe",
         "args": ["C:/Users/VotreNom/AppData/Roaming/npm/node_modules/smart-thinking-mcp/build/index.js"]
       }
     }
   }
   ```

   **Note**: Adaptez le chemin selon votre installation de NVM et la version de Node que vous utilisez.

### Configuration sur Linux

1. **Créer ou modifier le fichier de configuration**

   ```bash
   mkdir -p ~/.config/Claude/
   nano ~/.config/Claude/claude_desktop_config.json
   ```

   Ajoutez le contenu suivant:

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

## Gestion du système de fichiers (FileSystem)

Smart-Thinking possède une gestion transparente et compatible cross-plateforme pour le système de fichiers, qui fonctionne de manière cohérente sur Windows, macOS et Linux.

### Répertoire de données

Smart-Thinking crée et utilise un dossier `data` dans son répertoire de travail pour stocker ses fichiers:

- Un répertoire `data` sera automatiquement créé lors du premier démarrage
- Toutes les informations persistantes (comme les métriques, les embeddings et les graphiques) sont stockées dans ce répertoire
- Sur Windows, en cas de problème d'accès, un dossier alternatif sera créé dans `Documents/Smart-Thinking/`

### Créer le répertoire de données manuellement (si nécessaire)

Vous pouvez également créer le répertoire de données manuellement:

#### Sur macOS/Linux:
```bash
mkdir -p /chemin/vers/Smart-Thinking/data
```

#### Sur Windows:
```cmd
mkdir "C:\chemin\vers\Smart-Thinking\data"
```

### Permissions d'accès

Assurez-vous que l'utilisateur exécutant Claude Desktop dispose des droits d'accès appropriés:

#### Sur macOS/Linux:
```bash
# Si nécessaire, définir les permissions
chmod -R 755 /chemin/vers/Smart-Thinking/data
```

#### Sur Windows:
- Clic droit sur le dossier → Propriétés → Sécurité
- Assurez-vous que l'utilisateur actuel a des permissions de lecture/écriture

### Configuration des chemins dans Claude Desktop

Pour spécifier un répertoire de données différent, vous pouvez ajouter la variable d'environnement `SMART_THINKING_DATA_DIR` dans la configuration:

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

Pour confirmer que Smart-Thinking fonctionne correctement, vérifiez:

1. **Dans les logs** :
   
   **Sur macOS:**
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```
   
   **Sur Windows:**
   ```cmd
   type %USERPROFILE%\AppData\Local\Claude\logs\mcp*.log
   ```
   ou ouvrez le fichier avec Bloc-notes.
   
   **Sur Linux:**
   ```bash
   tail -f ~/.local/share/Claude/logs/mcp*.log
   ```

2. **Dans la réponse de Claude** : les résultats devraient inclure :
    - Un identifiant de pensée (thoughtId)
    - Des métriques de qualité (confidence, relevance, quality)
    - Des suggestions d'outils (si demandées)
    - Une visualisation (si demandée)
    - Des suggestions pour les prochaines étapes de raisonnement

## Résolution des problèmes

### Problèmes courants sur toutes les plateformes

1. **Le serveur ne se connecte pas**:
   - Vérifiez les logs de Claude Desktop
   - Assurez-vous que le serveur peut être exécuté manuellement
   - Vérifiez la syntaxe du fichier de configuration

2. **Erreurs dans les logs**:
   - Vérifiez que les dépendances sont correctement installées
   - Assurez-vous que Node.js est à jour
   - Vérifiez les permissions d'accès au répertoire de données

### Problèmes spécifiques à Windows

1. **Smart-Thinking n'apparaît pas dans Claude Desktop**:
   - Utilisez toujours des chemins absolus dans le fichier de configuration
   - Utilisez des forward slashes (`/`) dans les chemins, même sur Windows
   - Installez le package globalement plutôt que d'utiliser npx
   - Vérifiez les logs pour des erreurs spécifiques

2. **Erreurs d'accès aux fichiers**:
   - Exécutez Claude Desktop en tant qu'administrateur
   - Vérifiez les permissions du dossier de données
   - Si les erreurs persistent, configurez un dossier alternatif avec la variable d'environnement `SMART_THINKING_DATA_DIR`

3. **Problèmes avec NVM sur Windows**:
   - Utilisez le chemin complet vers la version active de Node.js
   - Vérifiez que les variables d'environnement sont correctement configurées

### Problèmes spécifiques à macOS/Linux

1. **Permissions insuffisantes**:
   ```bash
   # S'assurer que le script est exécutable
   chmod +x $(which smart-thinking-mcp)
   # Ou pour une installation depuis le code source
   chmod +x /chemin/vers/Smart-Thinking/build/index.js
   ```

2. **Problèmes de répertoire de données**:
   ```bash
   # Créer manuellement le répertoire et définir les permissions
   mkdir -p /chemin/vers/data
   chmod 755 /chemin/vers/data
   ```

## Compatibilité avec différents clients MCP

Smart-Thinking est compatible avec les clients MCP suivants:

- **Claude Desktop App**: Compatibilité complète avec toutes les fonctionnalités
- **5ire**: Compatible avec les outils
- **Bee Agent Framework**: Compatible avec les outils
- **Cline**: Compatible avec les outils et les ressources
- **Continue**: Compatibilité complète
- **Cursor**: Compatible avec les outils
- **LibreChat**: Compatible avec les outils
- **mcp-agent**: Compatible avec les outils et le sampling limité
- **Roo Code**: Compatible avec les outils et les ressources
- **Windsurf Editor**: Compatible avec les outils

Pour une liste complète des clients compatibles et leurs capacités, consultez la [documentation officielle du MCP](https://modelcontextprotocol.io/clients).

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

## Déploiement sur npm

### 1. Préparation du package

#### Étape 1: Vérifier le fichier package.json

Assurez-vous que le fichier package.json contient les informations correctes :
- Le nom du package (smart-thinking-mcp)
- La version (actuelle: 7.0.0)
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
# Mise à jour d'un correctif (7.0.0 -> 7.0.1)
npm version patch

# Mise à jour mineure (7.0.0 -> 7.1.0)
npm version minor

# Mise à jour majeure (7.0.0 -> 8.0.0)
npm version major

# Publier la nouvelle version
npm publish
```

## Ressources supplémentaires

- [Documentation officielle du MCP](https://modelcontextprotocol.io)
- [GitHub du protocole MCP](https://github.com/modelcontextprotocol)
- [Liste des clients MCP compatibles](https://modelcontextprotocol.io/clients)
- [Liste des serveurs MCP disponibles](https://modelcontextprotocol.io/examples)