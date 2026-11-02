# Known limitations

Gaps between what a real production deployment would do and what this
school project does, **chosen**, so they can be answered directly at the
defense. Work simply not done yet is a Linear issue, not an entry here.

Each entry: what it is, why we accept it, what a real product would do,
and the cost to fix.

## Swagger UI exposed in every environment

`/api-docs` and the raw OpenAPI schema are served in the production build
too.

- **Why:** the Swagger UI is the RESTful-API evidence the defense asks for
  (HYP-15); the graded deployment has no real end users.
- **Real-world:** the schema maps the attack surface (every route, field and
  rule). It would be disabled in production, put behind auth or an IP
  allowlist, or filtered (`SwaggerModule` `include:`).
- **Cost:** low. Wrap `serveApiDocs()` (`config/swagger.config.ts`) in a
  `NODE_ENV !== 'production'` check, or protect the route.

## In-process state: rate-limit counters and OAuth exchange codes

`ThrottlerModule` counts requests in the memory of the backend process
(`app.module.ts`), and the 60-second OAuth exchange codes
(`OAuthExchangeService`, ADR-0007) live in an in-memory `Map`.

- **Why:** the graded deployment runs one backend instance; a shared store
  would be a new service for values that live a minute.
- **Real-world:** with N instances each counts on its own (roughly N times
  the limit), a code minted on one is unknown to the others unless the load
  balancer pins the browser, and a restart resets counters and drops
  in-flight codes (the user retries the login).
- **Cost:** low. Redis for both: `@nest-lab/throttler-storage-redis` for the
  counters (the `@Throttle` limits stay), a key with a TTL for the codes.

## Failed requests show up in the browser console

A wrong password makes `POST /api/auth/login` answer **401**, and the browser
prints a red `POST ... 401 (Unauthorized)` line. Every legitimate non-2xx
does the same (403 on another user's profile, 404, 400).

- **Why:** these are the correct REST statuses, which the subject requires
  (HYP-15). Our code handles them: `apiFetch` (`frontend/src/lib/api.ts`)
  throws a typed `ApiError`, the caller shows a message, and nothing is
  uncaught or sent to `console.error`. The line comes from the browser's own
  network layer and cannot be suppressed from JavaScript.
- **Real-world:** identical on every SPA.
- **Cost to "fix":** answering `200` with an error body, which breaks REST
  and the subject's status-code requirement. Not done.
- **Tests:** an e2e spec that fails a request on purpose lists its status
  and path (`trackConsoleIssues` in `frontend/e2e/console-issues.ts`); any
  other red line, an unexpected 404 or 500 included, fails the spec.

## Firefox logs a font download cut short by a reload

Reloading or leaving a page in Firefox while its IBM Plex fonts are still
downloading prints `downloadable font: download failed ...
status=2152398850` (`NS_BINDING_ABORTED`: the navigation cancelled the
request).

- **Why:** the browser logs it for any interrupted `@font-face` download.
  Measured (HYP-101): with the font slowed to 1.5 s, a reload mid-download
  logs it on both builds; with no delay, 0 times in 10. On the defense
  machine the fonts load from localhost in milliseconds.
- **Tests:** the e2e specs reload within milliseconds and hit it 3 runs in
  36, so they wait for `document.fonts.ready` first (`fontsLoaded` in
  `frontend/e2e/console-issues.ts`) and still fail on any other console line.
- **Cost to "fix":** inline the four fonts in base64 (about 100 KB more CSS
  on every first load). Not worth it.

## Registration confirms whether an email is registered

`POST /users` answers **409** on a taken email (or username) and 201 on a
free one, so someone can probe which emails have an account.

- **Why:** an enumeration-safe registration answers the same either way and
  tells the real owner by email, which needs the mail infrastructure
  (HYP-32) and the handler change (HYP-50). Until then the 409 is generic
  (no SQL, no hint at which value clashed) and the route is throttled.
  Login is already uniform; the password reset (HYP-34) must land uniform.
- **Real-world:** the uniform answer plus the email above.
- **Cost:** medium, both tickets already scoped.

## An access token cannot be revoked before it expires

Logout and a detected theft end the **session**: the refresh token is revoked,
so nothing renews the access token (ADR-0011). A copy already made works until
it expires, 15 minutes by default (`JWT_EXPIRES_IN`). Same for a token bought
with an API key that is then revoked (ADR-0015).

- **Why:** no per-token state is kept (ADR-0002). A request reads one user
  column, which ends every token of an account at once (an OAuth claim,
  ADR-0007), but logout ends one session, not all of them: that would need a
  per-token blocklist written at every logout, for a 15 minute window.
- **Real-world:** the same trade-off, accepted by most production systems.
- **Cost:** low to medium, a `jti` blocklist read by `JwtAuthGuard`; a
  shorter `JWT_EXPIRES_IN` shrinks the window.

## An email change is not verified

`PATCH /users/:id` takes a new email without proving the user owns it.

- **Why:** verification needs the mail infrastructure (HYP-32) and the
  confirmed flow is HYP-39. Meanwhile the change needs `currentPassword`, and
  the new email is marked unverified, so the first provider sign-in with that
  address claims the account for its verified owner (ADR-0007, "Linking to
  an existing account").
- **Real-world:** a confirmation link sent to the new address.
- **Cost:** medium, with HYP-39.

## Only recent browsers are supported

The SPA runs on the latest Firefox and Chrome, as the subject asks, not on
the marking sheet's much older minimums (Firefox 41, Chrome 46).

- **Why:** Tailwind CSS v4 (ADR-0012) needs cascade layers, `@property` and
  `color-mix()` (its floor: Chrome 111, Safari 16.4, Firefox 128), and React
  19 and the Vite output assume more than 2015 browsers offer.
- **Real-world:** check the audience's browsers first; add fallbacks or a
  "browser not supported" page.
- **Cost:** high (Tailwind v3 and a transpiled-down bundle). Not worth it for
  a project graded on current browsers.

## Profile pictures keep their metadata

An upload is stored as sent (ADR-0016): its type is checked from its first
bytes, but it is not re-encoded.

- **Why:** re-encoding needs an image library with a native build (`sharp`)
  for a gain the subject does not grade.
- **Real-world:** a phone photo carries EXIF data, its location included,
  readable by anyone who can open it. A public product re-encodes every
  upload, which also drops anything hidden after the image data.
- **Cost:** low. Re-encode in `ProfilePictureStore.storeFor` before the
  write, and add `sharp` to both backend images.

## The dev stack's SPA has no Content-Security-Policy

The SPA's CSP is sent by the frontend's prod nginx (`frontend/nginx.conf`,
ADR-0014). In dev (`make up`) Vite serves it without one; the API and
`/api-docs` have helmet's CSP in both.

- **Why:** Vite's dev page has an inline react-refresh script and injects CSS
  as `<style>` tags. A policy allowing them (`unsafe-inline`) protects
  nothing; one refusing them breaks hot reload.
- **Real-world:** only the prod build is deployed, and it enforces the policy.
- **Cost:** the CI e2e suite runs the dev stack (the full suite does not fit
  under the prod rate limits). A change that adds a new kind of resource (an
  inline script, a font or image from another host, the video player's
  `media-src`) is checked on `make up-prod` with the console open: a CSP
  violation is a console error.
