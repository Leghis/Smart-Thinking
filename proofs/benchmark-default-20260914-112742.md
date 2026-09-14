# Benchmark Smart-Thinking — default

- Provider: `openai:deepseek-flash` (live)
- Generated: 2026-09-14T15:34:58.570Z
- Tasks: 92 | Seed: 1337

## Summary

| Condition | Accuracy | Exact match | Mean latency | p50 | p95 | Tokens (in/out) | Hallucinations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 89.9 % | 87.0 % | 1713.8 ms | 1437.0 ms | 3433.0 ms | 11068 / 19168 | 0 |
| tool | 89.7 % | 88.0 % | 2829.6 ms | 2403.0 ms | 5203.0 ms | 253443 / 31378 | 4 |

## Delta baseline → tool

- Absolute: **-0.19 pp**
- Relative: -0.2 %
- Wins / losses / ties: 3 / 2 / 87
- Exact binomial sign test p-value: 1.000

## Per category

| Category | Baseline accuracy | Tool accuracy | Tasks |
| --- | ---: | ---: | ---: |
| arithmetic | 95.1 % | 92.7 % | 41 |
| logic | 97.5 % | 97.5 % | 20 |
| planning | 100.0 % | 100.0 % | 5 |
| factual | 72.5 % | 75.0 % | 20 |
| synthesis | 77.8 % | 83.3 % | 6 |

## Task-by-task

| Task | Category | Diff. | Baseline | Tool | Delta | Hallucinations (b/t) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `arith-bakery` | arithmetic | 1 | 1.00 | 1.00 | +0.00 | — / — |
| `arith-train-distractor` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `arith-invalid-chain` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `arith-tank-fraction` | arithmetic | 2 | 1.00 | 0.00 | -1.00 | — / — |
| `arith-workforce-percent` | arithmetic | 1 | 1.00 | 1.00 | +0.00 | — / — |
| `arith-pot-division` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `logic-syllogism-chats` | logic | 1 | 1.00 | 1.00 | +0.00 | — / — |
| `logic-syllogism-robots` | logic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `logic-order-runners` | logic | 1 | 1.00 | 1.00 | +0.00 | — / — |
| `logic-order-versions` | logic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `logic-disjunction-vase` | logic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `plan-cake` | planning | 1 | 1.00 | 1.00 | +0.00 | — / — |
| `plan-deploy` | planning | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `plan-travel` | planning | 1 | 1.00 | 1.00 | +0.00 | — / — |
| `plan-construction` | planning | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `fact-capital-australia` | factual | 1 | 1.00 | 1.00 | +0.00 | — / sydney, melbourne |
| `fact-moon-year` | factual | 1 | 1.00 | 1.00 | +0.00 | — / — |
| `fact-longest-river` | factual | 2 | 1.00 | 1.00 | +0.00 | — / congo |
| `fact-mona-lisa` | factual | 1 | 1.00 | 1.00 | +0.00 | — / — |
| `fact-iron-symbol` | factual | 2 | 0.50 | 1.00 | +0.50 | — / — |
| `synth-boiling` | synthesis | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `synth-timezone` | synthesis | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `synth-rayleigh` | synthesis | 3 | 0.67 | 1.00 | +0.33 | — / — |
| `synth-climate` | synthesis | 3 | 0.67 | 0.67 | +0.00 | — / — |
| `synth-blood-pressure` | synthesis | 2 | 0.33 | 0.33 | +0.00 | — / — |
| `hard-compound-discount` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-speed-average` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-weighted-average` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-compound-interest` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-scheduling-rooms` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-contradiction-detect` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-planning-release` | planning | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-synthesis-budget` | synthesis | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-mult` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-percent` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-units` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-chain` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-division` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-invalid-chain` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-contradiction` | logic | 2 | 0.50 | 0.50 | +0.00 | — / oui |
| `gsm8k-0007` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0060` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0113` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0166` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0219` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0272` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0325` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0378` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0431` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0484` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0537` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0590` | arithmetic | 2 | 0.00 | 0.00 | +0.00 | — / — |
| `gsm8k-0643` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0696` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0749` | arithmetic | 2 | 0.00 | 0.00 | +0.00 | — / — |
| `gsm8k-0802` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0855` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0908` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-0961` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-1014` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-1067` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-1120` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-1173` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-1226` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `gsm8k-1279` | arithmetic | 2 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-000` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-003` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-006` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-009` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-012` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-015` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-018` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-021` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-024` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-027` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-030` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `bbh-033` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-000` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-001` | factual | 3 | 0.00 | 0.00 | +0.00 | — / — |
| `hotpot-002` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-003` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-004` | factual | 3 | 0.00 | 0.00 | +0.00 | — / — |
| `hotpot-005` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-006` | factual | 3 | 0.00 | 0.00 | +0.00 | — / — |
| `hotpot-007` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-008` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-009` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-010` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-011` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-012` | factual | 3 | 1.00 | 0.00 | -1.00 | — / — |
| `hotpot-013` | factual | 3 | 0.00 | 0.00 | +0.00 | — / — |
| `hotpot-014` | factual | 3 | 0.00 | 1.00 | +1.00 | — / — |

## Notes

- Aucune TAVILY_API_KEY: web_search/fetch restent hors ligne et les prompts ne demandent pas de recherche web.
- Provider réel: openai (résultats non déterministes). Agent opencode isolé: aucun outil de code, aucun accès au dépôt.

