# Benchmarks officiels DeepSeek — pertinence du MCP Smart-Thinking

Source de la liste : release officielle DeepSeek-V3.2-Exp (github.com/deepseek-ai/DeepSeek-V3.2-Exp), tableau
« Reasoning Mode w/o Tool Use » + « Agentic Tool Use ». Cadrage : un benchmark publié à la sortie d'un modèle.

## Benchmark mesurés — même modèle (`deepseek-flash`), même jour, A/B sans vs avec MCP

| Suite | Tâches | Sans MCP | Avec MCP | Delta | Latence | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| AIME 2025 | 30 | 66.7 % | **93.3 %** | **+26.6 pts** | 22.4 s → 51.7 s | ✅ mesuré (`scripts/official-bench.cjs`) |
| MMLU-Pro | 20 | 85.0 % | **90.0 %** | **+5.0 pts** | 2.7 s → 9.4 s | ✅ mesuré |
| **TOTAL officiel-style** | **50** | **74.0 %** | **92.0 %** | **+18.0 pts** | — | — |

Note de transparence : les chiffres bruts ne reproduisent pas les valeurs publiées par DeepSeek
(conditions d'évaluation différentes) ; le signal valide est le **delta même modèle / même harnais**.

## Nos séries internes (raisonnement adversarial, juge officiel)

| Série | bare | lean | guided | ultimate (défaut) | Statut |
| --- | --- | --- | --- | --- | --- |
| I — maths | — | 71.1 % | 76.4 % | **78.1 %** (cert 66 %, juge 89.8) | ✅ |
| II — raisonnement | 93.6 % | 97.9 % | 95.7 % | **96.7 %** | ✅ |
| III — technique | 85.8 % | 91.7 % | 89.5 % | **92.4 %** | ✅ |
| Transfert Série III (40 variantes) | — | 95.8 % | — | **97.5 %** | ✅ |

## Suite complète DeepSeek (catégories à couvrir) et faisabilité

### Reasoning — sans outils
| Benchmark | Mesure | Faisabilité | Plan |
| --- | --- | --- | --- |
| MMLU-Pro | connaissances + raisonnement | ✅ fait | maintenu |
| AIME 2025 | maths olympiades | ✅ fait | maintenu |
| HMMT 2025 | maths compétition | ✅ public | à brancher (format numérique) |
| GPQA-Diamond | sciences doctorat | ⚠️ gated HF | nécessite accès HF |
| Humanity's Last Exam | raisonnement extrême | ⚠️ gated/payant | nécessite dataset officiel |
| LiveCodeBench | code (épreuves récentes) | ✅ public | à brancher (exécution) |
| Codeforces | algorithmique | ⚠️ juge d'exécution requis | infra lourde |
| Aider-Polyglot | édition de code | ⚠️ harnais dédié | hors périmètre MCP |

### Agentic — avec outils
| Benchmark | Mesure | Faisabilité | Plan |
| --- | --- | --- | --- |
| SimpleQA | factualité / anti-hallucination | ✅ public | à brancher |
| BrowseComp (+ zh) | recherche web profonde | ⚠️ gated | nécessite dataset officiel |
| **SWE-bench Verified** | bugs réels (500 instances) | ❌ Docker + harnais + heures de calcul | VM GCP + Docker, jeu réduit (10–20 instances) d'abord |
| **SWE-bench Multilingual** | idem multi-langages | ❌ idem | après Verified |
| **Terminal-bench** | tâches terminal sandbox | ⚠️ Docker requis | VM GCP + Docker |

## Infra GCP (prévu, non exécuté)
- Projet cible : `beaming-delight-507904-e4` (n° 923774092927). La config locale pointait sur `morgram` → à corriger avant toute création.
- SWE-bench/Terminal-bench : VM GCP + Docker, disque ≥ 100 Go, jeu d'instances réduit, puis suppression de toutes les ressources (VM, disques, règles) après les tests.
- Aucune ressource GCP n'a été créée à ce stade : rien à supprimer.
