[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/leghis-smart-thinking-badge.png)](https://mseep.ai/app/leghis-smart-thinking)

# Smart-Thinking

[![smithery badge](https://smithery.ai/badge/@Leghis/smart-thinking)](https://smithery.ai/server/@Leghis/smart-thinking)
[![npm version](https://img.shields.io/npm/v/smart-thinking-mcp.svg)](https://www.npmjs.com/package/smart-thinking-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1.6-blue)](https://www.typescriptlang.org/)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-blue)](https://github.com/Leghis/smart-thinking-mcp)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS-blue)](https://github.com/Leghis/smart-thinking-mcp)
[![Platform: Linux](https://img.shields.io/badge/Platform-Linux-blue)](https://github.com/Leghis/smart-thinking-mcp)

Smart-Thinking is a Model Context Protocol (MCP) server that delivers graph-based, multi-step reasoning without relying on external AI APIs. Everything happens locally: similarity search, heuristic-based scoring, verification tracking, memory, and visualization all run in a deterministic pipeline designed for transparency and reproducibility.

## Core Capabilities
- Graph-first reasoning that connects thoughts with rich relationships (supports, contradicts, refines, contextual links, and more).
- Local TF-IDF + cosine similarity engine powering memory lookups and graph expansion without third-party embedding services.
- Heuristic quality evaluation that scores confidence, relevance, and quality using transparent rules instead of LLM calls.
- Verification workflow with detailed statuses and calculation tracing to surface facts, guardrails, and uncertainties.
- Persistent sessions that can be resumed across runs, keeping both the reasoning graph and verification ledger in sync.

## Reasoning Flow
1. **Session bootstrap** – `ReasoningOrchestrator` initializes a session, restores any saved graph state, and prepares feature flags.
2. **Pre-verification** – deterministic guards inspect the incoming thought, perform light-weight calculation checks, and annotate the payload.
3. **Graph integration** – the thought is inserted into `ThoughtGraph`, linking to context, prior thoughts, and relevant memories.
4. **Heuristic evaluation** – `QualityEvaluator` and `MetricsCalculator` compute weighted scores and traces that explain the decision path.
5. **Verification feedback** – statuses from `VerificationService` and heuristic traces are attached to the node and propagated across connections.
6. **Persistence & response** – updates are written to `MemoryManager`/`VerificationMemory`, and a structured MCP response is returned with a timeline of reasoning steps.

Each step is logged with structured metadata so you can visualize the reasoning fabric, audit decisions, and replay sessions deterministically.

## Installation
Smart-Thinking ships as an npm package compatible with Windows, macOS, and Linux.

### Global install (recommended)
```bash
npm install -g smart-thinking-mcp
```

### Run with npx
```bash
npx -y smart-thinking-mcp
```

### Install via Smithery
```bash
npx -y @smithery/cli install @Leghis/smart-thinking --client claude
```

### From source
```bash
git clone https://github.com/Leghis/Smart-Thinking.git
cd Smart-Thinking
npm install
npm run build
npm link
```

> Need platform-specific configuration details? See `GUIDE_INSTALLATION.md` for step-by-step instructions covering Windows, macOS, Linux, and Claude Desktop integration.

## Quick Tour
- `smart-thinking-mcp` — start the MCP server (globally installed package).
- `npx -y smart-thinking-mcp` — launch without a global install.
- `npm run start` — execute the built server from source.
- `npm run demo:session` — run the built-in CLI walkthrough that feeds sample thoughts through the reasoning pipeline and prints the resulting timeline.

The demo script showcases how the orchestrator adds nodes, evaluates heuristics, and records verification feedback step by step.

## Configuration & Feature Flags
- `feature-flags.ts` toggles advanced behaviours such as external integrations (disabled by default) and verbose tracing.
- `config.ts` aligns platform-specific paths and verification thresholds.
- `memory-manager.ts` and `verification-memory.ts` store session graphs, metrics, and calculation results using deterministic JSON snapshots.

## Development Workflow
```bash
npm run build           # Compile TypeScript sources
npm run lint            # ESLint across src/
npm run test            # Jest test suite
npm run test:coverage   # Jest coverage report
npm run watch           # Incremental TypeScript compilation
```

See `TRANSFORMATION_PLAN.md` for the full transformation history and the checklist that drives ongoing hardening.

## Quality & Support
- Deterministic heuristics and verification eliminate dependency on remote LLMs.
- Coverage targets: ≥80 % on persistence modules, ≥60 % branch coverage across orchestrator logic.
- CI recommendations: run `npm run lint` and `npm run test:coverage` before each release candidate.

## Contributing
Contributions are welcome. Please open an issue or pull request describing the change, and run the quality checks above before submitting.

## License
[MIT](./LICENSE)
