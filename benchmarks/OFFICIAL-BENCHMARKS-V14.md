# Benchmarks officiels — Smart-Thinking V14 (17 septembre 2026)

Comparaison contrôlée du même modèle hôte (`deepseek-flash`, température 0) sans MCP,
avec le **MCP V13** (npm 13.1.1) et avec le **client V14** (`smart-thinking-mcp` → serveur de
production). 5 suites publiques, 130 tâches figées (sha256), notation déterministe, mêmes
budgets et même extraction de réponse. Trois campagnes successives (A = 14.0.0, B = 14.1.0,
**C = 14.2 — courante**) ; les campagnes historiques sont des archives scellées, non relancées.

## Tableau principal — V14.2 (campagne C, courante)

| Suite (tâches) | Sans MCP (arch.) | MCP V13 (arch.) | MCP V14.1 (arch.) | **MCP V14.2** |
|---|---|---|---|---|
| AIME 2025 (30) | 22 | 25 | 22 | **22** |
| HMMT 2025 (30) | 6 | 10 | 11 | **11** |
| SimpleQA + Tavily (30) | 14 | 22 | 22 | **26** |
| MMLU-Pro (20) | 15 | 18 | 18 | **17** |
| LiveCodeBench v6 (20, exécution) | 17 | 19 | 17 | **20/20** |
| **TOTAL (130)** | 74 | 94 | 90 | **96/130 (73,9 %)** |

## Coût (campagne C)

| | V13 (arch.) | V14.1 (arch.) | MCP V14.2 |
|---|---|---|---|
| Latence moyenne / tâche | 55,5 s | 17,5 s | **19,1 s** |
| Tokens totaux (130 tâches) | 10,8 M | 5,2 M | **7,3 M** |
| Appels d'outils MCP | 1002 | 707 | **481 (−32 %)** |

## Historique — campagnes A (14.0.0) et B (14.1.0)

Campagne B (14.1.0) : sans MCP **56,9 %**, V13 **72,3 %**, V14.1 **69,2 %** — la 14.1 était
~3,2× plus rapide que la V13 avec −52 % de tokens (détail conservé dans l'historique du dépôt).
La campagne C a mesuré une 14.2 mono-version avec correcteurs **plus stricts** (réponse finale
délimitée `ANSWER:` exigée, négations refusées en texte court, code classé strictement) : un score
comparable ou supérieur l'est donc à règles plus dures.

## Lecture honnête

- V14.2 **96/130** contre 90 (V14.1), 94 (V13) et 74 (sans MCP) : delta **+6** vs V14.1,
  **+2** vs V13, **+22** vs sans MCP, avec **~30 % d'appels d'outils en moins**.
- Le gain net vs V13 vient de la **recherche** (SimpleQA 26 vs 22) et du **code**
  (LiveCodeBench 20/20 vs 19) ; sur AIME/HMMT/MMLU-Pro les écarts d'une à deux tâches
  sur 20–30 **ne sont pas statistiquement significatifs**.
- Zéro erreur technique bloquante dans la campagne C ; les échecs restants sont des erreurs
  de raisonnement authentiques du modèle. Limites : 1 tâche ≈ 0,8 pt ; l'alias
  `deepseek-flash` évolue dans le temps ; les comparaisons inter-campagnes restent descriptives.
- Le harnais instrumenté (traces par appel d'outil), les données brutes et les rapports
  détaillés vivent dans le dépôt privé du serveur ; les mesures réelles et leurs limites
  sont résumées dans [docs/RELEASE_V14.md](../docs/RELEASE_V14.md).
