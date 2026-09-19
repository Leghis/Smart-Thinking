# Client validation

```bash
npm ci
npm run check
```

The suite covers stdio and HTTP envelopes, protocol negotiation, cancellation, credential-file rotation, paginated discovery, typed refusals, profiles, resource bounds and the CLI/JavaScript entry points. Configuration fixtures check the assistant-specific JSON roots.

The package test creates the exact allowed tarball, installs it offline into a temporary consumer, and executes its binary and public export. Tests remove their temporary directories. `test:boundary` checks that no engine implementation or private state enters this public repository.

The core's `npm run test:cross-repo` runs this actual client against the real server handlers with synthetic credentials and in-memory storage. It validates integration, not deployed Firestore/IAM behavior. Separate staging and post-deployment checks exercise those services.

`npm run doctor` performs network discovery without Jev inference. A successful doctor means connectivity and catalogue compatibility, not provider quality or successful sandbox execution.

Release history is retained in the dated `RELEASE_V*.md` files. Those documents describe their original versions and are not current deployment evidence.

## Publishing the tested archive

After `npm run check` and `npm pack`, use `scripts/publish-tested.mjs ARCHIVE.tgz next --execute` with `NPM_CONFIG_USERCONFIG` pointing to the private publishing configuration. It expands and repacks the archive, refuses any byte change, and publishes those contents with npm’s directory-prepared README metadata. Verify archive integrity from the registry, install the registry version, and inspect the actual npm README page before promoting `latest`. The registry root `readme` field alone is not a reliable rendering check.
