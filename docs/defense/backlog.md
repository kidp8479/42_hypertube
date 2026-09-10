# Backlog - pending Linear issues

Work identified in a session that lacked the Linear MCP. Create the issue,
then delete the entry here.

_Currently empty - everything surfaced so far is ticketed:_

- HTTP security headers (helmet) -> HYP-28
- Structured logging (pino) -> HYP-29
- Validated config layout -> template (added to HYP-26)

## Not yet ticketed

- `GET /users` returns `email` / `firstName` / `lastName` for every user
  to any authenticated caller (surfaced writing `security-checklist.md`).
  The subject imposes the `/users` endpoint, so this is a modelling
  decision, not a straight bug: decide whether the list representation
  should be trimmed to public fields, then ticket or record as accepted.
