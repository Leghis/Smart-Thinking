# Benchmarks officiels DeepSeek — pertinence du MCP Smart-Thinking (v13)

Exécution de référence : nuit du 14→15 septembre 2026, **VM GCP éphémère `e2-standard-4`**
(projet `beaming-delight-507904-e4`, zone `europe-west1-b`, Ubuntu 24.04, Docker), détruite
automatiquement à la fin du run. Résultats bruts : `proofs/gcp/remote/`.

Conditions : modèle `deepseek-flash` (V4.1 Flash), `thinking: disabled`, `temperature: 0`,
`max_tokens: 16384` ; **même modèle, même jour, même machine, même harnais** pour les deux
bras (A/B) ; grading déterministe (comparaison exacte, exécution Docker pour le code).
Sans MCP = réponse directe. Avec MCP = Smart-Thinking v13, **mode `ultimate` (défaut)**,
outils MCP appelés librement par le modèle (itérations bornées par le harnais).

## 1. Tableau principal — A/B `deepseek-flash` seul vs `deepseek-flash` + MCP

| Benchmark | Tâches | Sans MCP | Avec MCP | Delta | Latence (moy.) | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| AIME 2025 | 30 | 73,3 % (22/30) | 73,3 % (22/30) | **+0,0 pt** | 16,2 s → 65,8 s | ✅ mesuré (GCP) |
| MMLU-Pro | 20 | 75,0 % (15/20) | 85,0 % (17/20) | **+10,0 pts** | 1,8 s → 17,3 s | ✅ mesuré (GCP) |
| HMMT 2025 | 30 | 33,3 % (10/30) | 43,3 % (13/30) | **+10,0 pts** | 22,5 s → 135,1 s | ✅ mesuré (GCP) |
| SimpleQA (Tavily actif) | 30 | 50,0 % (15/30) | 83,3 % (25/30) | **+33,3 pts** | 1,0 s → 10,7 s | ✅ mesuré (GCP) |
| LiveCodeBench v6 (exécution Docker) | 20 | 90,0 % (18/20) | **100,0 %** (20/20) | **+10,0 pts** | 5,2 s → 38,7 s | ✅ mesuré (GCP) |
| **TOTAL** | **130** | **61,5 %** (80/130) | **74,6 %** (97/130) | **+13,1 pts** | 10,3 s → 57,4 s | ✅ |

Coût en tokens (les deux bras confondus) : 0,35 M → 11,8 M, soit ~34× — le MCP achète ses gains
en calcul, pas gratuitement.

### Où le MCP fait gagner / perdre (mêmes tâches, deux bras)

| Suite | Gains (sans MCP faux → avec MCP juste) | Régressions (sans MCP juste → avec MCP faux) |
| --- | --- | --- |
| AIME 2025 | 5 | 5 |
| MMLU-Pro | 2 | 0 |
| HMMT 2025 | 4 | 1 |
| SimpleQA | 10 | 0 |
| LiveCodeBench | 2 (abc301_c et abc301_f : 1/3 → 3/3 tests) | 0 |
| **Total** | **23** | **6** |

Le MCP est donc **neutre à fortement positif** partout ; le seul point d'attention est AIME 2025,
où 5 gains compensent exactement 5 pertes. Vérification faite : ces 5 pertes sont de **vraies
erreurs de raisonnement** (ex. AIME-9 : réponse 53 au lieu de 81 ; AIME-22 : 600 au lieu de 610),
pas des artefacts d'extraction — le re-grading via la ligne `ANSWER:` donne exactement les mêmes
22/30 dans les deux bras.

### Le MCP est-il réellement utilisé ?

Appels d'outils MCP moyens par tâche (0 appel = le modèle a répondu sans outil) :

| Suite | AIME | HMMT | SimpleQA | LiveCodeBench | MMLU-Pro |
| --- | --- | --- | --- | --- | --- |
| Appels MCP moyens | 10,0 | 12,2 | 4,8 | 2,8 | 3,3 |
| Tâches sans aucun appel | 0/30 | 0/30 | 1/30 | 2/20 | 4/20 |

## 2. Validations de harnais (oracle / gold) — **pas des scores du MCP**

Ces trois suites mesurent des **agents de codage/terminal** (édition de fichiers, shell). Le MCP
Smart-Thinking v13 n'expose **pas** d'outils `read_file`/`edit_file`/`run_shell` : l'y faire
concourir produirait le score d'un autre agent. Elles ont donc été exécutées en **validation de
harnais** (prédictions `gold`/`oracle`), pour prouver que la chaîne Docker + harnais fonctionne
sur GCP — jamais comme performance du MCP.

