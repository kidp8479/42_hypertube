# Documentation index

Every document in the repo, who it is for and when to read it. New here:
the root [README](../README.md), then [`onboarding.md`](onboarding.md).

| Document | For | Read it when |
|---|---|---|
| [`README.md`](../README.md) | everyone | first: what this is, how to run it, the `make` targets |
| [`onboarding.md`](onboarding.md) | a developer joining or taking over | second: setup with your own OAuth apps, day-one traps, how work flows, where the state lives |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | anyone opening a PR | before a branch: workflow, commits, tests, naming, API and doc-comment conventions |
| [`backend/README.md`](../backend/README.md) | backend work | to find a module and its npm scripts |
| [`frontend/README.md`](../frontend/README.md) | frontend work | to find a feature folder, how the SPA reaches the API |
| [`adr/`](adr/README.md) | anyone asking "why is it built this way" | before changing a structural choice; the planned decisions are listed there |
| [`diagrams/`](diagrams/README.md) | anyone touching a flow | before reading a flow's code; one page per domain |
| [`defense/`](defense/README.md) | the evaluator, and whoever prepares the defense | traceability matrix, security checklist, CI and quality gates, known limitations, last security review |
| [`design/`](design/README.md) | UI work | the reference mockup, tokens and accessibility floor |
| [`deps/framework-major-upgrades.md`](deps/framework-major-upgrades.md) | dependency updates | before taking a major bump Dependabot ignores |
| [`.github/pull_request_template.md`](../.github/pull_request_template.md) | PR authors | filled on every PR |

Generated, not committed: the Compodoc backend reference (`make doc`, into
`docs/backend/`) and Swagger at `/api-docs` on a running stack.
