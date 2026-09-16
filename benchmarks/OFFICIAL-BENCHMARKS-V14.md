# Benchmarks officiels — Smart-Thinking V14 (16 septembre 2026)

Comparaison contrôlée du même modèle hôte (`deepseek-flash`) sans MCP, avec le **MCP V13**
(npm 13.1.1) et avec le **client V14** (`smart-thinking-mcp` → serveur de production).
5 suites publiques, 130 tâches, 3 bras, notation déterministe. Même jour, même machine éphémère
GCP, mêmes budgets (itérations, tokens, température 0), même extraction de réponse pour tous les bras.
Deux campagnes identiques ont été exécutées : la 14.0.0 (A), puis la **14.1.0** (B, courante).

## Tableau principal — client 14.1.0 (campagne B)

| Suite (tâches) | Sans MCP | MCP V13 | MCP V14.1 |
|---|---|---|---|
| AIME 2025 (30) | 73,3 % | **83,3 %** | 73,3 % |
| MMLU-Pro (20) | 75,0 % | 90,0 % | 90,0 % |
| HMMT 2025 (30) | 20,0 % | 33,3 % | **36,7 %** |
| SimpleQA + Tavily (30) | 46,7 % | 73,3 % | 73,3 % |
| LiveCodeBench v6 (20, exécution) | 85,0 % | **95,0 %** | 85,0 % |
| **TOTAL (130)** | **56,9 %** | **72,3 %** | **69,2 %** |

## Comparaison 14.0.0 → 14.1.0 (mêmes tâches, deux campagnes)

| | 14.0.0 (camp. A) | 14.1.0 (camp. B) |
|---|---|---|
| Total | 69,2 % (90/130) | 69,2 % (90/130) |
| HMMT 2025 | 33,3 % | **36,7 %** (devant la V13) |
| SimpleQA + Tavily | 70,0 % | **73,3 %** |
| MMLU-Pro | 85,0 % | **90,0 %** |
| AIME 2025 | 76,7 % | 73,3 % |
| LiveCodeBench | 95,0 % | 85,0 % |
| Latence moyenne / tâche | 19,2 s | **17,5 s** |
| Tokens totaux | 6,4 M | **5,2 M** |
| Appels d'outil | 815 | **707** |

Sur la campagne synthétique appariée (24 tâches × 2 répétitions, mêmes harnais), la 14.1 réduit les
appels d'outil de **77 %**, les erreurs d'outil de **82 %** et la latence médiane de **72 %** : la
vérification ponctuelle passe d'un dossier (3+ appels `run_create`/`claim`/`verify`) à `calculate`
en **1 appel** — 399 appels constatés sur la campagne officielle, tâches sans aucun appel ramenées
de 32 % à 20 %.

## Coût (campagne B)

| | Sans MCP | MCP V13 | MCP V14.1 |
|---|---|---|---|
| Latence moyenne / tâche | 10,1 s | 55,5 s | **17,5 s** |
| Tokens totaux (130 tâches) | 0,36 M | 10,8 M | **5,2 M** |
| Appels d'outils par tâche | — | 7,7 | **5,4** |

## Lecture honnête

- Les deux MCP apportent **~+13 à +15 points** contre le même modèle seul, principalement sur la
  factualité vérifiée (SimpleQA) et l'exactitude (AIME, LiveCodeBench).
- **V13 et V14.1 restent au même niveau** : 94 vs 90 tâches justes sur 130 (écart de 4 tâches — dans
  le bruit des suites de 20–30 tâches ; la V13 elle-même oscille 71,5 % → 72,3 % entre deux campagnes
  identiques). La V14.1 passe **devant la V13 sur HMMT** et égale MMLU-Pro et SimpleQA ; la V13 mène
  sur AIME et LiveCodeBench.
- Le progrès le plus net de la 14.1 est le **coût d'usage** : **3,2× plus rapide** et **−52 % de
  tokens** que la V13, avec moins d'appels d'outils — alors même que la V14 travaille à distance
  (le serveur), pas en local.
- Zéro erreur technique sur les 390 passes ; les échecs restants sont des erreurs de raisonnement
  authentiques du modèle, et les comportements d'hôte (identifiants inventés, pages trop lourdes)
  reçoivent désormais des **erreurs actionnables** (code + message + conseil) au lieu d'un message opaque.
- Limites : 130 tâches (1 tâche ≈ 0,8 pt) ; l'alias `deepseek-flash` évolue dans le temps (les trois
  bras de chaque campagne ont été mesurés dans la même session) ; deux exécutions au total — les
  comparaisons inter-campagnes incluent la dérive du modèle. Le rapport détaillé, le harnais
  instrumenté (traces par appel d'outil) et les données brutes vivent dans le dépôt privé du serveur.
