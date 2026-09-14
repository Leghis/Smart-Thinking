# Smart-Thinking v13 — Architecture

## Vue d'ensemble

```
Client MCP (Claude, ChatGPT, Cursor, Cline, …)
        │
        ▼
┌────────────────────────────── server/ ──────────────────────────────┐
│ smart-thinking-server.ts   contrats zod, outils, prompts, ressources │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌─────────────────── reasoning-orchestrator.ts ────────────────────────┐
│ 1. Contexte session      5. Vérification réelle (calculs/cohérence/web)│
│ 2. Plan (planner.ts)     6. Suggestions (step-suggester, outils)      │
│ 3. Hypothèses            7. Critique (biais, améliorations)           │
│ 4. Graphe + métriques    8. Persistance (graphe, mémoire, session)    │
└──┬────────┬──────────────┬──────────────┬───────────────┬────────────┘
   │        │              │              │               │
   ▼        ▼              ▼              ▼               ▼
thought  metrics-       verification-  search/        session-store
-graph   calculator     service        (Tavily,       plan, preuves,
+ conn-  + quality-     (honnête,      fetch URL,     hypothèses,
inference evaluator     ledger)        natif)         config recherche
   │                       │
   ▼                       ▼
memory-manager         verification-memory
(mémoires session)     (index des vérifications)
```

Outils MCP (standard scientifique) : `protocol` (workflow standard), `compute`
(sandbox Python exact sympy/numpy/scipy), `claim`/`audit` (registre de certificats),
`cas`, `math_knowledge`, `calculate`, `solve_logic`, `solve_math`, `research`, `critique`,
`smartthinking`, `plan`, `verify`, `web_search`, `web_crawl`, `search`, `fetch`, `session`.

Le **protocole standard** (`protocol`, prompt `smartthinking-science-protocol`) classe le
domaine (théorie des nombres, distribué, causal, optimisation, codage, quantique, contrôle,
finance, inverse, agents), impose : plan → calcul exact (`compute`/`cas`) → certificat par
résultat (`claim`) → audit (`audit`) → checklist des pièges → limites. C'est le mode par
défaut recommandé pour tout problème de recherche.

## Principes

1. **Honnêteté de vérification.** Aucun provider simulé ne renvoie de succès. Sans preuve, le statut est `unverified` et `methodsUnavailable` est explicite. Un calcul faux force `contradicted`.
2. **Déterminisme local.** Similarité TF-IDF, calculs (Shunting-Yard, sans `eval`), métriques heuristiques et planification sont reproductibles hors-ligne.
3. **Sessions isolées.** Toutes les données sont indexées par `sessionId` assaini (`assertSafeSessionId`) : pas de fuite entre sessions, pas de path traversal.
4. **Recherche web optionnelle.** Tavily si une clé est fournie (env ou session), sinon le client exécute sa recherche native. La clé de session n'est jamais écrite sur disque.
5. **Passif d'abord.** Le graphe ne déclenche aucun effet de bord (pas de vérification en arrière-plan) ; l'orchestrateur pilote tout, ce qui rend le pipeline testable et déterministe.
6. **Erreurs typées.** `src/errors.ts` mappe chaque échec vers un code stable (`VALIDATION_ERROR`, `PROVIDER_ERROR`, …) utilisé par les outils MCP.

## Flux d'un appel `smartthinking`

1. `resolvePlan` / `resolveHypotheses` mettent à jour l'état de session si demandé.
2. `performPreliminaryVerification` détecte les calculs et les valide.
3. `ThoughtGraph.addThought` insère la pensée, établit les connexions réciproques.
4. `QualityEvaluator.evaluate` calcule confiance/pertinence/qualité via `MetricsCalculator` **partagé** (les traces heuristiques sont donc réelles).
5. `VerificationService.verifyClaim` exécute les contrôles activés et agrège un `VerificationResult` avec `checks`, `evidence` et `methodsUnavailable`.
6. Le plan, les hypothèses et les preuves sont persistés dans `SessionStore` ; le graphe dans `MemoryManager`.
7. La réponse contient métriques, statut de vérification, résumé de certitude, suggestions, requêtes de recherche recommandées et timeline de raisonnement.

## Stratégies de profondeur

| Profil | Inférence | Vérification | Suggestions | Requêtes web |
| --- | --- | --- | --- | --- |
| `fast` | non | minimale (calculs) | 2 | 0 |
| `balanced` | oui | standard (calculs + cohérence) | 4 | 2 |
| `deep` | oui | approfondie (+ web) | 6 | 4 |

## Recherche web

- `src/search/tavily-client.ts` : client Tavily (search/extract), redaction des clés, erreurs typées, timeout.
- `src/search/url-content.ts` : fetch direct avec blocage SSRF, limite de taille, extraction HTML → texte.
- `src/search/search-service.ts` : résolution du provider (`auto` → Tavily si clé, sinon natif), cache TTL borné, génération de requêtes.
- Délégation native : la réponse contient `requiresClientAction: true` et une consigne explicite ; le serveur ne prétend jamais avoir cherché.

## Persistance

| Fichier | Contenu |
| --- | --- |
| `<dataDir>/memories/<session>.json` | mémoires de session |
| `<dataDir>/knowledge.json` | base de connaissances locale |
| `<dataDir>/graph_state_<session>.json` | graphe exporté |
| `<dataDir>/verifications.json` | index des vérifications (v2, lecture v1 compatible) |
| `<dataDir>/sessions/session_state_<session>.json` | plan, hypothèses, preuves, config recherche (sans clé) |

Écritures atomiques (fichier temporaire + rename), files d'attente sérialisées, nettoyage des entrées expirées.

## Tests & preuves

- 23 suites / 171 tests : unitaires, intégration (orchestrateur, sessions, persistance), E2E MCP (`Client` + `InMemoryTransport`).
- `src/bench/` : datasets de 33 tâches, grading déterministe, providers simulate/OpenAI-compatible/OpenCode HTTP, statistiques (p50/p95, test du signe).
- `npm run proof` régénère `proofs/PROOFS.md` (couverture + benchmark).

## Limitations connues

- L'extraction HTML est volontairement simple (pas de moteur de rendu JS).
- Le cache de vérification est en mémoire par processus.
- La recherche web dépend d'un provider externe (Tavily) ou du client ; le serveur ne fournit pas de moteur de recherche maison.
- Les heuristiques linguistiques sont optimisées pour le français et l'anglais.
