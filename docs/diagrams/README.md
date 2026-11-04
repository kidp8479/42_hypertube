# Diagrams

Maintained diagrams of the system, kept in sync with the code as it
evolves. Start here to see how a flow works before reading its code.

## Index

One page per domain. Each page opens with a Mermaid **overview** of the
whole domain, then one detail diagram per flow. GitHub renders Mermaid
directly, so there is nothing to export.

| Domain | Page | Covers |
|---|---|---|
| Auth | [`auth.md`](auth.md) | overview, register (frontend), the account form submit flow (frontend), SPA session states, OAuth handshake, OAuth identity linking, OAuth callback page (frontend), refresh and rotation, logout, the SPA keeping the session, email and password change with the profile page (frontend), login rate limits, API keys and `POST /oauth/token` with the profile section (frontend) |
| Language | [`i18n.md`](i18n.md) | overview, which language wins, switching, registration |
| Network | [`network.md`](network.md) | overview (edge proxy, ports, services), dev and prod stacks, one request through the edge |
| Profile pictures | [`profile-pictures.md`](profile-pictures.md) | overview, storing an upload, showing a picture |
| Database | [`database.md`](database.md) | overview (entity change, migration, boot, drift check), the tables (ERD) |
| Layout | [`layout.md`](layout.md) | overview (header, main, footer around every route), header by session state |
| Backend | [`backend.md`](backend.md) | overview (the boot order), one request inside Nest (guards, validation, serializer, filters) |

Domains still to come, each with its own page once built: video library
and search (HYP-13), torrent download (HYP-12), streaming and transcoding
(HYP-14), comments, public REST API (HYP-15).

Some domains also have an Excalidraw **poster**: a single large picture
for the defense deck or Linear, where the layout matters more than in
Mermaid.

| Poster | Domain page |
|---|---|
| [`auth-flow.png`](auth-flow.png) | [`auth.md`](auth.md) |
| [`auth-logout.png`](auth-logout.png) | [`auth.md`](auth.md) (section 7) |
| [`i18n-language.png`](i18n-language.png) | [`i18n.md`](i18n.md) |

## Rule: a diagram in a PR lands here too

Every PR that touches a flow, a state machine or 3+ components carries a
Mermaid diagram in its description (PR template), **and** commits it to
the domain's page in the same PR: a new section, or an update of the
section it changes. The overview at the top of the page is updated too
when the change adds or removes a step from it. A PR description is read
once; this folder is what a newcomer gets shown.

- New domain: create `docs/diagrams/<domain>.md` with an overview first,
  and add it to the index above.
- Each detail section names the issues that built it and, if any, the ADR
  that records the decision.
- A diagram that no longer matches the code is fixed in the PR that
  changed the code, not later.

## Excalidraw posters

Each poster has three files: the `.excalidraw` **source of truth** (open it
at excalidraw.com or with the VS Code Excalidraw extension), the rendered
`.png`, and an optional `.py` that rebuilds the `.excalidraw` with a
generator library not shipped in the repo. Without that library, edit the
`.excalidraw` directly.

When a flow changes:

1. Edit the `.excalidraw` (or the `.py`) and re-export the `.png` (VS Code:
   "Export to PNG").
2. **Look at the `.png`**: no overlapping boxes or arrows, text not
   clipped, reading order obvious, colours consistent. Fix until clean.
3. Commit on the branch that changed the flow.
4. Refresh the copy in the Linear document **"Auth - architecture"**
   (`auth-flow` only): upload the new `.png` to an Auth issue and update the
   `![](...)` URL in the document.

| Poster | Shows | Gaps |
|---|---|---|
| `auth-flow` | register (`POST /users`), login, the guard chain (`JwtAuthGuard`, `@Public()`, ownership), sign-in with 42 / GitHub (state cookie, callback, exchange code, `?error=`), the refresh cookie set at login and exchange | backend legs only (the SPA side is HYP-51); reset password when it is built |
| `auth-logout` | the public, cookie-driven `POST /auth/logout`: revokes the session, clears the cookie, 204 even with nothing to revoke; the local sign-out; an issued access token lives out its 15 minutes | |
