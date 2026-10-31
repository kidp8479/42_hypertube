# Security headers: the edge, the backend and the SPA server each own a set

**Date:** 2026-10-31 · **Status:** accepted

Three servers can put headers on a response: the edge proxy (every
response), the backend (`/api/*`, `/api-docs`) and the frontend's static
nginx (the built SPA, prod only). A header set by two of them reaches the
browser twice. Each header now has one owner:

| Header | Owner | Value |
|---|---|---|
| `Strict-Transport-Security` | edge | `max-age=${PROXY_HSTS_MAX_AGE}`, 0 by default (ADR-0009) |
| `X-Content-Type-Options` | edge | `nosniff` |
| `X-Frame-Options` | edge | `DENY` |
| `Content-Security-Policy` of the API and `/api-docs` | backend (helmet) | helmet's defaults, `frame-ancestors 'none'`, no `upgrade-insecure-requests` |
| The rest of helmet (`Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, ...) | backend (helmet) | helmet's defaults |
| `Content-Security-Policy` of the SPA | frontend nginx (`frontend/nginx.conf`) | `default-src 'self'`, no inline script or style, `img-src 'self' https: data:`, `frame-ancestors 'none'` |

helmet is configured in `backend/src/config/security-headers.config.ts`
with HSTS, frame options and nosniff turned off.

## Why

- **helmet on the backend, not only nginx.** The backend also runs without
  the proxy (`make dev-backend`), and helmet keeps its headers in step with
  current advice without hand-written nginx lines.
- **The edge keeps the three headers it already set.** They have to cover
  every response, the SPA included, and helmet's HSTS default (180 days)
  would pin `localhost` to HTTPS and break the direct dev ports (ADR-0009).
- **The SPA's CSP lives in the frontend's prod nginx, not the edge.** The
  edge template is shared by dev and prod, and the dev page Vite serves has
  an inline react-refresh script and injects CSS as `<style>` tags: a policy
  strict enough to matter would break dev. The build has one script file,
  one stylesheet and bundled fonts, so it takes the strict policy with no
  `unsafe-inline`. A `<meta>` tag in `index.html` would reach dev too, and
  cannot carry `frame-ancestors`.
- **Enforced, not report-only.** A report-only policy still logs every
  violation in the console, which the defense forbids. The policy shipped
  enforcing, after the e2e suite (which fails on any console error) passed
  under it in Chromium and Firefox.
- **`img-src` allows any https host.** Profile pictures are served by the
  app itself (ADR-0016); the https allowance is kept for the movie covers,
  which come from the metadata provider's host (HYP-13).

## Consequences

- **The dev stack has no SPA CSP.** The e2e suite in CI runs the dev stack,
  so a change that breaks the policy (an inline script, a CDN font) shows up
  only on the prod build: run `make up-prod` and click through before a
  merge that adds a new kind of resource (`known-limitations.md`). CI checks
  only that the prod image sends the header.
- **The video page (HYP-14) will need `media-src`** (probably `'self'
  blob:`), and movie posters from a metadata provider fit the current
  `img-src`.
- **An `add_header` inside a `location` drops the inherited ones** in nginx:
  the headers stay at `server` level in both nginx configs.
