# Benchmark Smart-Thinking — ds-v41f-hard

- Provider: `openai:deepseek-flash` (live)
- Generated: 2026-09-14T06:58:23.432Z
- Tasks: 8 | Seed: 1337

## Summary

| Condition | Accuracy | Exact match | Mean latency | p50 | p95 | Tokens (in/out) | Hallucinations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 100.0 % | 100.0 % | 1795.0 ms | 1534.0 ms | 3733.0 ms | 1029 / 1477 | 0 |
| tool | 100.0 % | 100.0 % | 2980.9 ms | 2866.0 ms | 5259.0 ms | 26017 / 2266 | 0 |

## Delta baseline → tool

- Absolute: **+0 pp**
- Relative: +0 %
- Wins / losses / ties: 0 / 0 / 8
- Exact binomial sign test p-value: 1.000

## Per category

| Category | Baseline accuracy | Tool accuracy | Tasks |
| --- | ---: | ---: | ---: |
| arithmetic | 100.0 % | 100.0 % | 4 |
| logic | 100.0 % | 100.0 % | 2 |
| planning | 100.0 % | 100.0 % | 1 |
| synthesis | 100.0 % | 100.0 % | 1 |

## Task-by-task

| Task | Category | Diff. | Baseline | Tool | Delta | Hallucinations (b/t) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `hard-compound-discount` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-speed-average` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-weighted-average` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-compound-interest` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-scheduling-rooms` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-contradiction-detect` | logic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-planning-release` | planning | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hard-synthesis-budget` | synthesis | 3 | 1.00 | 1.00 | +0.00 | — / — |

## Notes

- TAVILY_API_KEY détecté: les outils web_search/fetch peuvent accéder au réseau.
- Provider réel: openai (résultats non déterministes). Agent opencode isolé: aucun outil de code, aucun accès au dépôt.

