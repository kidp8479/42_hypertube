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
  which needs the transactional-email infra. That is **HYP-32**; until it
  lands, a generic 409 (no SQL leak, no hint at which value clashed) is
  the interim, and login / password-reset are already uniform.
- **Real-world:** the 201-vs-409 timing/status oracle is the enumeration
  vector; the fix is the uniform-response + email side-channel above.
- **Cost to fix later:** medium - it is HYP-32 + the register handler
  change, already scoped.
