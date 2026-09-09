# Framework major upgrades (HYP-41)

`.github/dependabot.yml` ignores the semver-major bumps listed below: each
is a hand-driven migration, not a Dependabot merge. This file tracks the
state of each one. Re-run the attempt with the full CI gate
(`format:check`, `lint:check`, `typecheck`, `test`, `build`) in the
affected package before changing a verdict.

Snapshot date: 2026-09-09. Node runtime pinned to **24**
(`*/Dockerfile`, `.github/workflows/ci.yml`, `docker-compose.yml`).

| Migration | From -> To | Verdict |
| --- | --- | --- |
| `eslint` + `@eslint/js` (backend) | 9 -> 10 | **landed** - ignore line kept, now blocks 10 -> 11 |
| `eslint` / `@eslint/js` (frontend) | already on 10 | n/a - ignore line kept, blocks 10 -> 11 |
| `@types/node` (both) | 24 -> 26 | **blocked** - runtime is Node 24 |
| `@nestjs/*` (backend) | 11 -> 12 | **deferred** - `@nestjs/throttler` has no Nest 12 release |
| `typescript` (backend) | 5.9 -> 7 | **deferred** - `ts-jest` + `typescript-eslint` cap below 7 |
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

## @nestjs/* 11 -> 12 (backend) - deferred

Attempted the coordinated bump of every `@nestjs/*` package to 12.

**Hard blocker:** `@nestjs/throttler` latest is `6.5.0`, peers cap at
`@nestjs/common: ^11`. There is no Nest 12 release. Throttler drives the
auth rate-limiting required by the security checklist, so it cannot be
dropped or left un-upgraded against Nest 12.

The rest of the ecosystem is ready: `@nestjs/config` 12, `jwt` 12.0.1,
`swagger` 12.0.1, `typeorm` 12.0.1, `passport` 12, `mapped-types` 12 all
declare a `^12` peer.

**Forced probe** (`npm i --legacy-peer-deps @nestjs/*@12`, throttler left
at 6.5.0), for reference only - reverted:

- `nest build` : passes.
- `tsc --noEmit` : passes.
- `jest` : **12 of 14 suites fail to run** -
  `Must use import to load ES Module: .../@nestjs/common/index.js`.
  Nest 12 ships ESM; ts-jest loads it as CJS. Fix path: widen
  `jest.transformIgnorePatterns` in `backend/package.json` (already
  carries `@nestjs/(config|passport)`), or move the jest config to ESM,
  or Node >= 24.9 `require(esm)`.

**Retry trigger:** `@nestjs/throttler` publishes a release with a `^12`
peer. Then: bump all `@nestjs/*` together, widen `transformIgnorePatterns`
for the ESM subpackages, re-run the full gate. Kept in the `ignore:` block.

## typescript 5.9 -> 7 (backend) / 6 -> 7 (frontend) - deferred

TS 7 is the native-compiler rewrite. Toolchain support is not there:

- `ts-jest` latest `29.4.12` peers `typescript: '>=4.3 <7'` - no TS 7.
- `typescript-eslint` latest `8.70.0` peers `typescript: '>=4.8.4 <6.1.0'`
  - no TS 7, and nothing past 6.0.x either.

Frontend is already on `typescript@~6.0.3` - that is the ceiling its
`typescript-eslint@8.68` allows, so the frontend `ignore:` line on
`typescript` majors stays until typescript-eslint moves.

**Backend to TS 6.0** (intermediate, matching the frontend) was probed and
reverted: `tsc --noEmit` produced ~330 errors, all
`Cannot find name 'describe' / 'it' / 'expect'` - TS 6 no longer
auto-includes `@types/jest` globals the way 5.x did. Fixable with an
explicit `"types": ["node", "jest"]` (or a test-only tsconfig), but low
value while 6.1+/7 are still blocked by the linter.

**Retry trigger:** `typescript-eslint` and `ts-jest` publish TS 7 support.
Then do it as its own migration (backend + frontend), starting with the
tsconfig `types` fix. Kept in the `ignore:` block.
