# Benchmarks officiels — Smart-Thinking V14 (16 septembre 2026)

Comparaison contrôlée du même modèle hôte (`deepseek-flash`) sans MCP, avec le **MCP V13**
(npm 13.1.1) et avec le **client V14** (`smart-thinking-mcp@14.0.0` → serveur de production).
5 suites publiques, 130 tâches, 3 bras, notation déterministe. Même jour, même machine éphémère
GCP, mêmes budgets (itérations, tokens, température 0), même extraction de réponse pour tous les bras.

## Tableau principal

| Suite (tâches) | Sans MCP | MCP V13 | MCP V14 |
|---|---|---|---|
| AIME 2025 (30) | 66,7 % | 76,7 % | 76,7 % |
| MMLU-Pro (20) | 80,0 % | 85,0 % | 85,0 % |
| HMMT 2025 (30) | 30,0 % | **43,3 %** | 33,3 % |
| SimpleQA + Tavily (30) | 46,7 % | 66,7 % | **70,0 %** |
| LiveCodeBench v6 (20, exécution) | 85,0 % | **100 %** | 95,0 % |
| **TOTAL (130)** | **58,5 %** | **71,5 %** | **69,2 %** |

## Coût

| | Sans MCP | MCP V13 | MCP V14 |
|---|---|---|---|
| Latence moyenne / tâche | 9,2 s | 50,7 s | **19,2 s** |
| Tokens totaux (130 tâches) | 0,35 M | 10,5 M | **6,4 M** |
| Appels d'outils par tâche | — | 11,7 | **6,3** |

## Lecture honnête

- Les deux MCP apportent **~+11 à +13 points** contre le même modèle seul, principalement sur la
  factualité vérifiée (SimpleQA) et l'exactitude (AIME, LiveCodeBench).
- **V13 et V14 sont au même niveau** sur ce jeu : 93 vs 90 tâches justes sur 130 (écart de 3 tâches,
  non significatif) ; la V13 avance sur HMMT, la V14 sur SimpleQA.
- Le progrès le plus net de la V14 est le **coût d'usage** : 2,6× plus rapide et ~40 % de tokens en
  moins que la V13, avec moitié moins d'appels d'outils — alors même que la V14 travaille à distance
  (le serveur), pas en local.
- Zéro erreur technique sur les 390 passes ; les échecs restants sont des erreurs de raisonnement
  authentiques du modèle (vérifiées tâche par tâche).
- Limites : 130 tâches (1 tâche ≈ 0,8 pt) ; l'alias `deepseek-flash` évolue dans le temps (les trois
  bras ont été mesurés dans la même session pour rester comparables) ; une seule exécution.
  Le rapport détaillé, le harnais et les données brutes vivent dans le dépôt privé du serveur.
