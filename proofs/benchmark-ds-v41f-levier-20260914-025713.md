# Benchmark Smart-Thinking — ds-v41f-levier

- Provider: `openai:deepseek-flash` (live)
- Generated: 2026-09-14T06:57:45.106Z
- Tasks: 7 | Seed: 1337

## Summary

| Condition | Accuracy | Exact match | Mean latency | p50 | p95 | Tokens (in/out) | Hallucinations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 78.6 % | 71.4 % | 1729.3 ms | 1590.0 ms | 2763.0 ms | 733 / 1179 | 0 |
| tool | 92.9 % | 85.7 % | 2745.0 ms | 2554.0 ms | 3656.0 ms | 21206 / 1559 | 0 |

## Delta baseline → tool

- Absolute: **+14.29 pp**
- Relative: +18.2 %
- Wins / losses / ties: 1 / 0 / 6
- Exact binomial sign test p-value: 1.000

## Per category

| Category | Baseline accuracy | Tool accuracy | Tasks |
| --- | ---: | ---: | ---: |
| arithmetic | 83.3 % | 100.0 % | 6 |
| logic | 50.0 % | 50.0 % | 1 |

## Task-by-task

| Task | Category | Diff. | Baseline | Tool | Delta | Hallucinations (b/t) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `levier-mult` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-percent` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-units` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-chain` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-division` | arithmetic | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `levier-invalid-chain` | arithmetic | 3 | 0.00 | 1.00 | +1.00 | — / — |
| `levier-contradiction` | logic | 2 | 0.50 | 0.50 | +0.00 | — / — |

## Notes

- TAVILY_API_KEY détecté: les outils web_search/fetch peuvent accéder au réseau.
- Provider réel: openai (résultats non déterministes). Agent opencode isolé: aucun outil de code, aucun accès au dépôt.

