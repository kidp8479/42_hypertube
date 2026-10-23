# An nginx edge proxy terminates TLS in front of the app

**Date:** 2026-10-23 · **Status:** accepted (phase 1 of HYP-71)

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
- **Phase 1 is additive: the direct ports stay published.** Bruno
  (`make test-api`), the Playwright suite, `make dev-backend` and the CI wait
  loop keep working unchanged, and the suite also passes through the proxy
  (`E2E_BASE_URL=https://localhost:8443`).

## Consequences

- **The backend still trusts every connection as direct.** Behind the proxy
  every request comes from the proxy's address, so the per-IP rate limiter
  would see one client. `trust proxy` is **not** enabled yet on purpose: while
  the direct ports are published, a client could forge `X-Forwarded-For` and
  dodge the limits. It lands with phase 2.
- **Phase 2** (rest of HYP-71): unpublish the direct ports so the proxy is the
  only way in, enable `trust proxy`, move Bruno and the CI e2e job behind it,
  and switch OAuth to HTTPS. That last part changes the callback URLs
  registered at 42 and GitHub, and the state cookie's `Path=/auth` no longer
  matches `/api/auth/...` behind the prefix (ADR-0007).
- **A browser warning** on the self-signed certificate, once per browser.
