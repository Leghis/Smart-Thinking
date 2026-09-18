# Smart-Thinking — client MCP distant

**Version `15.0.0`.** Raisonnement exact et vérifiable en MCP : arithmétique et
algèbre exactes, résolution de systèmes, calcul borné, recherche web sourcée,
dossiers de preuve. **Aucun jeton requis** : le point d'accès public accepte les
requêtes anonymes. Le moteur tourne sur le serveur hébergé ; ce paquet est le
client qui connecte n'importe quel hôte MCP.

> Endpoint public : `https://smart-thinking-v14-923774092927.northamerica-northeast1.run.app/mcp`
> (valeur par défaut du client — rien à configurer).

## Démarrage rapide — zéro configuration

```bash
npx -y smart-thinking-mcp --version   # 15.0.0
npx -y smart-thinking-mcp --help
```

Le client parle MCP sur stdin/stdout (silence après démarrage = normal, il attend
l'hôte) ou s'importe en JavaScript :

```js
import { RemoteConnection } from 'smart-thinking-mcp';   // ou 'smart-thinking-mcp/clients/remote-mcp/connection.mjs'
const c = new RemoteConnection();               // endpoint public, sans jeton
await c.initialize();
const out = await c.call('calculate', { expression: '2^10', expected: '1024' });
// { status: 'exact_computed', value: '1024', matchesExpected: true, ... }
```

## Connecter votre outil

**Claude Code**
```bash
claude mcp add smart-thinking -- npx -y smart-thinking-mcp
```

**ChatGPT (web, plans Plus/Pro/Business)** — Developer Mode requis :
1. Settings → Connectors → Advanced settings → activer **Developer mode**
2. **Create** un connecteur : nom `Smart-Thinking`, URL
   `https://smart-thinking-v14-923774092927.northamerica-northeast1.run.app/mcp`,
   authentification **No authentication**
3. Dans une conversation : `+` → Developer mode → sélectionner Smart-Thinking

**Codex CLI** (`~/.codex/config.toml`)
```toml
[mcp_servers.smart-thinking]
command = "npx"
args = ["-y", "smart-thinking-mcp"]
startup_timeout_sec = 120
```

**Hermes**
```bash
hermes mcp add smart-thinking --command npx --args -y smart-thinking-mcp
```

**Claude Desktop** (`claude_desktop_config.json`)
```json
{ "mcpServers": { "smart-thinking": { "command": "npx", "args": ["-y", "smart-thinking-mcp"] } } }
```

**Cursor / VS Code / tout hôte stdio** — même bloc `mcpServers` que ci-dessus.

**Google Antigravity** (`~/.gemini/config/mcp_config.json`)
```json
{ "mcpServers": { "smart-thinking": { "serverUrl": "https://smart-thinking-v14-923774092927.northamerica-northeast1.run.app/mcp" } } }
```

## Options

| Variable | Défaut | Rôle |
|---|---|---|
| `SMART_THINKING_MCP_URL` | endpoint public | Surcharger l'endpoint (auto-hébergement). |
| `SMART_THINKING_MCP_TOKEN_FILE` | *(aucun)* | **Facultatif** : chemin d'un fichier 600 contenant un jeton nominatif (quota dédié supérieur). Jamais la clé du fournisseur. |
| `SMART_THINKING_TOOL_PROFILE` | `full` | `math`… `research`… `code`… `audit` : réduit les schémas transmis au modèle, sans changer les droits. |

## Ce que le serveur expose (33 outils)

- **Calcul exact (sans dossier)** : `calculate`, `calculate_batch`, `solve_math`,
  `solve_logic`, `finite_compute`, `check`, `cas` — jamais d'erreur de flottant.
- **Recherche** : `web_search`, `fetch` (SSRF-protégé), `research` (jusqu'à 3 pages).
- **Dossier de preuve** : `run_create`, `claim`, `requirement_add`, `verify`, `audit`,
  `run_finalize`… avec budgets et reçus durables.
- **Jev (jugement sémantique)** : `analyze`, `plan`, `critique`, `semantic_*` — aide à
  interpréter, **jamais** une preuve à lui seul.

Exemples vérifiés contre le serveur public :

```text
calculate  2^10                        → 1024 (exact_computed)
calculate  factorial(6)                → 720
solve_math 17x+23y=191 ; 31x−7y=299    → x = 4107/416, y = 419/416
finite_compute  Fibonacci réc. mod 1e4 → 6765 (a₂₀)
```

## Mode public — à savoir

- Les requêtes anonymes partagent une identité publique soumise aux **plafonds
  opérateur** (quotas journaliers partagés) ; fournir un jeton donne un quota dédié.
- En anonyme, la liste des dossiers est désactivée (les utilisateurs restent séparés) ;
  conservez le `runId` retourné par vos appels. **N'importe qui peut utiliser le
  service : ne soumettez pas de contenu sensible.**
- Aucun secret fournisseur ne réside dans ce client ; les clés restent côté serveur.

## Vos données — ce qui sort du serveur

Chaque dossier porte `dataClass` (`public` · `internal` · `restricted`) et
`externalAllowed`. Tout chemin externe (Jev, `web_search`/`fetch`/`research`) exige
les deux — sinon `FORBIDDEN`, et le calcul exact reste disponible. Depuis 14.2.2,
`run_create` affiche ces disponibilités immédiatement (`availability`). Matrice
complète : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
[docs/SECURITY.md](docs/SECURITY.md).

## Contrat et limites

Profil `smart-thinking-mcp/15.0`, Streamable HTTP **stateless avec réponses JSON** ;
protocoles `2025-03-26`, `2025-06-18`, `2025-11-25`. Sessions stateful et SSE rejetés
explicitement. Requêtes ≤ 256 000 octets, réponses ≤ 1 600 000 octets, 115 s de délai,
8 requêtes simultanées. Une mutation n'est jamais réessayée automatiquement : après un
timeout, consultez `operation_get` avant de répéter. Les mesures réelles et leurs limites
sont publiées dans [le rapport de version](docs/RELEASE_V14.md).

## Développement

Node.js ≥ 22.16. Seuls des fichiers publics vivent ici :

```bash
npm ci
npm run check     # tests + frontière public/privé + paquet hors-ligne
```

La V13 reste dans l'historique au commit `a2dd4e6d926e50f8244b061f6ec97c90e5db62bb`.
Migration, architecture et sécurité : [docs/MIGRATION.md](docs/MIGRATION.md) ·
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/SECURITY.md](docs/SECURITY.md) ·
[contrat machine](contracts/v14.json) · [tests](docs/TESTS.md).
