# Backlog - pending Linear issues

Work identified but not yet tracked in Linear (the MCP was not connected in
the session that surfaced these). Create the issue, then delete the entry
here.

## HTTP security headers (helmet)

Add `helmet` middleware in `main.ts`; tune the CSP for the React SPA.
Responses currently ship without `X-Content-Type-Options`,
`X-Frame-Options`, CSP, HSTS, etc. The subject makes XSS / injection
eliminatory, so this must land before the `web-security-review` pass.
Milestone: Auth + setup. Small.

## Structured logging

Replace Nest's default console logger with `pino`
(`nestjs-pino`), enable `bufferLogs: true` in `bootstrap()`, set log level
per environment, add request correlation IDs. Not blocking for the
defense. Milestone: polish.

## Propagate config setup to 42-project-template

Once `@nestjs/config` + Joi validation + the `src/config/` layout are
settled here, port them back to `kidp8479/42-project-template` (this is
part of the existing HYP-26 scope - "propagate conventions back to the
template" - so extend that issue rather than opening a new one).
