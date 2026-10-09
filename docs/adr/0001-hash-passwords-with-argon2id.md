# Hash passwords with argon2id

**Date:** 2026-08-28 · **Status:** accepted · Refined by [ADR-0004](0004-pin-argon2id-cost-parameters.md)

The subject forbids storing plain-text passwords (eliminatory) but does not
name an algorithm. We hash every password with **argon2id** (via the
`argon2` npm package) in `UsersService` before it reaches the repository,
and verify with `argon2.verify` at login.

## Considered options

- **bcrypt** — ubiquitous, battle-tested, but capped at 72 bytes of input
  and only tunable on CPU cost, not memory. Not resistant to GPU/ASIC
  cracking the way memory-hard functions are.
- **scrypt** — memory-hard, in Node core, but fiddly parameter tuning and
  less common in the NestJS ecosystem.
- **argon2id** — winner of the Password Hashing Competition and **OWASP's
  current first choice**. Hybrid of argon2i (side-channel resistant) and
  argon2d (GPU-cracking resistant). Memory-hard, three independent cost
  parameters (memory, iterations, parallelism).

## Consequences

- `argon2` is a native addon (node-gyp build). Postinstall scripts are
  opt-in in this repo (`allowScripts` in `package.json`), so the build is
  explicitly whitelisted. CI images and the dev container must be able to
  compile it.
- The cost parameters are no longer the library defaults: they are pinned
  in `ARGON2_OPTIONS` (m = 19 MiB, t = 2, p = 1), see ADR-0004 for the
  values and the reasoning.
- The `User.password` column is `varchar(255)` and `select: false` — the
  argon2id encoded hash (~97 chars) fits, and it never leaves the DB by
  accident.
- Same hashing approach is reused for password-reset tokens — to be
  recorded in its own ADR when that flow is built.
