# Changelog

## v13.0.0 — Refonte complète : raisonnement outillé, vérification honnête, recherche web

### Ajouts majeurs

- **Recherche web réelle** : `web_search`, `fetch` d'URL, `search` unifié.
  - Provider Tavily (clé globale `TAVILY_API_KEY` ou par session via `session(action="configure_search")`, jamais persistée sur disque).
  - Délégation au moteur natif du client quand aucun provider serveur n'est disponible.
- **Vérification honnête** : nouveau `VerificationService` avec ledger de preuves (`checks`, `evidence`, `methodsUnavailable`). Plus aucun résultat simulé ; un calcul faux force `contradicted`.
- **Planification** : outil `plan` (décomposition en étapes testables) et suivi de statut par session.
- **Hypothèses** : registre persistant avec preuves pour/contre et statut dérivé (`open`, `supported`, `refuted`, `inconclusive`).
- **Stratégies de profondeur** : `fast`, `balanced`, `deep` sur tous les outils de raisonnement.
- **Session store** : plan, hypothèses, preuves et configuration de recherche par session (`session`).
- **Prompts MCP** : `smartthinking-deep-reasoning`, `smartthinking-reasoning-plan`, `smartthinking-verify-claim`.
- **Benchmark A/B** : harness `src/bench/` (25 tâches, grading déterministe, providers simulate/OpenAI-compatible/OpenCode HTTP, statistiques p50/p95 + test du signe).

### Corrections critiques

- Suppression de la vérification fabriquée (`ToolIntegrator` renvoyait `isValid: true` sans appel réseau).
- Les calculs incorrects ne sont plus marqués comme vérifiés.
- Les traces heuristiques utilisent enfin le `MetricsCalculator` partagé.
- Invalidation de cache de qualité sur changement de contenu.
- Path traversal sur `sessionId` bloqué (`assertSafeSessionId`).
- Caches cross-session supprimés.
- Écritures atomiques partagées ; plus de données de démo injectées.
- `new Function` retiré de l'évaluateur mathématique (Shunting-Yard + table de dispatch).
- Timers de nettoyage `unref()` pour permettre l'arrêt propre du processus.
- Sessions scoping dans l'inférence de graphe et les suggestions.

### Nettoyage

- Suppression de `tool-integrator.ts`, `feature-flags.ts`, `utils/openrouter-client.ts`, `services/service-container.ts`, `heuristics/constants.ts`, `examples/demo-session.ts`.
- Dépendances `uuid`, `@types/uuid`, `mkdirp` retirées.
- `thought-graph.ts` scindé en `connection-inference.ts` et `step-suggester.ts`.
- Méthodes mortes supprimées (vérification, métriques, similarité).

### Compatibilité

- **Breaking** : v13 remplace les modes « external tools » et l'API de vérification. Les graphes et mémoires persistés restent lisibles ; les vérifications passent en format v2 avec lecture v1 automatique.
- Le mode `--mode=connector` reste limité à `search` et `fetch`.
