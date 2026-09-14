# Smart-Thinking v13 — Rapport de tests, benchmarks et pertinence

Date : 14 septembre 2026 · Version : `smart-thinking-mcp@13.0.0`
Modèle testé : **deepseek-v4.1-flash** (`deepseek-flash`, API DeepSeek) · Tavily activé · Environnement macOS arm64, Node 26.

---

## 1. Résumé exécutif

| Indicateur | Résultat v13 |
| --- | --- |
| Tests automatisés | **195 / 195** (25 suites), E2E MCP inclus |
| Couverture | **82,0 % lignes · 81,1 % statements · 82,8 % fonctions · 64,8 % branches** |
| Lint / build / audit | 0 erreur, 0 warning, 0 vulnérabilité |
| Outils MCP | **15** (vs 3 en v12) |
| Défi de recherche (équation elliptique niveau master) | **89,7 %–92 % guidé**, 52,5 % autonome, juge indépendant **9/10** |
| Benchmark global DeepSeek 67 tâches | 90,3 % → **91,8 %** (+1,5 pt) |
| HotpotQA multi-hop (15) | 73,3 % → **80,0 %** (+6,7 pts) |
| Suite levier outil (7) | 78,6 % → **92,9 %** (+14,3 pts) |
| BBH / tâches dures | 100 % → 100 % (plafond) |
| GSM8K (25) | 96 % → 92 % (−4 pts, 1 tâche de compréhension) |

---

## 2. Défi « L'équation imaginaire de Ghislain — Violet »

Problème de niveau master (fonctions elliptiques de Weierstrass, réseau carré, entiers de Gauss) demandant : convergence, équivalence exacte `Q(X(z))=0 ⇔ (4+i)z∈Λ`, liste des 16 points, multiplicités, degré 16 et polynôme minimal unitaire `P/17`.

Protocole : session LLM **neuve, sans contexte de conversation**, connectée au vrai serveur MCP via transport en mémoire, avec Tavily et le CAS.

| Mode | Score rubric déterministe | Points exacts | Polynôme | Piège (4−i)z évité | Juge LLM |
| --- | ---: | ---: | ---: | ---: | ---: |
| Autonome (prompt court) | 52,5 % | 0/16 | ✔ | ✔ | — |
| **Guidé (protocole mathématique du MCP)** | **92,0 %** | 15/16 | ✔ | ✔ | — |
| **Guidé (2ᵉ exécution)** | **89,7 %** | 15/16 | ✔ | ✔ | **9/10** |

Ce que le MCP a permis de vérifier exactement (CAS) : identification `X = ℘/c`, la duplication `X(2z)=(X²+1)²/(4X(X²−1))`, `T = R∘R`, l'identité `N + tD = Q·Q*`, l'identité de dérivation donnant `T'=−4i`, l'identité `Q·Q* = P`, la congruence `b ≡ 4a (mod 17)` et les 16 points `(k + i·(4k mod 17))/17`. Le point manquant est un point de liste (13) non retrouvé par le parseur de notation, pas une erreur mathématique.

Capacités ajoutées au MCP pour y parvenir : `cas` (SymPy/mpmath : identités exactes, minimal_polynomial, elliptic, lattice_solve…), `math_knowledge` (17 fiches de théorie classique et méthodes), `solve_logic`, `solve_math`, `research` (multi-hop), `critique` (revue adversariale assistée).

---

## 3. Benchmarks réels — DeepSeek v4.1 flash (67 tâches)

Datasets réels échantillonnés : **GSM8K** (25 problèmes), **BBH logical deduction** (12), **HotpotQA distractor** (15, multi-hop web), plus la suite « levier outil » (7) et les tâches dures maison (8). Même modèle dans les deux conditions, même correcteur déterministe.

| Suite | N | Baseline (sans MCP) | Avec MCP | Delta |
| --- | ---: | ---: | ---: | ---: |
| BBH logique | 12 | 100,0 % | 100,0 % | 0 |
| GSM8K arithmétique | 25 | **96,0 %** | 92,0 % | −4,0 |
| HotpotQA multi-hop (web) | 15 | 73,3 % | **80,0 %** | **+6,7** |
| Levier outil | 7 | 78,6 % | **92,9 %** | **+14,3** |
| Tâches dures | 8 | 100,0 % | 100,0 % | 0 |
| **Total pondéré** | **67** | **90,3 %** | **91,8 %** | **+1,5** |

Par catégorie : factual **73,3 → 80,0** · arithmetic 94,3 → 94,3 · logic 96,7 → 96,7 · planning 100 → 100 · synthesis 100 → 100.

Détail des échecs : la seule perte GSM8K est une erreur de compréhension de l'énoncé (« amis et leurs conjoints »), pas de calcul — les outils ne corrigent pas une mauvaise lecture. Les gains viennent de `research`/`web_search` (multi-hop sourcé), des solveurs exacts et du CAS.

Coûts mesurés : latence p95 13,4 s → 36,7 s, tokens totaux 29,5 k → 265 k (la condition outil fait des appels supplémentaires). Aucune hallucination détectée dans les deux conditions.

---

## 4. Comparaison v12 → v13 (mesurée)