| Harnais | Jeu | Tâches | Résultat oracle | Échecs infra | Statut |
| --- | --- | --- | --- | --- | --- |
| SWE-bench Verified | `SWE-bench/SWE-bench_Verified` | 10 | **10/10 résolues** | 0 | ✅ harnais validé |
| SWE-bench Multilingual | `SWE-bench/SWE-bench_Multilingual` | 8 | **7/8 résolues** (non résolue : `apache__druid-13704`) | 0 | ✅ harnais validé |
| Terminal-bench | `terminal-bench-core==0.1.1` | 10 | **8/10 résolues** | 0 | ⚠️ harnais validé avec réserves |

Notes : les 2 échecs Terminal-bench (`hf-model-inference`, `solana-data`) dépendent du réseau
(téléchargement de modèle, accès RPC) et non du harnais. Une première tentative s'était soldée par
0/10 à cause de l'absence de `docker compose` v2 dans le paquet `docker.io` d'Ubuntu (corrigé par
l'installation de `docker-compose-v2`). Détails dans `proofs/gcp/remote/`.

## 3. Benchmarks non mesurés (accès requis)

| Benchmark | Raison | À faire pour le mesurer |
| --- | --- | --- |
| GPQA-Diamond | jeu *gated* sur Hugging Face | fournir un `HF_TOKEN` avec accès |
| Humanity's Last Exam | dataset officiel payant/gated | fournir le dataset |
| BrowseComp (+ zh) | jeu *gated* | fournir un `HF_TOKEN` avec accès |
| Codeforces | nécessite un juge d'exécution dédié | infra lourde, hors périmètre v13 |
| Aider-Polyglot | édition de code multi-fichiers | nécessite des outils code dans le MCP |

## 4. Historique de mesure (transparence)

| Mesure | AIME 2025 | MMLU-Pro | Note |
| --- | --- | --- | --- |
| Harnais local (`scripts/official-bench.cjs`), 14/09 | 66,7 % → 93,3 % (+26,6) | 85,0 % → 90,0 % (+5,0) | premier A/B, 50 tâches |
| Run GCP n°1, 14/09 18:15–19:17 UTC | 63,3 % → 76,7 % (+13,4) | 75,0 % → 90,0 % (+15,0) | ⚠️ **pollué** par la panne DeepSeek : HMMT amputé de 3 tâches, SimpleQA 30/30 en timeout |
| **Run GCP n°2 (référence), 15/09 02:32–03:17 UTC** | **73,3 % → 73,3 %** | **75,0 % → 85,0 %** | run complet, API saine, 130 tâches |

La variance entre runs sur AIME (de +26,6 à 0 pt) est le principal enseignement de méthode :
sur 30 tâches, 1 tâche ≈ 3,3 pts ; le delta AIME est donc **bruité**, alors que les gains
SimpleQA (+33 pts), HMMT (+10), MMLU-Pro (+10) et LiveCodeBench (+10) sont plus robustes.

## 5. Reproductibilité

```bash
# 1) provision + run + rapatriement + destruction garantie (trap) en une commande
DEEPSEEK_API_KEY=... TAVILY_API_KEY=... bash scripts/gcp-bench-run.sh

# 2) variante résiliente : run détaché côté VM (survit à une coupure locale), suivi, fetch, cleanup
bash scripts/gcp-run-attach.sh <nom-vm>
```

Scripts : `scripts/gcp-bench-run.sh` (provision + trap), `scripts/gcp/remote-run.sh` (orchestration
dans la VM), `scripts/gcp-remote-bench.cjs` (harnais A/B), `scripts/gcp/swebench.sh`,
`scripts/gcp/swebench-fixup.sh`, `scripts/gcp/terminalbench.sh` (validations de harnais).

Vérification de fin de run : `gcloud compute instances list` et `gcloud compute disks list`
doivent être **vides** (constaté après le run de référence).

## 6. Décision de périmètre (v13)

Périmètre retenu = **raisonnement + factualité + code à sortie unique** (AIME, MMLU-Pro, HMMT,
SimpleQA, LiveCodeBench) : c'est là que la valeur du MCP est démontrée, avec un protocole A/B
honnête. SWE-bench (Verified, Multilingual) et Terminal-bench restent hors du périmètre de score
tant que le MCP n'expose pas d'outils fichiers/shell ; ils servent de validation d'infrastructure,
clairement étiquetée comme telle. Ajouter `read_file` / `edit_file` / `run_shell` est un chantier
produit distinct (sécurité, confinement), à traiter après la v13.
