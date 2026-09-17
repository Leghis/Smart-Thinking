# Bilan de version — client 14.2.2 (17 septembre 2026)

Ce document résume ce qui est publié, ce qui a été vérifié et ce qui a été
mesuré. Il ne remplace pas les notes de version npm ; il les documente.

## 0. Nouveautés 14.2.2 — correctifs issus d'un usage réel (ChatGPT)

Observations rapportées après un usage réel du connecteur, corrigées avec tests
de régression :

- **P0 — comparaisons booléennes** : `check` et `claim → verify` refusent
  désormais correctement une comparaison (`62 >= 70`) avec `expected: "false"` ;
  les quatre chemins (`calculate`, `check`, `claim → verify`, `reason`)
  partagent le même noyau exact et le même transport de `expected`.
- **P0 — le déterministe d'abord** : `plan`/`reason` exécutent prioritairement
  les claims exactes déjà formalisées ; une décision Jev `clarify` (score non
  calibré) ne vide plus le plan et ne bloque plus que les claims **sémantiques
  concernées** (clarification scopée).
- **P0 — `analyze`/segmentation** : `semantic_segment` accepte
  `granularity: coarse | sentence | atomic` (offsets littéraux conservés, lien
  parent), et `plan` expose une frontière complète par claim
  (`deterministic_ready`, `semantic_ready`, `blocked_dependency`,
  `blocked_ambiguity`, `requires_source`, `requires_host_formalization`,
  `checker_unavailable`, `already_verified`) avec la raison de sélection.
- **P1 — transparence** : `run_create` retourne immédiatement
  `availability.semanticInferenceAvailable` / `externalResearchAvailable` et la
  raison (`disabled because externalAllowed=false`), avec avertissement non
  bloquant si l'objectif semble nécessiter une interprétation.
- **P1 — budget lisible** : `budget_status` expose `baseRunBudget`,
  `profileMultiplier`, `effectiveRunBudget`, `consumed`, `held` (les anciens
  noms `limits`/`budgetLimit` restent des alias) et explique la différence.
- **P1 — documentation** : README, architecture, sécurité, flux de données
  (`dataClass` × `externalAllowed`), migration et exemples mis en conformité v14.
- **Invariants verrouillés par tests** : hypothèses CAS (`sqrt(x^2)=x` n'est
  certifié que sous `x > 0`), rigidité de l'audit (`canComplete=false` sous Jev
  optimiste), séparation CAS ≠ preuve formelle.

### Rappel — 14.2.1 (accès public sans jeton)

Le service hébergé accepte les requêtes **anonymes** sous plafonds opérateur ;
l'endpoint public est la valeur par défaut du client et `SMART_THINKING_MCP_TOKEN_FILE`
devient **facultatif** (quota nominatif dédié). `ST14_ALLOW_ANONYMOUS=0` referme
l'accès sans redéploiement. Les listes de dossiers restent vides pour l'anonyme.

### Rappel — 14.2.0 (33 outils, gouvernance)

Catalogue à 33 outils : calcul exact sans dossier (`calculate`, `solve_math`,
`solve_logic`, `finite_compute`, `check`, `cas`), recherche (`web_search`,
`fetch`, `research`), dossiers de preuve complets, Jev (advisory), budgets,
reçus durables, profils de catalogue.

## 1. Ce qui change

- Le paquet `smart-thinking-mcp` est le **client** du serveur V14 — **sans jeton
  requis** depuis 14.2.1. Le moteur de raisonnement, les preuves, Jev, les
  budgets et les secrets restent **côté serveur**. Rien de sensible ici.
- Endpoint de production :
  `https://smart-thinking-v14-923774092927.northamerica-northeast1.run.app/mcp` —
  santé publique : `/health`.

## 2. Vérifié (dernier passage complet)

- **Noyau serveur** : 465 tests verts (dont 51 nouveaux pour 14.2.2 : matrice de
  comparaisons, scheduler, segmentation, transparence, matrice E2E par type de
  claim, invariants CAS/audit).
- **Client** : suite complète verte + contrôle de frontière public/privé +
  packaging (installation hors ligne dans un consommateur vierge). CI verte.
- **Acceptance de production** : contrôles authentifiés + anonymes exécutés
  contre le service déployé (voir `reports/production-acceptance.json` côté
  opérateur) — comparaisons exactes, disponibilité `run_create`, vérifications
  typées, worker symbolique IAM, recherche réelle, isolation, persistance,
  finalisation, annulation, concurrence.
- **Doctor** contre la production : `ok`, protocole `2025-11-25`, **33 outils**,
  profil `smart-thinking-mcp/14.0`, sémantique `typesafe/jev`.

## 3. Campagne officielle V14.2 (5 suites publiques, 130 tâches)

Même modèle hôte (DeepSeek `deepseek-flash`, température 0), mêmes verrous,
outils MCP réels par bras ; campagne mono-version v14.2 (les systèmes
historiques ne sont pas relancés).

| Suite | Score V14.2 |
|---|---|
| AIME 2025 | 22/30 |
| MMLU-Pro | 17/20 |
| HMMT | 11/30 |
| SimpleQA | 26/30 |
| LiveCodeBench | **20/20** |
| **Total** | **96/130 (73,9 %)** |

Comparatif des campagnes successives (mêmes suites) : sans-MCP **74/130** ·
V13 **94/130** · V14.1 **90/130** · **V14.2 96/130**. Latence p50 19,1 s
(V13 55,5 / V14.1 17,5), 7,3 M tokens (10,8 / 5,2), 481 appels MCP (−32 %).
Détails et limites : [benchmarks/OFFICIAL-BENCHMARKS-V14.md](../benchmarks/OFFICIAL-BENCHMARKS-V14.md).

Lecture honnête : le gain net vs V13 vient de la recherche (+4) et du code
(+3, avec ~30 % d'appels en moins) ; sur les mathématiques pures les écarts
d'une à deux tâches ne sont pas significatifs. Ce sont des diagnostics de
version, pas un classement externe.

## 4. Démarrer — zéro jeton

```bash
npx -y smart-thinking-mcp --version   # 14.2.2
npx -y smart-thinking-mcp             # serveur MCP stdio pour votre hôte
```

Optionnel : `SMART_THINKING_MCP_URL` (auto-hébergement) et
`SMART_THINKING_MCP_TOKEN_FILE` (quota nominatif dédié, jamais une clé
fournisseur). Rappels : le service est public — **ne soumettez pas de contenu
sensible** ; le contenu envoyé à Jev/Tavily suit `dataClass` et `externalAllowed`
(voir [docs/ARCHITECTURE.md](ARCHITECTURE.md)). La V13 reste disponible dans
l'historique du dépôt pour référence.
