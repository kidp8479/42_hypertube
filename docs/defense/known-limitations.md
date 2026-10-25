# Known limitations

Deliberate gaps between "what a real production deployment would do" and
what this school project does. Listed here so they are owned decisions, not
oversights - and so they can be answered directly at the defense.

This file is only for gaps we **choose to live with**. Work that is simply
not done yet belongs in `backlog.md`.

## Swagger UI exposed in every environment

`/api-docs` (and the raw OpenAPI schema) is served unconditionally,
including in a production build.

- **Why:** the defense requires demonstrating the API is RESTful (HYP-15);
  the Swagger UI is that evidence. The project has no real end users, and
  its "production" is the graded deployment.
- **Real-world:** the OpenAPI schema enumerates every route, DTO field and
  validation rule - a map of the attack surface. A public deployment would
  disable it in production, or put `/api-docs` behind auth / an IP
  allowlist, or serve a filtered public document (`SwaggerModule`
  `include:` option) separate from the full internal one.
- **Cost to fix later:** low. Wrap the `SwaggerModule.setup()` call in a
  `NODE_ENV !== 'production'` check, or protect the route.

## Rate-limiting counter is in-process, not shared

`ThrottlerModule` keeps its request counters in the memory of a single
backend process (`app.module.ts`).

- **Why:** the graded deployment runs one backend instance. An in-process
  counter needs no extra service and is enough to blunt brute-force and
  sign-up spam from a single source.
- **Real-world:** behind a load balancer with N instances, each instance
  counts independently, so the effective limit is roughly N times the
  configured one; counters also reset on every restart/deploy. A shared
  store (Redis via `@nest-lab/throttler-storage-redis`) fixes both.
- **Cost to fix later:** low. Add the Redis storage adapter and point it
  at the cache instance; the `@Throttle` limits on the routes stay as they
  are.

## Failed-auth HTTP responses show up in the browser console

Submitting a wrong password makes `POST /api/auth/login` return **401**, and
the browser prints a red `POST ... 401 (Unauthorized)` line in the console.
The same happens for every other legitimate non-2xx the API returns (403 on
editing another user's profile, 404, 400 on invalid input).

- **Why:** 401 is the correct REST status for bad credentials, and the
  subject requires correct HTTP codes (HYP-15). The frontend handles the
  response cleanly - `apiFetch` (`frontend/src/lib/api.ts`) throws a typed
  `ApiError`, the caller catches it and renders a message; there is no
  uncaught exception and no `console.error` from our code. The console line
  is emitted by the browser's own network layer for any failed `fetch`/XHR
  and cannot be suppressed from JavaScript.
- **Real-world:** identical - production SPAs log the same line on a failed
  login. Error monitoring filters by exception type, not by the network log.
- **Cost to "fix":** would mean returning `200` + an error body for auth
  failures, which breaks REST semantics and the subject's HTTP-code
  requirement. Not worth it - this is correct behaviour.

## Registration still confirms whether an email is registered

`POST /users` with an already-registered email returns **409** (a taken
username does too). A free email returns 201. That observable difference
lets someone probe which emails have an account.

- **Why (for now):** a fully enumeration-safe registration returns the
  same response either way and tells the real owner by email instead -
  which needs the transactional-email infra (**HYP-32**). The
  uniform-response change itself is **HYP-50**; until both land, a
  generic 409 (no SQL leak, no hint at which value clashed) is the
  interim. Login is already uniform; password reset is not built yet and
  must land uniform too (HYP-34).
- **Real-world:** the 201-vs-409 timing/status oracle is the enumeration
  vector; the fix is the uniform-response + email side-channel above.
- **Cost to fix later:** medium - HYP-32 (mail infra) + HYP-50 (the
  register handler change), both already scoped.

## OAuth exchange codes live in process memory

The single-use codes that carry an OAuth login from the callback to the
SPA (`OAuthExchangeService`, ADR-0007) are kept in an in-memory `Map`.

- **Why:** one backend instance, 60-second codes. A shared store would be
  a new service for a value that lives a minute.
- **Real-world:** a restart drops in-flight codes (the user retries the
  login), and with N instances a code minted on one is unknown to the
  others unless the load balancer pins the browser.
- **Cost to fix later:** low. Move the `Map` to Redis with a key TTL, same
  as the throttler storage above.

## An access token cannot be revoked before it expires

Logout and a detected token theft end the **session**: the refresh token is
revoked, so nothing can renew the access token (ADR-0011). An access token that
was already copied still works until it expires, 15 minutes by default
(`JWT_EXPIRES_IN`).

- **Why:** access tokens are stateless on purpose, so an ordinary request needs
  no database lookup (ADR-0002). Checking a blocklist on every request would
  undo that for a 15 minute window.
- **Real-world:** the same trade-off, most production systems accept it.
- **Cost to fix later:** low to medium. A `jti` blocklist read by `JwtAuthGuard`;
  lowering `JWT_EXPIRES_IN` shrinks the window.

## An email change is not verified

`PATCH /users/:id` takes a new email without checking that the user owns it.

- **Why:** verifying an address needs the transactional email (HYP-32), and
  the confirmed change-email flow is HYP-39. Until then the subject's
  documented field works, behind `currentPassword`, and the risk is
  contained: the new email is marked unverified, so the first provider
  sign-in with that address claims the account for its verified owner
  (ADR-0007, amendment 2026-10-25).
- **Real-world:** an email change is normally confirmed from the new address.
- **Cost to fix later:** medium, with HYP-39 (a confirmation link to the new
  address).

## Only recent browsers are supported

The SPA runs on the latest Firefox and Chrome, as the subject asks, but not
on the much older minimums of the marking sheet (Firefox 41, Chrome 46).

- **Why:** Tailwind CSS v4 (ADR-0012) relies on modern CSS (cascade layers,
  `@property`, `color-mix()`) and documents Chrome 111, Safari 16.4 and
  Firefox 128 as its floor. Browsers from 2015 also lack what React 19 and
  the Vite build output assume.
- **Real-world:** a public product would check its audience's browser share
  before choosing, and add fallbacks or a "browser not supported" page.
- **Cost to fix later:** high. Supporting 2015 browsers would mean dropping
  Tailwind v4 for v3 and transpiling down the whole bundle. Not worth it for
  a project graded on current browsers.

## Profile pictures are linked, not hosted

A profile picture is an https address the user types (`PATCH /users/:id`),
shown as is in the header and on the profile pages.

- **Why:** the subject asks for a profile picture, not for an image store;
  an upload with validation, resizing and storage is HYP-38's work.
- **Real-world:** the image host sees the IP address of everyone who views
  that profile (a tracking pixel), and the picture can change or disappear
  behind the same address. `referrerPolicy="no-referrer"` keeps the page
  address from leaking, not the IP. A public product would upload and serve
  the images itself.
- **Cost to fix later:** medium. Upload, check the type and size, store the
  file, serve it from the app; the column then holds a path instead of a URL.
