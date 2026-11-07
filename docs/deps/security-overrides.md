# Security overrides

`overrides` in a `package.json` force a patched version of a transitive
dependency that a package we use pins to a vulnerable one. Each entry below
says why it exists and when to drop it. Set up for HYP-150, when Dependabot
alerts were turned on (2026-11-02).

Rule: stay in the same major when a patched one exists. A major jump only
after checking how the dependent uses it, with every suite green. Never
`npm audit fix --force`: it downgrades the package that pins the old version
(it offered Bruno 3.x).

## Root tooling (`package.json`): the Bruno CLI tree

`@usebruno/cli` 4.3.0 pins old versions. It only runs locally and in CI
against our own stack (`make test-api`), never in the app.

| Override | Advisory fixed | Note |
|---|---|---|
| `axios` `^1.20.0` | prototype pollution gadgets | same major |
| `form-data` `^4.0.6` | CRLF injection in multipart | same major |
| `js-yaml` `^4.3.2` | CPU use on crafted merge keys | same major |
| `yaml` `^2.8.3` | stack overflow on deep nesting | same major |
| `uuid` `^11.1.1` | missing buffer bounds check | 10 to 11; Bruno exposes `uuid` to request scripts, which the collection does not have |
| `csv-parse` `^7.0.2` | prototype replacement | 5 to 7; only read for a CSV-driven run (`--csv-file-path`), checked to still work |
| `@faker-js/faker` `^10.4.1` | code execution through `helpers.fake` | 9 to 10; only behind the `{{$random...}}` variables, which the collection does not use |

Proof: the whole collection (65 requests) and its HTML report run green.
Drop an entry once a Bruno release ships the patched version itself.

## Backend and frontend

| Override | Where | Note |
|---|---|---|
| `minimatch` `^11.0.1` | backend, frontend | ReDoS in glob patterns. Only build tooling uses it (ESLint, Jest, Compodoc), on our own config. 3/10 to 11: lint still catches a planted error, tests, build and `make doc` pass |

## Left on purpose

- `deepmerge` (backend, low): the advisory covers every version from 4.2.0,
  there is no patched release. Only Jest uses it, on our own config.
- `glob` 10 (backend dev tooling, moderate): the patched line is 14, under
  Jest's coverage plugin (`babel-plugin-istanbul`); a forced jump would be
  a larger risk than a timeout bypass in a build tool.

`npm audit --omit=dev` is clean in both packages: nothing above reaches the
running app.
