# Smart-Thinking Deployment Checklist

Use this checklist to prepare a Smart-Thinking release. All items must be confirmed before tagging and publishing a new version.

## 1. Versioning & Planning
- [ ] Confirm transformation plan Phase 6 tasks are complete (`TRANSFORMATION_PLAN.md`).
- [ ] Update `package.json` version (`npm version <type>`). Include matching git tag.
- [ ] Review `docs/release-notes/v10.1.0.md` (or latest) and ensure highlights, improvements, and breaking changes are accurate for the release.

## 2. Code Quality & Security
- [ ] `npm run lint` (no warnings, `--max-warnings=0` enforced).
- [ ] `npm run test` (all Jest suites pass with `--runInBand`).
- [ ] `npm run test:coverage` (persistence ≥80% statements/lines, orchestrator branches ≥60%).
- [ ] `npm audit` (or `npm audit --production`) and address high/critical issues.
- [ ] Review feature flags (`feature-flags.ts`) to confirm external integrations remain disabled.

## 3. Deterministic Build Verification
- [ ] `npm run build` (generates `build/` artifacts and sets CLI executable bit).
- [ ] `npm run demo:session` (verify the orchestration timeline, heuristics, and persistence logs look healthy).
- [ ] Launch MCP server (`smart-thinking-mcp` or `npx -y smart-thinking-mcp`) and confirm handshake with at least one MCP client (Claude Desktop, Cursor, etc.).

## 4. Documentation & Communication
- [ ] README and installation guide reflect the release features and commands.
- [ ] Update external listings (MCP Market, Smithery server page, internal wikis) with the new reasoning flow and demo instructions.
- [ ] If applicable, prepare migration notes for teams upgrading from earlier (pre-Phase-6) versions.

## 5. Publishing Steps
- [ ] Commit all changes and push to the main branch.
- [ ] Create git tag `v<version>` and push (`git push origin --tags`).
- [ ] `npm publish --access public` (ensure 2FA for npm is enabled per best practices).
- [ ] Announce the release to stakeholders (email, chat, release channels).

## 6. Post-Release Monitoring
- [ ] Monitor logs from MCP clients for unexpected verification warnings or high memory usage.
- [ ] Track npm download stats and Marketplace metrics for anomalies.
- [ ] Schedule a retrospective to capture lessons learned and adjust the transformation plan if needed.
