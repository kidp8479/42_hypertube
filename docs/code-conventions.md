# Code conventions

The rules a change follows while writing code, by topic. Look one up when you
add a spec, a file, an endpoint, an entity or a doc comment. The workflow
around them (issues, branches, commits, checks) is in
[`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Spec file layout

Specs are co-located (`foo.service.ts` -> `foo.service.spec.ts`) and follow
one shape, so any spec reads the same way:

```
type FooDeps = { bar: jest.Mock };          // only the methods the spec drives
const buildThing = (overrides = {}) => ({ ...sensibleDefaults, ...overrides });

describe('FooService', () => {
  // shared setup
  let service: FooService;
  let deps: FooDeps;
  beforeEach(async () => { /* compile TestingModule, grab service + mocks */ });

  // tests, grouped by method
  describe('methodUnderTest', () => {
    it('does X when Y', async () => {
      // arrange
      // act
      // assert
    });
  });
});
```

- **Setup lives in the hooks, tests are the `it()`s.** The `beforeEach`
  block is the boundary: everything above it is wiring, everything below
  is a real assertion. No `it('is defined')`: if the wiring breaks, every
  other test of the file fails first.
- **One `describe` per method under test**, nested in the class-level
  `describe`. `it('...')` labels read as sentences
  (`methodUnderTest does X when Y`).
- **Mock only what the spec drives.** A local `type XMock = { ... }` listing
  just those methods; the DI fake is passed via `useValue`; retrieve it
  with `module.get<XMock>(token)` (real token, mock type - see
  `users.service.spec.ts`).
- **Fixtures come from a `buildX()` factory** at the top of the file.
  A test overrides only the fields it asserts on; the rest stay defaults.
- **Arrange / Act / Assert**, separated by blank lines, not comments.
- `clearMocks: true` is set globally (`package.json` -> `jest`), so mock
  call history resets between tests automatically.
- Call `await module.init()` after `.compile()` when the service has
  lifecycle hooks (`onModuleInit` etc.) - `.compile()` alone does not run
  them.
- Don't mock `argon2`; it's fast enough to hash/verify for real in a
  unit test, and a real hash catches bugs a stub would hide.

## File naming

Backend (`backend/src`): `<kebab-case-name>.<role>.ts`.

- The **hyphen** separates the words of the name: `cookie-state`,
  `normalize-email`, `oauth-account`.
- The **dot** separates the role: `.service`, `.controller`, `.module`,
  `.entity`, `.dto`, `.strategy`, `.guard`, `.decorator`, `.filter`,
  `.util`, `.interface`, `.store`, `.config`, `.validation`, `.exception`.
  The role is visible in the file tree and greppable (`*.strategy.ts`), and
  it is what the Nest CLI generates.
- A spec adds `.spec` after the role: `foo.service.spec.ts`.
- A new role is fine when no existing one fits, but reuse one first. The
  only file without a role is `main.ts`, Nest's bootstrap entry point.

Frontend (`frontend/src`): kebab-case, `<feature>-<descriptor>` inside a
feature folder, see
[ADR-0006](adr/0006-frontend-architecture.md). Tests are `.test.ts(x)`;
styles are Tailwind classes in the component
([ADR-0012](adr/0012-tailwind-css-v4-on-top-of-the-design-tokens.md)),
and a class list shared by several components is a `<name>-classes.ts`. `App.tsx` and `main.tsx` keep the Vite scaffold
names.

## API conventions (NestJS)

### DTOs

- **Every field is `readonly` and uses definite assignment (`email!: string`).**
  A DTO models an inbound request: it is read, never mutated. `readonly`
  encodes that and lets the compiler catch an accidental `dto.x = ...` in a
  handler; the `!` is still needed because `class-transformer` populates the
  instance, not a constructor.
- **Two-sided bounds use `@Length(min, max)`**, not separate `@MinLength` +
  `@MaxLength`. A one-sided cap stays a single `@MaxLength`.
- **Email is normalised** with `@NormalizeEmail()` (from
  `src/common/decorators/`) before `@IsEmail()`, on every DTO that carries
  an email, so lookups and uniqueness stay case-insensitive. Other
  free-text fields that must not keep surrounding whitespace use `@Trim()`
  from the same folder. The username keeps its case (display text) but is
  unique whatever the case: the index is on `LOWER(username)`.
- One doc-comment on the class explaining what the payload is for; no
  per-field comments unless a rule is non-obvious (ex: why login has no
  password policy).
- Login/auth DTOs carry **no** password length or complexity rule beyond a
  size cap - the form must accept legacy credentials, and a policy hint only
  helps an attacker.
- An "edit" DTO is `PartialType(CreateDto)` plus its own fields. A field
  that changes a credential (for `UpdateUserDto`, `email` and `password`)
  is re-authenticated in the service (`currentPassword`), and the change
  ends every other session.

### Database schema

The schema is built by migrations (`backend/src/migrations/`), applied by the
app at boot in every environment; `synchronize` is off (ADR-0010). When you
change an entity:

1. `make migration-generate NAME=add-movies` writes the migration from the
   difference between the entities and the database (the stack must be up).
2. **Read the generated SQL.** A column rename is generated as a drop and an
   add, which loses the data; rewrite it as a rename by hand.
3. Commit the migration with the entity change. `make migration-check` (and the
   `e2e` CI job) fails if an entity changed without one.

`make migration-run`, `-revert` and `-show` apply, undo the last and list them.

### OpenAPI (Swagger)

`/api-docs` is the REST evidence shown at the defense. The
`@nestjs/swagger` compiler plugin (`nest-cli.json`) builds the request and
response models from the DTO types and their class-validator rules, so a
DTO needs no `@ApiProperty`. A new route adds:

- `@ApiOperation({ summary })`: one short line for the evaluator, not the
  doc comment (which is for developers).
- `@ApiErrors(...)` (`common/decorators/`) with the error codes it answers,
  429 only on a throttled route.
- `@ApiOkResponse({ type })` when the handler returns a plain object, which
  the plugin cannot describe.

The bearer token is required on every operation unless the route is
`@Public()`, which also marks it public in the document. A browser
navigation (the OAuth routes) is left out with `@ApiExcludeEndpoint()`:
"Try it out" would fetch it and follow the redirect.

### HTTP status codes

Rely on Nest's default success code for the verb (`GET`/`PATCH`/`DELETE` -> 200,
`POST` -> 201). Add `@HttpCode(HttpStatus.OK)` **only** when the default is
semantically wrong - a `POST` that does not create a resource
(`POST /auth/login` returns a token, so it is 200). Use the `HttpStatus` enum,
never a bare number. Thrown `HttpException`s carry their own status and are
unaffected by `@HttpCode`.

A handler acting on a resource id that matches no row throws
`NotFoundException` (404) - never a 200 with an empty body, and never a
silent no-op on `PATCH`/`DELETE`. The check lives in the service (single
source of truth), not the controller.

A Postgres unique-constraint violation (`23505`) is mapped to **409** by
the global `QueryFailedFilter`, with a message that does not name the
clashing value - never let it surface as a raw 500 with the SQL error in
the body/logs.

## Doc comments

**Every class has a `/** */` doc comment**, with no exception for how
trivial it looks: modules, controllers, services, entities, DTOs,
strategies, guards, filters, exception classes. The same goes for every
React component. A defense reviewer and a developer onboarding on the
project both start from "what is this and why is it here"; the class
comment is the one place that answers it without opening the body. A module
or a one-method service still earns one line (its role and what it hands
to the rest of the app), never a restatement of its name.

Below the class, public surface (exported functions, public methods, HTTP
routes, scripts called from outside) gets a doc comment; obvious private
code does not. Comment the *why*, not the *what* - a line restating the
identifier name earns nothing.

The `//` header at the top of a file stays: it says what the *file* is for,
the class comment says what the *class* is for.

Syntax: `/** */` on declarations (class, method, function, exported
constant), because Compodoc reads it. `//` for comments inside a function
body or on a call (ex: the bootstrap in `main.ts`).

A comment states how the code behaves now, as a plain fact a reader with no
context can use. It never corrects an earlier claim ("not X, actually Y",
"no longer", "the old ...") and never tells a history: when a sentence turns
out wrong, rewrite it as the true statement. History belongs in the commit
message and in an ADR. A negation is fine when it is itself a property
("never logged", "not a fetch").

Prose carries the intent. JSDoc tags are added **only when they state
something the TypeScript signature does not**:

- `@throws` - TS has no throws in the type system, so which exception a
  method or route raises is real, missing information (ex: the 401 on
  `POST /auth/login`).
- `@param` - only for a precondition, unit, or invariant not in the type
  (ex: "must already be authenticated"). Never `@param foo the foo`.
- `@returns` - only when the meaning of the return is non-obvious (what a
  `null` signals, what a shape represents), not to repeat the type.
- `@example` - for a non-trivial call flow; Compodoc renders it.

Compodoc (`make doc`) turns these into the browsable API docs used as
defense evidence, so the tags that survive should read as documentation,
not decoration.
