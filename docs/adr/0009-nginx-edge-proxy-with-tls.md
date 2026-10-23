# An nginx edge proxy terminates TLS in front of the app

**Date:** 2026-10-23 · **Status:** accepted

The stack served plain HTTP and had no single entry point: the backend and
the frontend each published their own host port, and in dev Vite proxied
`/api`. A `proxy` container (nginx) now faces the browser: it terminates TLS,
redirects HTTP to HTTPS, adds the edge security headers, and routes `/` to
the frontend, `/api/*` to the backend (prefix stripped, the same contract as
the Vite dev proxy) and `/api-docs` to the backend.

## Why

- **HTTPS is the baseline for the things this app does.** Tokens, a login
  form and an OAuth handshake should not cross the network in clear, and the
  state cookie only gets `Secure` over TLS.
- **One origin.** The browser talks to one host, so the SPA and the API share
  an origin in every environment (no CORS in practice), which is what the Vite
  proxy already imitated in dev.
- **A place for edge concerns.** TLS, HSTS and frame options belong at the
  edge, not in each service. The Content-Security-Policy and helmet stay in
  HYP-49 and can build on it.
- **nginx over Caddy and Traefik.** Caddy gets certificates automatically,
  but nginx is already the frontend's production server, is the one to
  explain at the defense, and Traefik's label-based discovery is more than
  three services need. The price is managing the certificate by hand.

## Decisions inside it

- **Self-signed certificate in dev and CI**, minted at first start by
  `proxy/docker-entrypoint.d/05-self-signed-cert.sh` into the `proxy_certs`
  volume, never committed. A real certificate is a mount of `tls.crt` and
  `tls.key` on that volume, no config change.
- **Non-privileged ports** (8080 redirect, 8443 TLS, configurable): rootless
  Podman at school cannot bind 80 and 443.
- **HSTS is off by default** (`PROXY_HSTS_MAX_AGE=0`). HSTS is keyed on the
  host name, not the port: sent from `https://localhost` it would make the
  browser upgrade every other localhost port (the direct backend and Vite
  ports) to HTTPS and break them. Set it only on a real deployment.
- **Referrer-Policy is not set at the edge.** The backend sets
  `no-referrer` on the OAuth callback; a second value from nginx would be a
  duplicate header.
- **The proxy is the only way in.** The backend and the frontend publish no
  host port (the database is published only by a personal override, for a DB
  client). Bruno (`make test-api`), the Playwright suite and the CI wait loop
  go through `https://localhost:8443`. Host dev without containers
  (`make dev-backend`, `make dev-frontend`) is unchanged: the Vite proxy and
  the direct backend port are still what it uses.
- **`trust proxy` is on** (`app.set('trust proxy', 1)`, `trust-proxy.config.ts`).
  It was left off while the direct ports were published, because a client
  could then forge `X-Forwarded-For` and pick the address the rate limiter
  keys on. With the proxy as the single hop, the backend takes the address
  nginx appended and ignores whatever the client put in front of it (a spec
  pins that).
- **OAuth over HTTPS.** The callback URLs are
  `https://localhost:<port>/api/auth/<provider>/callback`, registered at 42
  and GitHub, and `FRONTEND_ORIGIN` is the proxy's origin. The proxy sends
  `X-Forwarded-Prefix: /api` so the state cookie is scoped to the path the
  browser sees (`/api/auth`), and the cookie is `Secure` whenever the request
  came in over HTTPS (ADR-0007).

- **The redirect never trusts the Host header.** The HTTP to HTTPS redirect
  goes to `PROXY_SERVER_NAME` (default `localhost`) and the published HTTPS
  port; building it from `$host` let a client make the proxy redirect to any
  site (found by the security review, HYP-73).
- **The access log has no query string and no Referer.** An OAuth callback
  carries the provider's `code` and `state` in its query, and the SPA's
  `/oauth/callback?code=...` page would repeat our single-use exchange code in
  the Referer of every asset request. The `log_format` keeps the path only.
  Residual: nginx's *error* log always quotes the request line, so a callback
  that fails upstream (backend down) still writes its query there. The codes
  are single-use and short-lived, and this only happens on a proxy error.
- **`X-Forwarded-For` is set in every location** through one shared snippet
  (`proxy/snippets/proxy-headers.conf`), not only on `/api/`: the backend takes
  the address nginx appended, so no location may forward the client's header
  as it is.

## Consequences

- **A browser warning** on the self-signed certificate, once per browser.
- **Existing `.env` files need an update**: `FRONTEND_ORIGIN`, the two
  `*_CALLBACK_URL`, and the redirect URIs registered at the providers. The
  old `HYPERTUBE_BACKEND_PORT` and `HYPERTUBE_FRONTEND_PORT` no longer do
  anything.
- **One more container to explain and keep in step**: a route added to the
  backend is reachable through `/api/` with no proxy change, but a new
  top-level path (like `/api-docs`) needs its own `location`.
