# Compose: one shared file, a dev file and a prod file

**Date:** 2026-10-31 · **Status:** accepted

Until HYP-17 the only compose file targeted the `dev` stages: hot reload,
bind-mounted source, devDependencies, the Vite dev server behind the edge
proxy. The `prod` stages of both Dockerfiles existed but nothing built them.
The stack is now three files:

- `docker-compose.yml`: what both stacks share (services, environment,
  database, proxy, certificates). Never run alone.
- `docker-compose.dev.yml`: dev. The `dev` targets, the bind-mounted
  source and the `node_modules` / `dist` volumes. `make up` names it; CI sets
  `COMPOSE_FILE` to the shared file plus this one.
- `docker-compose.prod.yml`: prod. The `prod` targets: the backend runs the
  compiled `dist/` with production dependencies only and `NODE_ENV=production`
  (with `THROTTLE_LIMIT_MULTIPLIER` pinned to 1), the frontend is the built SPA
  served as static files by nginx. `make up-prod`.

The edge proxy reaches the SPA through `PROXY_FRONTEND_UPSTREAM`
(`frontend:5173` in dev, `frontend:80` in prod).

## Why

- **One place per setting.** A backend variable is declared once, in the
  shared file, so the rule "a new env variable touches four places"
  (`CLAUDE.md`) does not become five. A standalone prod file would copy every
  service and drift.
- **Removing is not possible in an override.** Compose merges an override
  into the file below it and cannot drop a bind mount portably (`!reset` is
  recent Docker Compose and not a given in `podman-compose`). So the dev-only
  mounts live in the dev file, not in the shared file.
- **`make up` is unchanged.** The everyday command keeps building the dev
  stack; prod is opt-in.
- **Static files behind nginx, not `vite preview`.** Vite documents its
  preview server as a local check, not a production server. nginx already
  serves the built SPA in the frontend's `prod` stage, with a fallback to
  `index.html` for client-side routes.
- **Files named explicitly in the Makefile.** Podman and Docker then build the
  same stack. `docker-compose.override.yml`, the name Compose would pick up on
  its own, stays free for a personal, git-ignored override; the Makefile adds
  it on top of either stack when present.

## Consequences

- Both stacks share one compose project, so `make up-prod` replaces the dev
  containers and `make up` switches back. The database volume is the same.
- Each target builds its own image name (`hypertube-backend:dev`,
  `hypertube-backend:prod`, same for the frontend): with one name for both,
  `make up` would start whichever image was built last. `make fclean` removes
  them by name, since `--rmi local` skips named images.
- CI runs its suites on the dev stack and also builds the prod images, so a
  Dockerfile change that breaks only prod fails the PR.
- The prod stack enforces the real rate limits: running the Bruno collection
  against it hits the login limit (one 429 out of 44 requests), as it should.
- A real deployment still needs its own `.env` (secrets, `FRONTEND_ORIGIN`,
  OAuth callback URLs, `PROXY_HSTS_MAX_AGE`) and a real certificate mounted
  into `proxy_certs`.
