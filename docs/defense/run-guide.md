# Run guide (defense)

The shortest path from a fresh checkout to the graded app on the evaluation
machine. The developer setup with the dev stack and the test suites is in
[`onboarding.md`](../onboarding.md).

## Needs

Docker with Compose (or rootless Podman with `podman-compose`) and GNU Make.
Node.js is only needed to run the test suites from the host.

## Steps

```sh
git clone https://github.com/kidp8479/42_hypertube.git && cd 42_hypertube
cp .env.example .env    # then fill it, below
make up-prod            # builds and starts the prod stack
```

Then open **https://localhost:8443** and accept the self-signed certificate
once (`http://localhost:8080` redirects there).

## The `.env`

Each variable has its comment in `.env.example`. The app refuses to boot on a
missing value or a placeholder left as is, and names it.

| Variables | What to put |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | any values: the database is created with them |
| `JWT_SECRET` | 32 characters at least, random: the command is in `.env.example` |
| `FORTYTWO_*` | an app registered on the 42 intra, redirect URI `https://localhost:8443/api/auth/42/callback` |
| `GITHUB_*` | a GitHub OAuth app, callback `https://localhost:8443/api/auth/github/callback` |
| the rest | the defaults are right (`JWT_EXPIRES_IN=15m`, ports 8443 and 8080) |

The prod stack pins the rate-limit multiplier to 1: the real limits apply.

## Checks to show

| What | Where |
|---|---|
| The app | `https://localhost:8443`: register, sign in with a password, 42 or GitHub |
| The REST API and its codes | Swagger at `https://localhost:8443/api-docs`; the Bruno collection asserts every status (`make test-api`, on the dev stack: the prod limits answer 429 halfway through a run) |
| Security headers and CSP | `curl -skI https://localhost:8443/` |
| A clean console | the browser's DevTools on every page (only the network lines of a deliberate 4xx, `known-limitations.md`) |
| The quality gates | [`ci.md`](ci.md): the CI checks of any merged PR on GitHub |

## Stop, reset

| Command | Effect |
|---|---|
| `make down` | stop, keep the data |
| `make wipe-db` | delete the database (accounts included); the next `up` starts empty |
| `make fclean` | remove containers, volumes and the images built here |

`make help` lists every target.
