# Architecture Decision Records

Short, append-only notes recording *structural, hard-to-reverse* technical
decisions and the reasoning behind them — the choices a defense evaluator
might ask us to justify.

- One file per decision: `NNNN-slug.md`, numbered sequentially.
- **Immutable.** A decision that no longer holds is not rewritten: add a new
  ADR that supersedes it and mark the old one `superseded by ADR-NNNN`.
- Only for decisions that are hard to reverse, surprising without context,
  and the result of a real trade-off. Not for routine implementation
  choices.

| # | Decision | Status |
|---|----------|--------|
| [0001](0001-hash-passwords-with-argon2id.md) | Hash passwords with argon2id | accepted |
| [0002](0002-jwt-bearer-tokens-for-authentication.md) | JWT bearer tokens for authentication | accepted |
| [0003](0003-validate-the-environment-at-boot.md) | Validate the environment at boot | accepted |
| [0004](0004-pin-argon2id-cost-parameters.md) | Pin argon2id cost parameters explicitly | accepted |

## Planned

Decisions we know we will have to make and justify at the defense. Each
becomes a numbered ADR when the decision is actually taken - not before.

| Trigger | Decision to record |
|---------|--------------------|
| logout endpoint (HYP-10) | one-click logout with a stateless JWT: client-side discard vs refresh-token rotation vs blocklist |
| password reset (HYP-10) | reset-token shape: random, single-use, short TTL, hashed at rest (mirrors ADR-0001) |
| OAuth login | second provider choice, and how an OAuth identity links to a local `User` (email match vs dedicated `oauth_account` table) |
| BitTorrent client | from-scratch protocol vs allowed low-level libs (`bencode`, `parse-torrent`) - the eliminatory "no ready-made streaming" constraint, spelled out |
| streaming | piece selection / download ordering and the threshold at which the stream starts |
| transcoding | on-the-fly ffmpeg, which container/codecs, cache of converted files |
| file retention | how "delete if unwatched for 1 month" is enforced (scheduled job) |
| metadata provider | OMDb vs TMDb |
| search sources | the two legal external sources retained |
| schema management | `synchronize: true` -> TypeORM migrations, and when the cutover happens |
| test database | isolated DB strategy for e2e tests + CI wiring (HYP-27) |
| ORM | TypeORM over Prisma - deliberate, for the internship stack; worth stating explicitly |
