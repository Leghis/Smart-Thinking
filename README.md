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
| `research` | Recherche web multi-hop : sous-questions, enchaînement Tavily, réponses candidates sourcées. |
| `critique` | Revue adversariale d'un brouillon (erreurs, faits non prouvés, étapes manquantes) via modèle assistant. |
| `smartthinking` | Cœur du système : ajoute une pensée au graphe (métriques, vérification, plan, hypothèses, prochaines étapes). |
| `plan` | Décompose un objectif en 2–20 étapes ordonnées avec critères de succès. |
| `verify` | Vérifie une affirmation : calculs, cohérence de session, sources web. Ne marque jamais « vérifié » sans preuve. |
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
npm test               # 171 tests (unitaires, intégration, E2E MCP)
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

- 195 tests passent (25 suites), dont un E2E MCP complet via `InMemoryTransport`.
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
