# Database domain

How the schema is built and kept in step with the entities (decision:
[ADR-0010](../adr/0010-typeorm-migrations-build-the-schema.md)), and the
tables it holds.

## Overview

```mermaid
flowchart LR
    entity["entity change<br/>(*.entity.ts)"] --> gen["make migration-generate<br/>NAME=..."]
    gen --> review["read the SQL,<br/>commit the migration"]
    review --> mig["backend/src/migrations/<br/>*.migration.ts"]

    boot["app boot<br/>(dev, CI, production)"] --> run["pending migrations run"]
    mig --> run
    run --> schema[("PostgreSQL schema")]

    ci["e2e CI job<br/>starts on an empty database"] --> boot
    ci --> check["migration:check"]
    check -- "an entity changed<br/>without a migration" --> fail["CI fails"]

    classDef code fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111827
    classDef bad fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    class entity,mig,gen,review code
    class boot,run,schema,ci,check ext
    class fail bad
```

## Tables (ERD)

The schema today: accounts and what hangs off them. The movie, torrent and
comment tables come with the core (HYP-12 / 13 / 14). Read from the database
the migrations build (`make psql`, then `\d "user"`), not only the entities.

```mermaid
erDiagram
    user ||--o{ oauth_account : "signs in through"
    user ||--o{ refresh_token : "holds sessions"
    user ||--o{ api_client : "owns keys"

    user {
        int id PK
        varchar email UK "max 255 chars, normalised, lower case"
        boolean emailVerified "a provider vouched for it"
        varchar username UK "max 30 chars, unique whatever the case"
        varchar firstName "max 100 chars"
        varchar lastName "max 100 chars"
        varchar password "max 255 chars, argon2id hash, null for OAuth-only, never selected"
        varchar profilePicture "max 64 chars, file name, null = default avatar"
        timestamptz credentialsChangedAt "last OAuth claim, never selected"
        enum preferredLanguage "en, fr; default en"
        timestamp createdAt
        timestamp updatedAt
    }
    oauth_account {
        int id PK
        enum provider "fortytwo, github"
        varchar providerUserId "max 255 chars, unique with provider"
        int userId FK
        timestamp createdAt
    }
    refresh_token {
        int id PK
        int userId FK
        uuid familyId "one login session"
        char tokenHash UK "exactly 64 chars, SHA-256, never the token"
        timestamptz expiresAt "sliding window"
        timestamptz familyStartedAt "absolute cap per login"
        timestamptz rotatedAt "set when used once"
        timestamptz revokedAt "set on logout or reuse"
        timestamp createdAt
    }
    api_client {
        int id PK
        int userId FK
        varchar name "max 50 chars"
        varchar clientId UK "max 32 chars, public"
        char secretHash "exactly 64 chars, SHA-256, never selected"
        timestamp createdAt
    }
```

- **Deleting a user deletes the rest:** every foreign key is
  `ON DELETE CASCADE` (sessions, provider links, API keys), and the service
  deletes the picture file.
- **Indexes:** each `userId` is indexed, and so is `refresh_token.familyId`
  (a reused token revokes its whole family in one query). The username is
  unique twice: as typed, and through `UQ_user_username_lower` on
  `LOWER(username)`, an expression index that lives in its migration only.
- **What is never stored in clear:** the password (argon2id, ADR-0001), the
  refresh token and the API key secret (SHA-256: they are random, a slow
  hash adds nothing, ADR-0011 and ADR-0015).
- **Never read by default:** `password`, `secretHash` and
  `credentialsChangedAt` are `select: false` and excluded from responses.
- `migrations` is TypeORM's own bookkeeping table (which migrations ran),
  not part of the model.
