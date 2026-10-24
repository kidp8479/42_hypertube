# Database domain

How the schema is built and kept in step with the entities. Decision:
[ADR-0010](../adr/0010-typeorm-migrations-build-the-schema.md). The ERD of the
tables is still to come (defense packet, HYP-59).

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

## 1. A database that predates the migrations

A database created before the migrations existed (by `synchronize`) has the baseline's tables,
so running the baseline fails with "already exists". It is adopted once:

```mermaid
flowchart TD
    A["existing database<br/>(tables, no migrations table)"] --> B{"first boot"}
    B --> C["baseline tries to CREATE the tables"]
    C --> D["error: type or table already exists"]
    D --> E["make migration-adopt<br/>(migration:run --fake)"]
    E --> F["baseline recorded as applied,<br/>nothing executed"]
    F --> G["next boot: no pending migration"]
    A -. "or make wipe-db" .-> H["fresh database,<br/>the baseline builds it"]
```

A fresh database needs nothing: the baseline runs at the first boot.
