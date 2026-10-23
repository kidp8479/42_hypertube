# Network domain

How a browser request reaches the app: one entry point that terminates TLS
and routes to the services on the compose network. Decision:
[ADR-0009](../adr/0009-nginx-edge-proxy-with-tls.md) (HYP-71).

## Overview

```mermaid
flowchart LR
    browser["Browser"]

    subgraph host["Host (loopback only)"]
        p8080[":8080 HTTP"]
        p8443[":8443 HTTPS"]
    end

    subgraph net["Compose network"]
        proxy["proxy - nginx<br/>TLS, edge headers"]
        frontend["frontend - Vite dev server :5173"]
        backend["backend - NestJS :3000"]
        db[("db - Postgres :5432")]
    end

    browser --> p8080 -- "301 to HTTPS" --> proxy
    browser --> p8443 --> proxy

    proxy -- "/ (and the HMR websocket)" --> frontend
    proxy -- "/api/* (prefix stripped)" --> backend
    proxy -- "/api-docs" --> backend
    backend --> db

    classDef edge fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef svc fill:#ede9fe,stroke:#7c3aed,color:#3b0764
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#111827
    class proxy edge
    class frontend,backend,db svc
    class browser,p8080,p8443 ext
```

Amber: the edge. Violet: the services. Grey: the browser and the host ports.
The proxy is the only way in: the backend and the frontend publish no host
port. Bruno and the e2e suite go through it too.

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
    P->>A: POST /auth/login (X-Forwarded-For, -Proto, -Prefix: /api)
    A-->>P: 200 { access_token } + Set-Cookie refresh_token, Path=/api/auth, Secure (or 401)
    P-->>B: same answer, edge headers added
```

## 2. OAuth through the edge

```mermaid
sequenceDiagram
    participant B as Browser
    participant P as proxy (nginx)
    participant A as backend
    participant O as 42 / GitHub
    B->>P: GET /api/auth/42/login
    P->>A: /auth/42/login (X-Forwarded-Prefix: /api)
    A-->>B: 302 to the provider + Set-Cookie oauth_state, Path=/api/auth, Secure
    B->>O: authorize
    O-->>B: 302 https://localhost:8443/api/auth/42/callback?code&state
    B->>P: callback (the cookie matches /api/auth)
    P->>A: /auth/42/callback
    A-->>B: 302 FRONTEND_ORIGIN/oauth/callback?code=C (https, the proxy's origin)
```

The backend trusts one proxy hop (`trust proxy`), so the rate limiter keys on
the client address nginx appended and `req.secure` follows
`X-Forwarded-Proto`.
