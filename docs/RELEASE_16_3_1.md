# Client 16.3.1

This patch refreshes the public contract for the hosted search improvements:

- Explicit Tavily domain/date filters, preferred domains, result count and depth.
- Source-specific Jev relevance and first-party questions.
- A documented fallback that prefers requested domains and topical documentation,
  replaces failed pages and avoids duplicate fetches.

The catalogue still contains 43 tools. Existing arguments remain valid. Reconnect
clients that cache tool schemas to discover the optional fields. Core code-review
qualification retains its existing 16.3.0 policy and measured scope; source ranking
is a separate advisory operation.
