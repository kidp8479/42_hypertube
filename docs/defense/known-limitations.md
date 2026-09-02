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
