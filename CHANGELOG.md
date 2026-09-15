# Changelog

## v13.1.1 — Le registre de certificats survit au redémarrage, diagnostics honnêtes

### Corrections

- **Registre de certificats durable.** Les affirmations (`claim`) étaient stockées en mémoire et disparaissaient à chaque redémarrage du serveur, alors que le graphe, le plan et les preuves survivaient. Elles sont désormais persistées par session (comme le plan et les hypothèses), rechargées à la demande par `claim`/`audit`/`session export`, et comptées dans `session(action="status")` (`claims`, `claimsWithoutCertificate`). `session reset` les efface avec le reste.
- **Purge des preuves neutres héritées.** Les extraits web `stance: "neutral"` enregistrés par les versions < 13.1 (hors sujet, jamais des preuves) sont retirés au chargement de la session ; le nombre purgé est exposé dans `session status` (`evidencePurged`), et `addEvidence` refuse désormais d'en enregistrer de nouveaux.
- **Diagnostics de budget exacts.** `research` annonçait « budget épuisé » alors que le budget restait largement disponible : l'agent géré Tavily coûte ~50 crédits, au-dessus du plafond par défaut de 25. Le refus distingue maintenant `budget` (vraiment épuisé) de `budget_insufficient` (coût de l'appel > restant) avec le détail chiffré, et `provider: "auto"` bascule vers le multi-hop interne en expliquant pourquoi au lieu de refuser. `web_agent` distingue `truncationReason: "session_budget"` de `"call_budget"` (plafond par appel via `maxCredits`).
- **Compteur de crédits persistant.** Les crédits consommés sont écrits dans la session : le compteur ne repart plus de zéro après un redémarrage et deux processus ne peuvent plus diverger sur la même session.
- **Sources dédoublonnées dans `verify`.** Plusieurs requêtes renvoyant la même URL la comptaient deux fois (« 5 sources » pour 3 domaines) ; chaque source est désormais comptée une fois.
- **Résumé cohérent avec le verdict.** `certaintySummary` disait « plusieurs sources fiables confirment » pour un résultat démontré par un calcul, avec zéro preuve. Le texte distingue maintenant le déterministe (« preuve déterministe, aucune corroboration externe requise ») du web, et une preuve exacte vaut `confidence: 1` (un calcul exact n'est pas une estimation probabiliste).
- **`cas` et l'opérateur `^`.** `(x+1)^2` plantait avec `TypeError: unsupported operand type(s) for ^` (SymPy lit `^` comme un XOR). L'opérateur est converti en `**` avec `normalizedPower: true` et une note ; `calculate` acceptait déjà `^`.
- **Échec vide explicite dans `web_agent`.** Une exécution sans preuve exploitable renvoie désormais `empty: true`, `emptyReason` (`no_results` | `no_relevant_sentence` | `extraction_failed`), un `hint` actionnable et un bloc `diagnostics` (sources, pages extraites, phrases lues/retenues, extraits neutres jetés) — plus de succès silencieux.
- **Métriques étiquetées.** `metricsBasis` porte un `disclaimer` explicite : `qualityMetrics` sont des heuristiques de forme (modalisation, vocabulaire, structure), pas une mesure de fiabilité ; la description de `smartthinking` le rappelle et renvoie vers `verificationStatus` et `claim`/`audit`.

## v13.1.0 — Vérité déterministe, agent internet autonome, budget de contexte

### Corrections d'exactitude

- **`verify` : le déterministe tranche.** Un contrôle exact concluant donne `verified` (confiance 0,95) ou `contradicted` (0,90) ; la couche web n'est plus appelée et ne peut donc plus diluer une preuve formelle. Exemple corrigé : `(1234*5678)+91011 = 7097663` renvoyait `partially_verified` (0,65) avec des sources hors sujet stockées comme preuves ; il renvoie désormais `verified` (0,95) sans aucun appel réseau.
- **Indépendance des sources** : `verified` exige ≥ 2 domaines distincts ; une seule domaine → `partially_verified`. Nouveau champ `verificationBasis` (déterministe / web / mixte / aucune) et compteur `discardedNeutral` ; les extraits neutres ne sont plus conservés comme preuves ni écrits en session.
- **`protocol`** : classification de domaine élargie (cubes, puissances, diophantien, taxibab/Ramanujan, sommes de deux/trois, divisibilité, pgcd…) avec `domainConfidence` et `matchedSignals` auditables.
- **`math_knowledge` / `protocol`** : filtrage strict des fiches (correspondance titre/mot-clé et score minimal, mots vides ignorés). Un problème de sommes de deux cubes ne reçoit plus de fiches Gauss/Eisenstein hors sujet ; sans fiche pertinente, `knowledgeNote` est renvoyé.
- **`plan`** : sélection par signaux pondérés (`template`, `matchConfidence`, `signals`), gabarit `generic` par défaut, paramètre `template` pour forcer. Un objectif qui mentionne « recherche documentaire » ne produit plus un plan de revue de littérature ; `searchQueries` n'est renvoyé que pour un plan de recherche.
- **Suggestions** : plus aucun outil fantôme (`perplexity_search_web`, `tavily-search`, `tavily-extract`, `executePython`, `executeJavaScript`, `calculator`, `source_check`) ; les suggestions sont filtrées sur la liste réelle des outils et le rappel « va chercher sur le web » dépend des besoins réellement détectés.

### Nouveau : agent internet

- **`web_agent`** : boucle de recherche autonome bornée (décomposition, recherche, déduplication par domaine, extraction, preuves avec stance, réponses candidates croisées, contradictions, citations), preuves persistées en session.
- **Budget de crédits web par session** (`SMART_THINKING_WEB_CREDIT_BUDGET`, défaut 25) partagé par `web_agent`, `web_search`, `web_crawl` et `research` ; `session(action="status")` expose `webBudget`.
- **Dégradation explicite** : `degraded`/`reason` (`auth`, `quota`, `rate_limit`, `timeout`, `server`, `budget`) au lieu d'un repli silencieux. `research` annonce `mode` (`tavily_agent` | `internal`) et `fallbackReason` ; `web_crawl` signale `empty: true` + `hint`.

### Contexte

- Instructions serveur réduites de ~3 400 à ~900 caractères (elles sont dupliquées par le client sur chaque outil) ; le guide complet passe dans `smartthinking(help=true)` et la ressource `smart-thinking://docs/about` (test de garde sur la taille).
- `smartthinking` : `responseDetail: "compact"` par défaut (plus de `reasoningTimeline` ni de `reliabilityScore`, suggestions plafonnées à 2) ; `qualityMetrics` accompagné de `metricsBasis` (contributions détaillées) et marqué `heuristic: true`.

### Compatibilité

- **Breaking léger** : un calcul exact n'est plus rapporté comme « partiellement vérifié » mais comme « vérifié ». Les champs existants sont conservés ; `partially_verified` reste atteignable (un seul domaine web, cas non déterministe).
- Nouvel outil exposé : `web_agent` (20 outils au total).

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
