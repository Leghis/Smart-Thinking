# Benchmark Smart-Thinking — ds-v41f-hotpot

- Provider: `openai:deepseek-flash` (live)
- Generated: 2026-09-14T06:57:13.683Z
- Tasks: 15 | Seed: 1337

## Summary

| Condition | Accuracy | Exact match | Mean latency | p50 | p95 | Tokens (in/out) | Hallucinations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 73.3 % | 73.3 % | 4542.8 ms | 3646.0 ms | 13431.0 ms | 1659 / 11168 | 0 |
| tool | 80.0 % | 80.0 % | 9102.9 ms | 6907.0 ms | 36664.0 ms | 91219 / 12142 | 0 |

## Delta baseline → tool

- Absolute: **+6.67 pp**
- Relative: +9.1 %
- Wins / losses / ties: 2 / 1 / 12
- Exact binomial sign test p-value: 1.000

## Per category

| Category | Baseline accuracy | Tool accuracy | Tasks |
| --- | ---: | ---: | ---: |
| factual | 73.3 % | 80.0 % | 15 |

## Task-by-task

| Task | Category | Diff. | Baseline | Tool | Delta | Hallucinations (b/t) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `hotpot-000` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |
| `hotpot-001` | factual | 3 | 0.00 | 1.00 | +1.00 | — / — |
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
| `hotpot-013` | factual | 3 | 0.00 | 1.00 | +1.00 | — / — |
| `hotpot-014` | factual | 3 | 1.00 | 1.00 | +0.00 | — / — |

## Notes

- TAVILY_API_KEY détecté: les outils web_search/fetch peuvent accéder au réseau.
- Provider réel: openai (résultats non déterministes). Agent opencode isolé: aucun outil de code, aucun accès au dépôt.

