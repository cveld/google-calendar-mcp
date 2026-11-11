# Dependency hardening

The direct and transitive `gaxios` instances use `7.3.1`, removing the older
`rimraf`/`glob`/`minimatch` chain. Keeping all instances on the same version also
preserves `instanceof GaxiosError` identity across consumers.

`@hono/node-server` is overridden to `2.1.3` for GHSA-rmxm-3fg6-px4f.
This crosses a major version: verify the SDK's HTTP adapter behavior before
using it in a public HTTP deployment. The local integration uses STDIO.

No gaxios-8 update is included. Run `npm ci --ignore-scripts`, `npm audit`,
lint, build, and tests after changing these overrides.
