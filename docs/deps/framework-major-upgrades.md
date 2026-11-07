# Framework major upgrades (HYP-41)

`.github/dependabot.yml` ignores the semver-major bumps listed below: each
is a hand-driven migration, not a Dependabot merge. This file tracks the
state of each one. Re-run the attempt with the full CI gate
(`format:check`, `lint:check`, `typecheck`, `test`, `build`) in the
affected package before changing a verdict.

Snapshot date: 2026-09-09, peer ranges rechecked 2026-11-07. Node runtime
pinned to **24** (`*/Dockerfile`, `.github/workflows/ci.yml`, `docker-compose.yml`).

| Migration | From -> To | Verdict |
| --- | --- | --- |
| `eslint` + `@eslint/js` (backend) | 9 -> 10 | **landed** - ignore line kept, now blocks 10 -> 11 |
| `eslint` / `@eslint/js` (frontend) | already on 10 | n/a - ignore line kept, blocks 10 -> 11 |
| `@types/node` (both) | 24 -> 26 | **blocked** - runtime is Node 24 |
| `@nestjs/*` (backend) | 11 -> 12 | **landed** - ignore line kept, now blocks 12 -> 13 |
| `typescript` (backend) | 5.9 -> 6.0 | **landed** with Nest 12 |
| `typescript` (backend) | 6 -> 7 | **deferred** - `ts-jest` + `typescript-eslint` cap below 7 |
| `typescript` (frontend) | 6 -> 7 | **deferred** - `typescript-eslint` caps at `<6.1.0` |

---

## eslint 9 -> 10 + @eslint/js 9 -> 10 (backend) - landed

- `npm i -D eslint@10 @eslint/js@10` in `backend/`.
- No config change needed: `backend/eslint.config.mjs` (flat config via
  `tseslint.config()`) resolves unchanged. The frontend already ran
  eslint 10 with the same plugin set (`typescript-eslint` 8,
  `eslint-plugin-sonarjs` 4, `eslint-plugin-prettier` 5), so the flat
  config surface was already proven.
- Full backend gate green (`eslint --version` -> 10.10.0).
- `.github/dependabot.yml`: the `eslint` / `@eslint/js` major-ignore lines
  stay in both ecosystems. They are version-generic - having done 9 -> 10
  by hand, the line now guards 10 -> 11 the same way (an eslint major is
  still a migration, not a Dependabot merge).

## @types/node 24 -> 26 - blocked (runtime, not types)

Types must not lead the runtime. Node is pinned to 24 in
`backend/Dockerfile`, `frontend/Dockerfile` (`node:24-alpine`),
`.github/workflows/ci.yml` (`node-version: '24'`), `docker-compose.yml`.
Bumping `@types/node` alone would type-check against APIs the runtime does
not have.

**Retry trigger:** a deliberate Node 24 -> 26 bump across the two
Dockerfiles + CI + compose, with `@types/node` moved in the same PR.
Kept in the `ignore:` block until then.

## @nestjs/* 11 -> 12 + typescript 5.9 -> 6.0 (backend) - landed

- Every `@nestjs/*` package on 12 in one branch (`common`, `core`,
  `platform-express`, `jwt`, `swagger`, `typeorm`, `testing`, `cli`,
  `schematics`; `config`, `passport` and `throttler` already accepted 12).
- Jest: Nest 12 ships ESM. The test scripts run Jest with
  `NODE_OPTIONS="--experimental-vm-modules"`, so Node 24 loads it through
  `require(esm)`; no `transformIgnorePatterns`, no spec rewritten.
- TypeScript 6.0 (the frontend's version) came with it. TS 6 no longer
  picks up every `@types/*` package, so `tsconfig.json` lists
  `types: ["node", "jest", "multer"]` (the build config drops `jest`),
  and `rootDir` is explicit. `tsconfig.build.json` keeps its build info in
  `dist/`.
- `@nestjs/swagger` 12 ships a patched `js-yaml` (5.5.0): the backend
  override is gone ([`security-overrides.md`](security-overrides.md)).
- Checked on 2026-11-07: the full gate, 316 unit tests, the dev container
  boot with no warning, Bruno (65 requests), Playwright (46 tests),
  `make up-prod`. `/api-docs`, `/api-docs-json` and `/api-docs-yaml`
  answer 200; the OpenAPI document is identical to Nest 11's except that
  `token_type` now carries `enum: ["Bearer"]` (Swagger's CLI plugin reads
  the literal type).
- The `@nestjs/*` ignore line stays in `dependabot.yml` and now guards
  12 -> 13.

## typescript 6 -> 7 (both) - deferred

TS 7 is the native-compiler rewrite. Toolchain support is not there:

- `ts-jest` `29.4.15` peers `typescript: '>=4.3 <7'` - no TS 7.
- `typescript-eslint` `8.72.1` peers `typescript: '>=4.8.4 <6.1.0'`
  - no TS 7, and nothing past 6.0.x either.

Both packages are on TypeScript 6.0, the ceiling `typescript-eslint`
allows, so the `typescript` ignore lines stay in both ecosystems.

**Retry trigger:** `typescript-eslint` and `ts-jest` publish TS 7 support.
Then do it as its own migration (backend + frontend). Kept in the
`ignore:` block.
