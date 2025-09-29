# Plan de transformation Smart-Thinking

Ce document détaille les six phases de travail pour retirer les intégrations IA externes, renforcer le raisonnement interne progressif et sécuriser le projet.

## Phase 1 — Neutraliser les dépendances IA existantes
- **Objectifs** : retirer les clés API exposées, bloquer toute utilisation effective des services Cohere/OpenRouter et assurer la compilation sans appels réseau.
- **Tâches clés** :
  - Supprimer/stubber `EmbeddingService` et `openrouter-client` dans les points d'entrée (`src/index.ts`, `ServiceContainer`, `QualityEvaluator`, `VerificationService`).
  - Mettre en place une configuration `FeatureFlags`/`Config` pour désactiver les intégrations IA et signaler leur absence.
  - Nettoyer `package.json` pour retirer les dépendances `cohere-ai`, `openai` et scripts associés.
  - Ajouter des garde-fous (logs/erreurs explicites) lorsque du code tente d'appeler une fonctionnalité IA non disponible.
- **Tests & validations** :
  - `npm run build` pour s'assurer que la base compile sans les SDK externes.
  - Ajouter un test Jest qui vérifie qu'aucune clé API n'est chargée depuis les configs et que les services IA lèvent une erreur contrôlée.

## Phase 2 — Refonte du moteur de similarité interne
- **Objectifs** : remplacer les embeddings Cohere par un moteur local déterministe basé sur le texte et garantir la compatibilité avec la mémoire et le graphe.
- **Tâches clés** :
  - Créer un module `SimilarityEngine` (TF-IDF simplifié + cosine) utilisable hors réseau.
  - Adapter `MemoryManager`, `VerificationMemory` et `ThoughtGraph` pour utiliser le nouveau moteur.
  - Mettre à jour la configuration (`config.ts`) en retirant `EmbeddingConfig` et en introduisant des paramètres propres au moteur local (fenêtre, pondérations, seuils).
- **Tests & validations** :
  - Tests unitaires sur `SimilarityEngine` (cas simples/multi-langues, déduplication, seuils).
  - Tests d'intégration ciblés sur `ThoughtGraph` pour valider la recherche de similarité et la création de connexions pertinentes.

## Phase 3 — Remplacement des évaluations LLM par des heuristiques internes
- **Objectifs** : éliminer l'appel au LLM pour l'évaluation des métriques, des vérifications et des suggestions d'amélioration.
- **Tâches clés** :
  - Implémenter des modules heuristiques pour la confiance, la qualité, la pertinence (scoring basé sur regex/indicateurs linguistiques déjà présents + pondérations).
  - Revoir `MetricsCalculator`, `QualityEvaluator` et `VerificationService` pour s'appuyer uniquement sur ces heuristiques.
  - Fournir un système d’explication (facteurs pondérés) pour rendre le raisonnement transparent.
- **Tests & validations** :
  - Jeux de tests unitaires couvrant chaque heuristique (entrées positives/négatives, seuils extrêmes).
  - Tests d’intégration garantissant que `verifyThought` renvoie un statut cohérent sans accès réseau.

## Phase 4 — Orchestration du raisonnement progressif en toile
- **Objectifs** : structurer le moteur de raisonnement pour qu’il évolue étape par étape en exploitant le graphe de pensées existant.
- **Tâches clés** :
  - [x] Formaliser un pipeline `ReasoningOrchestrator` coordonnant `ThoughtGraph`, `SimilarityEngine`, `VerificationService` et la mémoire.
  - [x] Ajouter un suivi d’étapes (journalisation structurée + visualisation) décrivant l’enchaînement des raisonnements.
  - [x] Étendre le format des nœuds/connexions pour capturer les justifications et poids issus des heuristiques.
- **Tests & validations** :
  - [x] Tests scénarisés (Jest) simulant une session complète et vérifiant la progression étape par étape.
  - [x] Vérification snapshot/logs pour s’assurer que chaque étape référence ses parents et justifications.

## Phase 5 — Renforcement de la persistance, de la sécurité et de la couverture de tests
- **Objectifs** : fiabiliser les stockages (`MemoryManager`, `VerificationMemory`) et garantir une couverture de tests représentative.
- **Tâches clés** :
  - [x] Revoir la sérialisation/désérialisation pour éviter les reliquats d’anciens champs IA et assurer la migration de données.
  - [x] Ajouter des tests de persistence (mock FS) validant les scénarios de lecture/écriture et de cache.
  - [x] Mettre en place un rapport de couverture (Jest + `--coverage`) et intégrer des checks automatiques.
- **Tests & validations** :
  - [x] Tests unitaires sur les modules de persistence.
  - [x] Rapport de couverture > 80 % sur les modules refactorés (statements/lines).

## Phase 6 — Documentation, DX et préparation release
- **Objectifs** : documenter la nouvelle architecture “raisonnement interne”, faciliter l’usage et préparer une release propre.
- **Tâches clés** :
  - Mettre à jour `README.md`, `GUIDE_INSTALLATION.md` et ajouter une section “Reasoning Flow”.
  - Fournir des exemples CLIs / scripts démontrant le raisonnement progressif.
  - Configurer les scripts npm (`lint`, `test`, `start`) pour refléter le nouvel état.
  - Préparer les notes de version et la checklist de déploiement.
- **Tests & validations** :
  - Relecture technique (lint + tests + build) pour la release candidate.
  - Vérification manuelle des exemples fournis (exécution CLI, génération de rapport de raisonnement).
