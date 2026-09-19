# Data and security

The client transmits only the arguments supplied by its host assistant. It does not scan project files or keep provider credentials. The hosted service stores dossiers, evidence, operation receipts and events. Files explicitly submitted for code checks leave the user's machine.

Anonymous requests use shared operator quotas. Each anonymous dossier ID embeds a private access capability. Preserve it securely; do not publish it in logs, examples or bug reports. Authenticated users remain subject to server-side ownership and scopes.

A dossier's `externalAllowed` and `dataClass` settings control external provider paths. Restricted dossiers and dossiers without external consent cannot use the relevant Jev, search and web-fetch paths. This does not turn the remote service into local execution. Internally isolated code execution still transmits supplied files to the hosted runner.

The execution runner uses fresh native Cloud Run sandboxes, a minimal root filesystem and a read-only snapshot. The payload receives no controller secrets or Google credentials and cannot make outbound network connections. Private execution objects have a 30-day lifecycle rule; associated dossiers, logs and metadata have separate retention. No claim of zero retention is made.

HTTPS is mandatory except explicit IP-loopback tests. Request sizes, response sizes, concurrency and timeouts are bounded. The client does not follow redirects or blindly retry mutations. Typed refusals preserve actionable codes without echoing arbitrary response bodies.

Retrieved documents, imported text and model outputs are untrusted data. A source passage or model opinion is not a general proof. The 16.1 semantic code-review calibration did not meet production criteria; critical review obligations remain open.

The public-boundary scanner rejects server implementations, private state and common secret patterns. It is an additional check, not a guarantee that every possible secret has been detected. Report suspected credential exposure privately to the operator and rotate the credential through its normal provider flow.
