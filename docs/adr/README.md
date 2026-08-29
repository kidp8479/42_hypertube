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
