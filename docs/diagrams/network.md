# Network domain

How a browser request reaches the app: one entry point that terminates TLS
and routes to the services on the compose network. Decision:
[ADR-0009](../adr/0009-nginx-edge-proxy-with-tls.md) (phase 1 of HYP-71).

## Overview

```mermaid
flowchart LR
    browser["Browser"]

    subgraph host["Host (loopback only)"]
        p8080[":8080 HTTP"]
        p8443[":8443 HTTPS"]
        direct[":13000 / :15173<br/>direct ports (dev, phase 1)"]
    end

    subgraph net["Compose network"]
        proxy["proxy - nginx<br/>TLS, edge headers"]
        frontend["frontend - Vite dev server :5173"]
        backend["backend - NestJS :3000"]
        db[("db - Postgres :5432")]
    end

    browser --> p8080 -- "301 to HTTPS" --> proxy
    browser --> p8443 --> proxy
    browser -. "Bruno, e2e, host dev" .-> direct
    direct -.-> frontend
    direct -.-> backend

    proxy -- "/ (and the HMR websocket)" --> frontend
    proxy -- "/api/* (prefix stripped)" --> backend
    proxy -- "/api-docs" --> backend
    backend --> db

    classDef edge fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef svc fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111827
    class proxy edge
    class frontend,backend,db svc
    class browser,p8080,p8443,direct ext
```

Amber: the edge. Violet: the services. Grey: the browser and the host ports.
Dashed: the direct ports of phase 1, which phase 2 removes so that the proxy
is the only way in.

## 1. One request through the edge

```mermaid
sequenceDiagram
    participant B as Browser
    participant P as proxy (nginx)
    participant A as backend
    participant F as frontend
    B->>P: GET http://localhost:8080/login
    P-->>B: 301 https://localhost:8443/login
    B->>P: GET https://localhost:8443/login (TLS, self-signed)
    P->>F: forwards /login (a SPA route, not an API route)
    F-->>P: index.html
    P-->>B: 200 + X-Content-Type-Options, X-Frame-Options
    B->>P: POST /api/auth/login
    P->>A: POST /auth/login (X-Forwarded-For, X-Forwarded-Proto)
    A-->>P: 200 { access_token } (or 401)
    P-->>B: same answer, edge headers added
```

## Not yet (phase 2)

Direct ports unpublished, `trust proxy` in the backend (so the rate limiter
sees the real client), Bruno and the CI e2e job behind the proxy, OAuth over
HTTPS (callback URLs and the state cookie path).
