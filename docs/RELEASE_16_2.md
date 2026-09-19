# Client 16.2 release

The public client is **16.2.1**, published as `latest` and `next`. It connects to engine **16.2.0** with the unchanged `smart-thinking-mcp/16.0` transport profile and 43 tools. Website **2.1.0** provides eighteen bilingual scenarios and the updated installation guides.

16.2.0 aligned the shared release contract and installation examples. 16.2.1 corrects the public README's scenario count and calibration status; it changes no client behavior. The earlier published archive remains immutable.

All 97 client tests passed. The twelve-file package installed offline; the actual registry archive matched the tested SHA-512 integrity and README bytes. An installation from npm discovered all 43 tools and computed `250*10/4 = 625` on engine 16.2.0. The actual npm page displays the short English README and current installation command.

Both active local configurations were updated without changing credentials or other settings, and fresh launches passed through the official MCP SDK. Restart of an already-running Codex desktop connection was not verified.

The production semantic-review policy remains advisory: six rubric-level acceptance checks still fail. See the [published evaluation and its limits](https://smart-thinking-site-923774092927.northamerica-northeast1.run.app/en/benchmarks/).

Operators can reproduce registry verification with `node scripts/verify-registry.mjs` after packing the tested version into `.local`. It uses the normal client environment variables and makes one exact remote calculation. The script compares immutable archive integrity before interpreting any remote result.
