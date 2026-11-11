# OAuth loopback callback

The temporary callback server binds explicitly to `127.0.0.1`, retains PKCE and
state validation, and uses a fixed local base rather than the request Host header.
Its local redirect is `http://127.0.0.1:<port>/oauth2callback`.

Desktop OAuth clients support literal loopback addresses. Web OAuth clients need
the exact callback URLs for ports 3500 through 3505 registered. Tunnels can still
forward to the loopback listener with `GOOGLE_OAUTH_REDIRECT_BASE`.

The independently configured HTTP MCP transport is unchanged. This is not a
general public HTTP deployment hardening change.
