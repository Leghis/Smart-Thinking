# Connection settings

Use the [application-specific guides](https://smart-thinking-site-923774092927.northamerica-northeast1.run.app/en/docs/connect/). JSON examples are in `examples/`; they preserve the different `servers` (VS Code) and `mcpServers` (Claude/Cursor) roots.

| Setting | Purpose |
| --- | --- |
| `SMART_THINKING_MCP_URL` | Override the default hosted HTTPS endpoint. |
| `SMART_THINKING_MCP_TOKEN_FILE` | Optional private file containing an operator-issued access token. |
| `SMART_THINKING_TOOL_PROFILE` | `full`, `math`, `research`, `code` or `audit`; filtering happens after complete catalogue verification. |
| `SMART_THINKING_ID_TOKEN_FILE` | Optional short-lived Google identity-token file for a private service. |
| `SMART_THINKING_IAM_SERVICE_ACCOUNT` | Optional account to impersonate through the installed gcloud CLI. |
| `SMART_THINKING_IAM_AUDIENCE` | Receiving Cloud Run origin when impersonation is configured. |

Choose one IAM credential source. Keep secrets in private files, never URLs, examples or committed configuration. Public access needs no token; a present but invalid token remains an authentication error.

```bash
npx -y smart-thinking-mcp@16.1.0 --version
npx -y smart-thinking-mcp@16.1.0 --doctor --allow-network
```

`--allow-loopback` permits HTTP on `127.0.0.1` or `::1` for explicit local tests. It does not allow arbitrary insecure endpoints. Starting the command with no arguments opens the stdio MCP bridge; it is not an interactive chat program.

The JavaScript export is `RemoteConnection`. Call `initialize()` before `call(name, arguments)`. `discover()` returns the complete verified catalogue and `tools(profile)` selects a visible subset. Requests have bounded time and size; mutations are not blindly retried after a timeout. Recover the existing operation or job instead.
