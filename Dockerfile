# Operator must supply a reviewed immutable image, for example node@sha256:... .
ARG NODE_BASE
FROM ${NODE_BASE}
WORKDIR /app
COPY --chown=65532:65532 package.json LICENSE ./
COPY --chown=65532:65532 bin ./bin
COPY --chown=65532:65532 clients/remote-mcp/*.mjs ./clients/remote-mcp/
USER 65532:65532
# stdio CLIENT, not the private Cloud Run server. Mount client credentials read-only.
ENTRYPOINT ["node", "bin/smart-thinking.mjs"]
