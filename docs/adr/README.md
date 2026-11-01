# Architecture Decision Records

Short notes recording *structural, hard-to-reverse* technical
decisions and the reasoning behind them - the choices a defense evaluator
might ask us to justify.

- One file per decision: `NNNN-slug.md`, numbered sequentially.
- **An ADR says what is true now.** A decision that no longer holds is not
  rewritten: add a new ADR that supersedes it and mark the old one
  `superseded by ADR-NNNN`, cut down to the decision and why it was
  replaced. A decision that evolves without being reversed is rewritten in
  place as one coherent text, with `**Revised:** <date> (HYP-N)` in its
  header; the commit history keeps the earlier wording. A follow-up,
  consequence or status that went stale (a gap since closed, a file that
  moved) is corrected in place, so no ADR states something false about the
  code.
- Each ADR keeps to context, decision, consequences (plus the options
  weighed when they matter), and stays short: details of the code live in
  the code and its diagrams.
- Only for decisions that are hard to reverse, surprising without context,
  and the result of a real trade-off. Not for routine implementation
  choices.

| # | Decision | Status |
|---|----------|--------|
| [0001](0001-hash-passwords-with-argon2id.md) | Hash passwords with argon2id | accepted, refined by 0004 |
| [0002](0002-jwt-bearer-tokens-for-authentication.md) | JWT bearer tokens for authentication | accepted |
| [0003](0003-validate-the-environment-at-boot.md) | Validate the environment at boot | accepted |
| [0004](0004-pin-argon2id-cost-parameters.md) | Pin argon2id cost parameters explicitly | accepted |
| [0005](0005-lint-complexity-budget.md) | Lint complexity budget as an anti-slop net | accepted |
| [0006](0006-frontend-architecture.md) | Frontend architecture: declarative routing, feature folders, split state | accepted |
| [0007](0007-oauth-identity-linking-and-second-provider.md) | OAuth identity linking, GitHub as the second provider | accepted |
| [0008](0008-client-side-logout-with-short-lived-jwt.md) | Logout is client-side: discard the token, keep the TTL short | superseded by 0011 |
| [0009](0009-nginx-edge-proxy-with-tls.md) | An nginx edge proxy terminates TLS in front of the app | accepted |
| [0010](0010-typeorm-migrations-build-the-schema.md) | TypeORM migrations build the schema, `synchronize` is off | accepted |
| [0011](0011-rotating-refresh-tokens-in-an-httponly-cookie.md) | Refresh tokens rotate in an HttpOnly cookie, and logout revokes the session | accepted |
| [0012](0012-tailwind-css-v4-on-top-of-the-design-tokens.md) | Tailwind CSS v4 on top of the design tokens | accepted |
| [0013](0013-compose-base-with-dev-and-prod-files.md) | Compose: one shared file, a dev file and a prod file | accepted |
| [0014](0014-security-headers-split-between-edge-backend-and-spa.md) | Security headers: the edge, the backend and the SPA server each own a set | accepted |
| [0015](0015-api-keys-per-user-for-the-client-credentials-grant.md) | API keys per user for the client-credentials grant | accepted |
| [0016](0016-profile-pictures-uploaded-and-stored-on-a-volume.md) | Profile pictures are uploaded and stored on a volume | accepted |
| [0017](0017-password-strength-zxcvbn-and-a-french-lexicon.md) | Password strength: zxcvbn plus a full French lexicon, checked by the server | accepted |
| [0018](0018-search-sources-archive-org-and-peertube.md) | Search sources: archive.org and PeerTube | accepted |
| [0019](0019-metadata-tmdb-with-omdb-for-the-imdb-rating.md) | Metadata: TMDb, with OMDb for the IMDb rating | accepted |
| [0020](0020-bittorrent-client-written-by-hand.md) | The BitTorrent client is written by hand, with no library | accepted |
| [0021](0021-transcoding-ffmpeg-to-fragmented-mp4.md) | Transcoding: ffmpeg to a fragmented MP4, on the fly | accepted |

## Planned

Decisions we know we will have to make and justify at the defense. Each
becomes a numbered ADR when the decision is actually taken - not before.

| Trigger | Decision to record |
|---------|--------------------|
| password reset (HYP-34) | reset-token shape: random, single-use, short TTL, hashed at rest (mirrors ADR-0001) |
| streaming | piece selection / download ordering and the threshold at which the stream starts |
| file retention | how "delete if unwatched for 1 month" is enforced (scheduled job) |
| subtitles | the subtitle source (OpenSubtitles, the `.srt` files of archive.org items) and the conversion to WebVTT |
| stream token | how the player's `<video>` is authorised without the access JWT (HYP-14 design note) |
| test database | isolated DB strategy for e2e tests + CI wiring (HYP-27) |
| ORM | TypeORM over Prisma - deliberate, for the internship stack; worth stating explicitly |
