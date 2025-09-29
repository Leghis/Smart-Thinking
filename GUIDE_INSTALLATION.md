# Smart-Thinking Installation and Validation Guide

This guide explains how to install, configure, and validate the Smart-Thinking MCP server across Windows, macOS, and Linux environments. The server runs fully offline: embeddings, quality metrics, and verification routines are handled by the local Reasoning Orchestrator.

## 1. Prerequisites
- Node.js 18 LTS or newer (Node 20 recommended for long-term support).
- npm 9 or newer.
- Optional: Claude Desktop or any MCP-compatible client (Cursor, Windsurf, Cline, …).
- For source builds: Git and build tools required by your platform.

Verify versions:
```bash
node --version
npm --version
```

## 2. Installation Paths
Choose the option that fits your workflow.

### Option A — Global npm install (recommended)
```bash
npm install -g smart-thinking-mcp
```
This exposes the `smart-thinking-mcp` binary system-wide.

### Option B — On-demand with npx
```bash
npx -y smart-thinking-mcp
```
Ideal for quick experiments without touching global packages.

### Option C — Install via Smithery automation
```bash
npx -y @smithery/cli install @Leghis/smart-thinking --client claude
```
Smithery generates the platform-specific wiring for Claude Desktop and keeps the server up to date.

### Option D — Build from source
```bash
git clone https://github.com/Leghis/Smart-Thinking.git
cd Smart-Thinking
npm install
npm run build
npm link     # Optional: expose the build as a global binary
```
The build step compiles TypeScript, generates the `build/` artifacts, and runs `scripts/make-executable.js` to ensure the CLI entry point is executable.

> Tip: if you prefer installing locally without linking, run `npm pack` to produce a tarball and install it with `npm install -g ./smart-thinking-mcp-<version>.tgz`.

## 3. Configure Claude Desktop (or other MCP clients)

### macOS
1. Create the configuration directory if it does not exist:
   ```bash
   mkdir -p "~/Library/Application Support/Claude"
   ```
2. Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "smart-thinking-mcp"
       }
     }
   }
   ```
3. Using `npx` instead of a global install:
   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "npx",
         "args": ["-y", "smart-thinking-mcp"]
       }
     }
   }
   ```
4. Running from source:
   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "node",
         "args": ["/absolute/path/to/Smart-Thinking/build/index.js"]
       }
     }
   }
   ```

### Windows
1. Create (or open) the Claude folder:
   ```cmd
   mkdir "%APPDATA%\Claude"
   notepad "%APPDATA%\Claude\claude_desktop_config.json"
   ```
2. Global install configuration:
   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "C:/Users/<You>/AppData/Roaming/npm/smart-thinking-mcp.cmd"
       }
     }
   }
   ```
3. npx configuration:
   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "npx.cmd",
         "args": ["-y", "smart-thinking-mcp"]
       }
     }
   }
   ```
4. From source (PowerShell syntax shown):
   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "node",
         "args": ["C:/path/to/Smart-Thinking/build/index.js"]
       }
     }
   }
   ```

### Linux
1. Create the configuration directory if needed:
   ```bash
   mkdir -p ~/.config/Claude
   ```
2. Edit `~/.config/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "smart-thinking-mcp"
       }
     }
   }
   ```
3. npx variant:
   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "npx",
         "args": ["-y", "smart-thinking-mcp"]
       }
     }
   }
   ```
4. Running directly from source:
   ```json
   {
     "mcpServers": {
       "smart-thinking": {
         "command": "node",
         "args": ["/home/<you>/Smart-Thinking/build/index.js"]
       }
     }
   }
   ```

## 4. Post-install Validation

### 4.1 Quick smoke test
```bash
smart-thinking-mcp
```
You should see the MCP handshake logs. Stop the server with `Ctrl+C` once it is running.

### 4.2 Reasoning demo
After installing from source, run the deterministic walkthrough:
```bash
npm run demo:session
```
This command feeds sample thoughts through the orchestrator and prints:
- the timeline of reasoning steps with durations,
- heuristic confidence/relevance/quality scores,
- verification statuses and calculation highlights,
- the resulting reasoning graph summary.

### 4.3 Quality gates before release
```bash
npm run lint
npm run test
npm run test:coverage
npm run build
```
These commands must pass with no warnings prior to tagging a release. Coverage targets: ≥80% statements on persistence modules, ≥60% branches on orchestrator logic.

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `smart-thinking-mcp` is not found | Global npm bin is not on PATH | Re-open your terminal or add `%APPDATA%\npm` (Windows) or `$HOME/.npm-global/bin` to PATH. |
| Claude Desktop cannot start the server | Wrong command path or missing permissions | Use absolute paths in the config JSON and ensure the file has the correct escape characters for Windows. |
| Server exits immediately | TypeScript sources were not compiled | Run `npm run build` or install from npm instead of raw sources. |
| Demo script reports missing build artifacts | `npm run build` was not executed before `npm run demo:session` | Build the project to populate `build/`. |
| Coverage below target | Tests do not exercise new heuristics | Add Jest cases in `src/__tests__` to cover the new logic. |

## 6. Preparing a Release
1. Update the version in `package.json` using `npm version <major|minor|patch>`.
2. Review `TRANSFORMATION_PLAN.md` to ensure all checklist items in Phase 6 are complete.
3. Run the quality gates (lint, tests, coverage, build).
4. Generate release notes and a deployment checklist (see `docs/release-notes/` if present, or create new ones per project guidelines).
5. Tag the commit and publish:
   ```bash
   git tag v<version>
   git push origin v<version>
   npm publish --access public
   ```
6. Notify stakeholders and update marketplace listings (MCP directories, Smithery, etc.).

## 7. Additional Resources
- `README.md` — quick overview, reasoning flow, and developer commands.
- `TRANSFORMATION_PLAN.md` — history of the refactor phases and remaining work.
- `src/__tests__/` — reference implementations for persistence, heuristics, and orchestrator scenarios.

For further assistance, open an issue on GitHub or reach out via the MCP community channels.
