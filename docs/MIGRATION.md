# Updating and compatibility

Pin `smart-thinking-mcp@16.1.0` in active assistant configurations, preserve custom endpoints and credential-file paths, then reload the MCP connection. Run the doctor and one exact calculation to verify the effective connection. A direct HTTP connection does not install the npm client; reload its catalogue after the server release.

16.1 keeps the MCP 16.0 wire profile and existing tool arguments. `code_index` and durable job metadata are additive. Complete catalogue discovery occurs before profile filtering. VS Code uses `servers` with `type: "stdio"`; do not copy a `mcpServers` configuration into that file.

The public package has been a remote client since V14. Local engine/SQLite use and the restricted V13 import remain in the separate core repository. V13 sessions are never uploaded automatically. Historical imports and receipts remain readable; insufficient historical provenance requires fresh verification for current work.

Keep historical benchmark configurations pinned to the versions they measured. Update only active installations. Preserve the previous npm version and Cloud Run revision as rollback points. npm versions are immutable: a published version cannot be replaced with different contents.

After an interrupted operation, use `operation_get` or `code_job_get` with its existing identity. An unknown result is not permission to rerun the operation under a new identity.
