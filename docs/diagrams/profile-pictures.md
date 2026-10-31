# Profile pictures domain

How a picture gets from the register form or the profile page to the disk,
and back to every `<img>` that shows it. Decision:
[ADR-0016](../adr/0016-profile-pictures-uploaded-and-stored-on-a-volume.md).

## Overview

```mermaid
flowchart LR
    reg["SPA - register form<br/>PictureField"] -- "multipart" --> post["API - POST /users"]
    prof["SPA - profile page<br/>PictureForm"] -- "multipart" --> put["API - PUT /users/:id/picture"]
    prof --> del["API - DELETE /users/:id/picture"]
    post --> store["ProfilePictureStore<br/>check, write, persist"]
    put --> store
    store --> vol[("pictures volume<br/>/var/lib/hypertube/pictures")]
    store --> db[("user.profilePicture<br/>= uuid.ext, or null")]
    img["SPA - UserAvatar"] -- "GET /pictures/:name<br/>(public)" --> vol
    db -. "null" .-> initial["the username's initial<br/>(default avatar)"]
```

## 1. Storing an upload (HYP-38)

The same path for a registration with a picture and for a replacement.

```mermaid
flowchart TD
    A["multipart request"] --> L{"multer limits<br/>2 MB, 1 file"}
    L -- over --> X413["413, nothing written"]
    L -- ok --> M{"first bytes:<br/>JPEG, PNG or WebP?"}
    M -- no --> X400["400, nothing written"]
    M -- yes --> W["write uuid.ext"]
    W --> P{"save the row<br/>(insert or update)"}
    P -- fails --> D["delete the file,<br/>pass the error on (409, 404)"]
    P -- ok --> O["delete the replaced file, if any"] --> R["201 / 200 with the user"]
```

- The client checks the type and size first (`validatePicture`), so a wrong
  pick shows its error before any request; the backend has the final say.
- A refused pick on the register form stops the submit: registering without
  it would silently drop what the user chose.

## 2. Showing a picture (HYP-38)

```mermaid
sequenceDiagram
    participant UI as UserAvatar
    participant API as GET /pictures/:name
    participant S as ProfilePictureStore
    UI->>API: <img src="/api/pictures/uuid.png"> (no token)
    API->>S: open(name)
    alt name not uuid.(jpg|png|webp), or file gone
        S-->>API: 404
        API-->>UI: 404, the avatar falls back to the initial
    else
        S-->>API: stream, type, size
        API-->>UI: 200, Cache-Control: immutable
    end
```

- Public because an `<img>` cannot send the bearer token; the random name is
  what keeps a picture from being found by user id.
- Cached for good: a new upload gets a new name, never new bytes behind an
  old one.
