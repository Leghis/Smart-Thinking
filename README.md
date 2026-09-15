# Smart-Thinking

[![npm version](https://img.shields.io/npm/v/smart-thinking-mcp.svg)](https://www.npmjs.com/package/smart-thinking-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-blue)](https://github.com/Leghis/Smart-Thinking)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS-blue)](https://github.com/Leghis/Smart-Thinking)
[![Platform: Linux](https://img.shields.io/badge/Platform-Linux-blue)](https://github.com/Leghis/Smart-Thinking)

**v13 — un serveur MCP qui rend les LLM dramatiquement meilleurs sur les problèmes complexes.**

Un LLM seul improvise. Branché sur Smart-Thinking, il planifie, structure, vérifie, cite ses sources et reprend son raisonnement entre les sessions. L'objectif est simple : donner à n'importe quel modèle — y compris de taille moyenne — les outils qui le font passer d'une réponse plausible à une réponse fiable.

## Pourquoi Smart-Thinking

| Sans Smart-Thinking | Avec Smart-Thinking |
| --- | --- |
| Réponse en un seul jet, non vérifiable | Plan explicite en étapes testables (`plan`) |
| Calculs à l'œil, erreurs silencieuses | Solveurs exacts (`calculate`, `solve_math`, `solve_logic`) + `verify` |
| Faits hallucinés | Sources web réelles et citées (`web_search`) |
| Oublie tout d'un tour à l'autre | Graphe de pensées + mémoire persistante (`smartthinking`) |
| Ne distingue pas fait et hypothèse | Statut de vérification et confiance explicites |
| Recherche web absente ou opaque | Tavily par utilisateur, ou délégation au moteur natif du client |

Les preuves mesurées (tests, couverture, benchmark avec/sans l'outil) sont dans [`proofs/PROOFS.md`](proofs/PROOFS.md).

## Outils MCP

| Outil | Rôle |
| --- | --- |
| `protocol` | Protocole scientifique standard : classer le domaine, plan, calcul exact, certificats, pièges, format de réponse. |
| `compute` | Sandbox Python exact (sympy/numpy/scipy/mpmath) pour produire des certificats (CRT, LP, corps finis, valeurs propres, énumérations). |
| `claim` / `audit` | Registre de certificats : aucun résultat sans méthode ni preuve ; audit avant la réponse finale. |
| `calculate` | Calcul déterministe d'expressions (`(120*0.45)`, `Math.sqrt(144)`, `12*4+6 = 54`). |
| `solve_logic` | Solveur exact d'ordre/classement (avant/après, plus rapide/lent, >/<) : ordre unique ou contradiction. |
| `solve_math` | Solveur exact d'équations linéaires, systèmes et quadratiques. |
| `cas` | Calcul symbolique exact (SymPy) : identités, factorisation, polynôme minimal, congruences, fonctions elliptiques. |
| `math_knowledge` | Base de connaissances mathématiques classiques (Weierstrass, duplication, réseau carré, Gauss/Eisenstein, méthodes de preuve). |
| `web_agent` | **Agent internet autonome** borné : décomposition en sous-questions, recherche, déduplication par domaine, extraction des pages, stance par source, contradictions, réponses candidates citées. |
| `research` | Rapport web long via l'agent géré Tavily, ou repli multi-hop interne annoncé explicitement (`mode`, `fallbackReason`). |
| `critique` | Revue adversariale d'un brouillon (erreurs, faits non prouvés, étapes manquantes) via modèle assistant. |
| `smartthinking` | Cœur du système : ajoute une pensée au graphe (métriques heuristiques traçables, vérification, plan, hypothèses). `responseDetail: compact` par défaut, `full` pour l'enveloppe complète. |
| `plan` | Décompose un objectif en 2–20 étapes ordonnées, avec gabarit détecté par signaux (`template`, `signals`) ou forcé. |
| `verify` | Vérifie une affirmation : un contrôle déterministe exact tranche seul (`verified` 0,95) ; sinon croisement web par domaines indépendants. |
| `web_search` | Recherche web via Tavily, ou délégation native si aucun moteur serveur n'est configuré. |
| `search` | Recherche unifiée mémoires + web (compatible connecteurs OpenAI/ChatGPT). |
| `fetch` | Récupère une mémoire par id **ou** le contenu texte d'une URL. |
| `session` | État, export, reset, configuration de la clé Tavily, mise à jour du plan. |

Prompts MCP fournis : `smartthinking-deep-reasoning`, `smartthinking-reasoning-plan`, `smartthinking-verify-claim`.

## Recherche web : Tavily ou natif

Smart-Thinking ne force aucune clé API. Trois modes :

1. **Natif (défaut)** — si le client LLM possède sa propre recherche (ChatGPT, Claude avec web, Gemini…), `web_search` renvoie une demande d'action structurée et le modèle exécute sa recherche lui-même.
2. **Tavily par utilisateur** — sans moteur natif, chaque utilisateur connecte sa clé :
   - globalement : `export TAVILY_API_KEY=tvly-...`
   - ou par session, sans écrire la clé sur disque :
     ```
     session(action="configure_search", provider="tavily", tavilyApiKey="tvly-...", sessionId="...")
     ```
3. **Désactivé** — `provider="off"` pour un mode 100 % local.

Dans tous les cas, `verify` précise ce qui a réellement été vérifié et ce qui ne l'a pas été (`methodsUnavailable`).

### Agent internet (`web_agent`)

Boucle serveur bornée : décomposition → recherche → déduplication (URL + domaine) → extraction des pages → preuves au niveau phrase avec stance par source → réponses candidates croisées par domaines indépendants → contradictions → citations. Les preuves sont écrites dans la session.

Paramètres : `question`, `maxSources` (≤ 20), `maxRounds` (≤ 4), `maxCredits`, `includeDomains`, `excludeDomains`, `timeRange`, `provider`.

Comportements explicites, jamais silencieux :

- **Budget** — chaque appel compte ses crédits (`web_search` 1, `web_agent` 1/recherche + 1/5 pages extraites, `web_crawl` 5 (crawl) ou 1 (map), `research` ≈ 50 pour l'agent géré). Plafond par session via `SMART_THINKING_WEB_CREDIT_BUDGET` (défaut 25), visible dans `session(action="status")` ; le compteur vit en mémoire et repart à zéro au redémarrage du serveur. Budget épuisé → `degraded: true, reason: "budget"` et aucun appel réseau.
- **Budget (suite)** — le compteur est **persisté dans la session** (il ne repart plus de zéro après un redémarrage et deux processus ne divergent plus). Les refus distinguent `reason: "budget"` (vraiment épuisé) de `"budget_insufficient"` (l'appel coûte plus que le restant, ex. `research` ≈ 50 crédits pour un plafond de 25) ; `provider: "auto"` bascule alors vers le multi-hop interne en expliquant pourquoi. `web_agent` précise `truncationReason: "session_budget"` ou `"call_budget"`.
- **Dégradation** — clé absente → délégation native (`requiresClientAction`) ; 401/403 → `reason: "auth"` ; 429 → `"rate_limit"` ; 432/433 → `"quota"`. La réponse contient ce qui a déjà été collecté. Une exécution sans preuve exploitable renvoie `empty: true` + `emptyReason` + `hint` + un bloc `diagnostics` (jamais un succès silencieux).
- **Recherche vide** — `web_crawl` renvoie `empty: true` + `hint` au lieu d'un succès muet.

## Session, certificats et preuves

- `claim` / `audit` : le registre de certificats est **persisté par session** et survit au redémarrage du serveur ; `session(action="status")` expose `claims` et `claimsWithoutCertificate`.
- Les extraits web `stance: "neutral"` ne sont **jamais** enregistrés comme preuves ; ceux écrits par les versions < 13.1 sont purgés au chargement (`evidencePurged` dans `session status`).
- Un contrôle exact (calcul, solveur, CAS) est une **preuve** : `verify` renvoie `confidence: 1`, `verificationBasis.kind: "deterministic"`, aucune requête web, et un `certaintySummary` qui ne parle pas de « sources fiables ».
- `qualityMetrics` (smartthinking) sont des **heuristiques de forme** (modalisation, vocabulaire, structure) : `metricsBasis.disclaimer` le rappelle. Pour la vérité, utilisez `verificationStatus`, `verify` et `claim`/`audit`.
- `cas` accepte `^` comme puissance (`(x+1)^2`) en le convertissant en `**` : la réponse porte `normalizedPower: true` et une note.

## Installation

```bash
npm install -g smart-thinking-mcp      # global
npx -y smart-thinking-mcp              # sans installation
```

### Claude Desktop / Claude Code (stdio)

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

### HTTP / SSE (clients distants, ChatGPT connectors)

```bash
SMART_THINKING_MODE=connector node build/index.js --transport=http --host 0.0.0.0 --port 8000
# SSE : http://<host>:8000/sse   |   Streamable HTTP : http://<host>:8000/mcp
```

Le mode connector expose uniquement `search` et `fetch`, dont `search` peut interroger le web via Tavily.

## Configuration

| Variable | Effet | Défaut |
| --- | --- | --- |
| `TAVILY_API_KEY` | Active la recherche web serveur | — |
| `SMART_THINKING_SEARCH_PROVIDER` | `auto` \| `tavily` \| `native` \| `off` | `auto` |
| `SMART_THINKING_SEARCH_DEPTH` | `basic` \| `advanced` | `basic` |
| `SMART_THINKING_MODE` | `full` \| `connector` | `full` |
| `SMART_THINKING_LOG_LEVEL` | `silent` \| `error` \| `warn` \| `info` \| `debug` | `info` |
| `SMART_THINKING_DATA_DIR` | Répertoire de données | plateforme |
| `SMART_THINKING_DISABLE_PERSISTENCE` | `true` pour désactiver l'écriture disque | `false` |

## Développement

```bash
npm run build          # compilation TypeScript
npm run lint           # ESLint strict
npm test               # 219 tests (unitaires, intégration, E2E MCP)
npm run test:coverage  # couverture
npm run bench:sim      # benchmark hors-ligne déterministe
npm run bench:ab       # A/B avec un vrai LLM (OpenAI-compatible / DeepSeek)
npm run proof          # tests + couverture + benchmark → proofs/PROOFS.md
npm run challenge      # harnais de cas (session LLM neuve + MCP, modes bare/autonomous/guided)
```

## Architecture

```
src/
  reasoning-orchestrator.ts   pipeline (contexte → graphe → métriques → vérification → réponse)
  planner.ts / hypotheses.ts  planification et suivi d'hypothèses
  thought-graph.ts            graphe de pensées (façade passive)
  connection-inference.ts     inférence de relations
  step-suggester.ts           suggestions d'étapes suivantes
  metrics-calculator.ts       heuristiques de confiance/pertinence/qualité
  verification-needs.ts       besoins de vérification, biais, résumés de certitude
  services/verification-service.ts  vérification réelle (calculs, cohérence, web)
  search/                     Tavily, fetch URL sécurisé, délégation native
  session-store.ts            plan, hypothèses, preuves, config de session
  memory-manager.ts           mémoires locales par session
  verification-memory.ts      index persistant des vérifications
  server/                     serveur MCP, contrats, outils, prompts, ressources
  bench/                      harness A/B (simulation hors-ligne + LLM réel)
```

Détails : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Qualité & preuves

- 219 tests passent (27 suites), dont un E2E MCP complet via `InMemoryTransport` et des gardes de contexte (taille des instructions, payload compact, noms d'outils).
- Couverture : 82,0 % lignes / 81,1 % statements / 64,8 % branches (base de code élargie : CAS, solveurs, recherche multi-hop).
- Benchmark reproductible avec et sans Smart-Thinking : `npm run proof`.
- Vérification honnête : aucun résultat simulé ne peut être présenté comme vérifié ; les modules de vérification ne fabriquent jamais de sources.
- Calculateur déterministe (`calculate`) : les LLM ne font plus de calcul mental faillible.

Résultats mesurés (détail complet : [`proofs/RAPPORT-TESTS.md`](proofs/RAPPORT-TESTS.md)) :
- Harnais de cas : `npm run challenge -- --dir=<dossier> --concurrency=10`; un dossier contient `enonces.jsonl` (+ `corrections.jsonl`, `certificats.json` optionnels). Modes `ultimate` (défaut : base lean + structure adaptative + certificats), `autonomous` (outils à la demande), `guided` (protocole complet, cas quantitatifs) et `bare` (sans outils). Rapports dans `proofs/case-run-*.json|md`.

| Campagne (deepseek-v4.1-flash) | Sans outil | Avec outil | Delta |
| --- | ---: | ---: | ---: |
| Benchmark global, 67 tâches réelles | 90,3 % | **91,8 %** | **+1,5 pts** |
| HotpotQA multi-hop (web) | 73,3 % | **80,0 %** | **+6,7 pts** |
| Suite « levier outil » | 78,6 % | **92,9 %** | **+14,3 pts** |
| Défi Violet (fonctions elliptiques, guidé) | 52,5 % | **89,7 %** | **+37,2 pts** (juge 9/10) |

GSM8K : 96 % → 92 % (une seule tâche perdue, erreur de compréhension d'énoncé). BBH logique et
tâches dures : 100 % dans les deux conditions (plafond).

### Benchmarks officiels DeepSeek — run GCP complet (v13)

Protocole A/B : même modèle, même jour, même machine, grading déterministe, VM GCP éphémère
détruite après le run (`e2-standard-4`, Docker). « Avec MCP » = mode `ultimate` (défaut).

| Benchmark | Tâches | Sans MCP | Avec MCP | Delta |
| --- | ---: | ---: | ---: | ---: |
| AIME 2025 | 30 | 73,3 % | 73,3 % | +0,0 pt |
| MMLU-Pro | 20 | 75,0 % | **85,0 %** | **+10,0 pts** |
| HMMT 2025 | 30 | 33,3 % | **43,3 %** | **+10,0 pts** |
| SimpleQA (Tavily, factualité) | 30 | 50,0 % | **83,3 %** | **+33,3 pts** |
| LiveCodeBench v6 (exécution Docker) | 20 | 90,0 % | **100,0 %** | **+10,0 pts** |
| **Total** | **130** | **61,5 %** | **74,6 %** | **+13,1 pts** |

23 tâches gagnées, 6 perdues ; aucune régression sur MMLU-Pro, SimpleQA et LiveCodeBench.
Détail, historique des runs et validations d'infrastructure SWE-bench / Terminal-bench :
[`benchmarks/DEEPSEEK-OFFICIAL-BENCHMARKS.md`](benchmarks/DEEPSEEK-OFFICIAL-BENCHMARKS.md).