| Indicateur | v12 (commit HEAD) | v13 | Preuve |
| --- | ---: | ---: | --- |
| Tests | 100 (20 suites) | **195 (25 suites)** | `npm test` |
| Couverture lignes | 81,59 % | **82,0 %** | coverage-summary |
| Couverture branches | 63,48 % | **64,75 %** | coverage-summary |
| Outils MCP | 3 | **15** | `listTools()` E2E |
| Vérification | simulée (`isValid: true` sans appel) | réelle (calculs, cohérence, web, juge LLM) | 21 tests vérification |
| Recherche web | aucune (exécuteurs factices) | Tavily search/extract/crawl/map + délégation native | tests + live |
| Solveurs exacts | aucun | calculate, solve_math, solve_logic, cas (SymPy) | tests dédiés |
| Recherche multi-hop | aucune | `research` (décomposition + hops + citations) | live HotpotQA |
| Graphe de raisonnement | inférence/confiance non câblées | inférence active, confiance signée par voisins | tests métriques |
| Sécurité | path traversal, `new Function` | interdits + SSRF + secrets non persistés | tests sécurité |
| Preuves A/B | aucune | 92 tâches simulate + 67 tâches LLM réel + défi | `proofs/` |

### Notes sur 10 (avant → après)

| # | Critère | v12 | v13 | Justification |
| --- | --- | ---: | ---: | --- |
| 1 | Architecture & modularité | 4 | 8 | God classes scindées, `ToolIntegrator` simulé supprimé, DI explicite |
| 2 | Raisonnement multi-dimensionnel & solveurs | 3 | 9 | Inférence câblée, confiance signée, 4 solveurs exacts, CAS |
| 3 | Vérification & honnêteté | 2 | 9 | Fini les faux « vérifié », ledger de preuves, juge, statuts honnêtes |
| 4 | Outils à disposition du LLM | 3 | 10 | 15 outils spécialisés, prompts MCP, instructions d'usage |
| 5 | Recherche web | 0 | 9 | Tavily complet + délégation native + SSRF ; non testé sans clé |
| 6 | Tests & couverture | 7 | 9 | 195 tests (dont CAS, solvers, E2E) ; fonctions 82,8 % < 84,3 % |
| 7 | Sécurité & robustesse | 3 | 9 | Path traversal, `new Function`, caches cross-session, timers corrigés |
| 8 | Performance & coût d'usage | 5 | 7 | Outils précis mais latence/tokens plus élevés |
| 9 | Documentation & observabilité | 4 | 8 | README, ARCHITECTURE, CHANGELOG, RAPPORT, logger structuré |
| 10 | Preuves & reproductibilité | 1 | 10 | Harnais A/B, défi noté, scripts `proof`/`bench`/`challenge` |
| | **Total** | **32/100** | **88/100** | |

---

## 5. En quoi l'outil rend le modèle plus puissant

1. **Calcul et algèbre exacts** : `calculate`, `solve_math`, `solve_logic`, `cas` suppriment les erreurs de calcul mental et permettent de *prouver* des identités (résidu symbolique 0). Défi Violet guidé : 89,7 %–92 % contre 52,5 % autonome, juge 9/10.
2. **Recherche web multi-hop sourcée** : `research` décompose, enchaîne les hops Tavily et renvoie des réponses candidates avec citations. HotpotQA : **+6,7 pts**.
3. **Vérification honnête** : plus aucun résultat fabriqué ; les statuts `unverified`/`incertain` empêchent de présenter une hypothèse comme un fait.
4. **Mémoire et graphe actifs** : l'inférence relationnelle et la confiance signée par les voisins changent réellement les scores entre les étapes.
5. **Protocoles MCP** : les prompts `smartthinking-deep-reasoning` et les instructions serveur guident le modèle (plan → outils → vérification → réponse citée).

---

## 6. Limites assumées

- Le défi Violet complet (preuve rédigée de bout en bout) reste au-delà d'un modèle flash : le mode guidé atteint ~90 % de la grille, le mode autonome ~52 %. Le point manquant est l'exhaustivité rédactionnelle, pas le résultat.
- GSM8K perd 1 tâche sur 25 (compréhension), gain global faible car le modèle est déjà proche du plafond.
- Latence ×2,7 et tokens ×9 en condition outil : à n'utiliser que quand la précision compte.
- La recherche web réelle dépend de Tavily (clé par utilisateur) ou du moteur natif du client.

---

## 7. Reproductibilité

```bash
npm install && npm run build && npm test && npm run test:coverage
npm run proof                                  # PROOFS.md (tests + simulate + live)
DEEPSEEK_API_KEY=... TAVILY_API_KEY=... npm run challenge:violet -- --mode=guided
DEEPSEEK_API_KEY=... TAVILY_API_KEY=... node build/bench/run.js \
  --provider=openai --base-url=https://api.deepseek.com --api-key=$DEEPSEEK_API_KEY \
  --model=deepseek-flash --prefix=hotpot --label=hotpot
```

Artefacts : `proofs/PROOFS.md`, `proofs/RAPPORT-TESTS.md`, `proofs/benchmark-ds-v41f-*.json|md`,
`proofs/challenge-violet-*.json|md`, `coverage/coverage-summary.json`, `proofs/archive/` (campagnes antérieures, autres modèles).
