# Security Policy

## Supported versions

Lexora is a research-stage project. Security fixes are applied to the latest `main` branch only — there are no backport releases for older versions.

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| Tagged releases (`lexora-v*`, `lexora-ml-v*`) | ⚠️ Best-effort; upgrade to latest `main` for security fixes |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please report vulnerabilities privately:

1. Go to the [Security tab](https://github.com/khalilelemam/lexora/security/advisories/new) on the Lexora GitHub repository.
2. Click **"Report a vulnerability"** to open a private security advisory.
3. Include the following in your report:
   - Affected service (`web/`, `ml-service/`, `tobii-service/`)
   - Commit hash or release tag you tested against
   - Steps to reproduce the vulnerability
   - Potential impact (what an attacker could do)
   - Suggested fix, if you have one

### Response timeline

| Step | Target |
|------|--------|
| Acknowledgment of receipt | 72 hours |
| Initial assessment and severity rating | 7 days |
| Fix or mitigation for high-severity issues | 30 days |
| Fix or mitigation for medium-severity issues | 90 days |
| Public disclosure (after fix is released) | Coordinated with reporter |

These are targets, not guarantees. This is a research project maintained by a small team.

## Scope

### In scope

- Vulnerabilities in `web/`, `ml-service/`, and `tobii-service/` source code.
- Authentication or authorization bypass in the web app.
- Injection vulnerabilities (SQL injection via Prisma, command injection, XSS).
- Insecure handling of gaze data, PII, or stored attempt artifacts.
- Issues that leak secrets or allow unauthorized access to Azure Blob Storage or PostgreSQL.
- ML-specific issues: model evasion, data poisoning, or prediction manipulation that could cause harm.

### Out of scope

- Vulnerabilities in third-party dependencies — report these upstream (see [`NOTICE`](NOTICE) for the dependency list).
- Issues in the Tobii Pro SDK — this is proprietary software licensed from Tobii; report to [Tobii support](https://www.tobii.com/support).
- Self-hosted deployments where the operator misconfigured environment variables, CORS, or firewall rules.
- Rate limiting or brute-force concerns on the magic-link auth flow (these are throttled at the Resend and Better Auth layers).
- Findings from automated scanners without a demonstrable exploit.
- Social engineering or physical attacks against users.

### Reward

Lexora does not offer a monetary bug bounty. Contributors who report valid security issues will be credited in the GitHub Security Advisory and (with permission) in release notes.

## Security measures in place

This section documents what Lexora already does, so reporters don't waste time on known mitigations.

### Authentication

- **Better Auth** with Google OAuth and magic-link email (via Resend).
- `BETTER_AUTH_SECRET` (minimum 32 characters) is required at startup.
- Session tokens are signed and verified server-side.

### Data handling

- Gaze data is processed in memory and not persisted unless the user is authenticated and the submission succeeds.
- Persisted attempt metadata lives in PostgreSQL (Neon, with pooled + unpooled connections).
- Raw and derived JSON artifacts are stored in Azure Blob Storage with a connection string kept server-side only (never exposed to the browser).
- Child profiles do not have their own credentials — they are managed by authenticated guardians.

### Network

- `web/` → `ml-service/` communication uses `ML_SERVICE_URL` (server-side only, not exposed to the browser).
- `web/` ↔ `tobii-service/` uses `ws://localhost:28980` (local only; the Tobii service runs on the user's machine).
- CORS is configured per service: `ALLOWED_ORIGINS` in `ml-service/` and `tobii-service/`.

### ML safety

- The ML service validates input shapes and rejects requests with fewer than 20 gaze points.
- Risk thresholds (`LOW_RISK_THRESHOLD=0.33`, `HIGH_RISK_THRESHOLD=0.66`) are configurable but bounded — the service does not accept thresholds outside `[0, 1]`.
- Model version is included in every prediction response for traceability.

## Clinical safety disclaimer

**Lexora is a screening tool, not a medical device.** It is:

- Not FDA-cleared or CE-marked.
- Not a substitute for professional diagnostic evaluation.
- Not intended for use as the sole basis for a dyslexia diagnosis.

If you believe a prediction error could cause clinical harm (e.g. false negatives that prevent a child from getting needed evaluation), report it through the vulnerability process above and mark it as **high severity**.
