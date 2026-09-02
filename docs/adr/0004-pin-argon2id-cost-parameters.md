# Pin argon2id cost parameters explicitly

**Date:** 2026-09-02 · **Status:** accepted · Refines [ADR-0001](0001-hash-passwords-with-argon2id.md)

ADR-0001 left the argon2id cost to the `argon2` library defaults, with a
note to record concrete values if we ever tuned them. We now set them
explicitly in one place (`backend/src/auth/argon2.config.ts`,
`ARGON2_OPTIONS`), applied to every `argon2.hash` call.

```
type        = argon2id
memoryCost  = 19456   (19 MiB)
timeCost    = 2
parallelism = 1
```

## Why

- **No silent drift.** The library default can change on a major bump; a
  hash's cost is a security parameter and should move only on purpose.
- **The login timing defence depends on it.** `AuthService` verifies a
  dummy hash for unknown emails so a missing account costs the same as a
  real one. That only holds if the dummy hash and real hashes share
  identical parameters - a single constant guarantees it.
- **Reproducibility for the defense.** The values (and the reasoning for
  them) are an evaluator question; they belong in an ADR, not in a commit.

## Why these values

OWASP's Password Storage Cheat Sheet lists several argon2id configurations.
We take **m=19 MiB, t=2, p=1** (their second option) rather than the
heavier **m=64 MiB, t=3, p=4** default:

- The backend dev container and the CI runners are memory-constrained; a
  64 MiB-per-hash cost under concurrent logins is a real DoS surface on
  this hardware.
- 19 MiB / t=2 still lands in the ~40-80 ms verify range on the target
  machines - comfortably above a brute-force-friendly cost, in line with
  the "~500 ms is an upper bound, not a target" guidance.

## Consequences

- Existing hashes stay valid: argon2's encoded hash carries its own
  parameters, so `argon2.verify` keeps working across a parameter change.
  Only newly created hashes use the new cost.
- If the deploy target ever gets more headroom, revisit toward the heavier
  profile - a one-line change in `ARGON2_OPTIONS`, plus a note here.
- `argon2.needsRehash(hash, ARGON2_OPTIONS)` can later upgrade old hashes
  on successful login; not wired yet (no legacy hashes exist).
