# Smart-Thinking

**Help your AI check its work.**

Smart-Thinking connects your usual AI assistant to tools for checking calculations, finding supporting passages and testing code. Ask in ordinary language; your assistant prepares the check and explains the result.

This package is the small MCP client. MCP is the protocol assistants use to connect to tools. The checking engine runs on the hosted service. You do not need to install a database, run the engine or supply a personal token for public access.

## What can you do?

- **Check a number.** Recalculate a discount, scale a recipe or compare complete quotes using exact arithmetic.
- **Check a source.** Find the passage behind a statement and inspect its date, context and origin.
- **Check a code change.** Run approved tests in an isolated environment and see which files were actually tested. A later change needs a new check.

## Connect your assistant

You need **Node.js 22.16 or newer** and Internet access. For an assistant that accepts a `mcpServers` configuration, add:

```json
{
  "mcpServers": {
    "smart-thinking": {
      "command": "npx",
      "args": ["-y", "smart-thinking-mcp@16.3.1"]
    }
  }
}
```

Save the configuration and reload the MCP connection in your assistant. **VS Code uses a different format.** Follow the application-specific [connection guides](https://smart-thinking-site-923774092927.northamerica-northeast1.run.app/en/docs/connect/) for Codex, Claude, Cursor, VS Code or direct HTTP access.

To diagnose a connection from your terminal:

```bash
npx -y smart-thinking-mcp@16.3.1 --doctor --allow-network
```

The diagnostic checks connectivity and tool discovery. Provider availability is reported separately.

## Try these three requests

1. “Use Smart-Thinking to check €80 minus 20%, then add a 15% fee on the discounted price. Explain the steps.” Expected total: **€73.60**.
2. “Use Smart-Thinking to scale 250 g of flour for four people to ten people.” Expected quantity: **625 g**.
3. “Use Smart-Thinking to order these steps: draft before review, review before publish.” Expected order: **draft → review → publish**.

See [eighteen explained examples](https://smart-thinking-site-923774092927.northamerica-northeast1.run.app/en/use-cases/) for sources and code, too.

## Data and limits

Requests go to the hosted service. Search and semantic checks can use external providers; submitted code files run in a separate sandbox. The client does not scan your disk. Dossiers and results are stored server-side. Keep anonymous dossier identifiers private: they include access capabilities.

Public access has shared quotas. An exact calculation checks the supplied expression; passing tests cover the executed suite. Model reviews remain fallible. Code review has an internal qualification for bounded, explicit requirements. It can cover the declared semantic review when its evidence and qualification remain valid. This is not external accreditation or a correctness guarantee.

Read the [data and trust guide](https://smart-thinking-site-923774092927.northamerica-northeast1.run.app/en/trust/), [documentation](https://smart-thinking-site-923774092927.northamerica-northeast1.run.app/en/docs/) and [evaluations](https://smart-thinking-site-923774092927.northamerica-northeast1.run.app/en/benchmarks/). The website is available in French and English.

MIT license. [Source and issues](https://github.com/Leghis/Smart-Thinking).
