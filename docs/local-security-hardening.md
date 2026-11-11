# Local security hardening

## OAuth scopes

`GOOGLE_CALENDAR_MCP_SCOPE_PROFILE` chooses the event scope used by both OAuth
transports and service-account clients:

- `standard` (default): `calendar.events`
- `owned`: `calendar.events.owned`, for events on calendars owned by the account
- `readonly`: `calendar.events.readonly`

All profiles also request `calendar.calendarlist.readonly`,
`calendar.calendars.readonly`, and `calendar.events.freebusy` to support calendar
discovery, metadata/timezones, and availability. No profile requests full
`calendar` access, calendar deletion/creation, or sharing administration.

The owned profile cannot read events on calendars merely shared with the account.
Metadata and free/busy access are still broader.
Google event-write scopes include event deletion; an OAuth scope cannot provide
"create/update but never delete". Exclude `delete-event` through tool filtering,
but do not mistake that for a restriction on the token itself.

Configure the same profile in the server and the standalone auth command.
Changing settings does not revoke an existing token's granted permissions.
Revoke the old grant in Google Account settings and authenticate again when
narrowing the profile.

For this personal Windows integration, `scripts/auth-personal.ps1` sets the owned
profile, DPAPI protection, and dedicated credential paths consistently. It checks
directory/file access before launching the local authentication build. Do not
use the upstream `npx` authentication command with these encrypted token files.

## Windows encrypted token storage

Set `GOOGLE_CALENDAR_MCP_TOKEN_PROTECTION=dpapi` in every process reading or writing
the token file, including `npm run auth`.

The file is a versioned JSON envelope holding DPAPI CurrentUser ciphertext.
Plaintext tokens are not accepted or automatically migrated in this mode.
Encryption/decryption errors fail closed without plaintext fallback.
`plaintext` remains the default for compatibility; it is not the hardened setting.

DPAPI is Windows-only and uses the OS's Windows PowerShell executable. Secrets
travel on stdin/stdout, never command-line arguments or temporary plaintext files.
The helper hides its window, has a timeout, and sanitizes process errors.

DPAPI does not defend against malicious programs running as the same Windows
user. Moving tokens to another user or computer requires re-authentication.
OAuth client JSON is not encrypted by this feature: keep it inside the protected
directory, outside Git and shared storage.

## Directory permissions

For an existing dedicated token directory:

```powershell
.\scripts\protect-token-directory.ps1 -Path 'C:\Users\YOUR_USER\.codex\google-calendar'
```

The script disables inherited ACLs and grants full access only to the current
user, SYSTEM, and Administrators. New files inherit those permissions.
It rejects reparse-point directories. It does not rewrite explicit permissions
on existing files; review them separately before storing real credentials.

## Callback and transports

The temporary OAuth listener and local redirect explicitly use `127.0.0.1`.
Web OAuth clients must register the exact callback URLs
`http://127.0.0.1:3500/oauth2callback` through port 3505.
The tunnel option still supports a proxy forwarding to loopback.

The optional HTTP MCP transport retains its independently configured host.
Use STDIO locally; this fix does not make public HTTP MCP deployment safe.

## Dependencies

The lockfile and `gaxios` override select `7.3.1` for all instances, removing
the older `rimraf`/`glob`/`minimatch` chain.
The `@hono/node-server` override selects `2.1.3` to address
`GHSA-rmxm-3fg6-px4f`; this is a major-version override and must be retested
when updating the MCP SDK. The local integration uses STDIO.

```text
npm ci --ignore-scripts
npm audit --omit=dev
npm run lint
npm run build
npm test
```

A clean dependency audit is not proof of security. Live Google authorization and
API behavior require separate verification after user consent.
