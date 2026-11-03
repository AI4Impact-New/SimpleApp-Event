# Dependency audit policy and November 2026 findings

PR #40 exposed advisories in unchanged lockfiles on main. These were not caused by
its landing content changes.

## Runtime remediation

Admin's axios dependency resolved `follow-redirects@1.16.1`, affected by
[GHSA-mrwp-f3q8-3g9p](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p).
The lockfile now resolves the compatible patched release 1.16.2.

## Build-tool finding still open

[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
flags minimatch below 11.0.1. The landing and admin ESLint chains contain flagged
versions. The described attack involves attacker-controlled glob patterns and
optimizationLevel >= 2. These dependencies are development tooling; the production
static landing site does not expose the linter as an HTTP endpoint. This is not a
claim that all tooling is immune, and the advisory remains open.

`npm audit fix --force` proposes downgrading ESLint to 4.0.0. Do not take that
incompatible downgrade or globally override minimatch 3 to 11: its CommonJS API
changed and legacy consumers can break. Track compatible upstream updates or a
separately tested tooling migration. Do not accept untrusted glob patterns in
build configuration while this finding remains.

## CI enforcement

Both admin and landing run two blocking checks:

- `npm audit --omit=dev`: any reported runtime severity fails CI.
- `npm audit --audit-level=high`: scans/reports the whole tree; high and critical
  build-tool findings fail CI. Moderate tooling findings remain visible but do
  not block builds. This is an explicit severity-policy change from landing's
  previous all-severity, whole-tree gate, not elimination of the minimatch issue.

No advisory is suppressed by ID, and neither audit uses `|| true`. Revisit the
moderate tooling finding when compatible upstream patches are available. The
repository maintainer owns dependency updates independently of content authors.
