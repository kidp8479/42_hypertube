# Profile pictures are uploaded and stored on a volume

**Date:** 2026-10-31 · **Status:** accepted

The marking sheet puts the profile picture in the registration form, and the
subject asks that every upload be validated. Until HYP-38 a picture was an
https address the user typed. Now the backend hosts it:

- `POST /users` takes JSON, or a multipart form carrying a `picture` file
  beside the same fields. `PUT /users/:id/picture` replaces one's own
  picture and `DELETE /users/:id/picture` removes it (403 on another user).
  `PATCH /users/:id` no longer takes `profilePicture`.
- `ProfilePictureStore` (`backend/src/users/`) checks the file, writes it to
  `/var/lib/hypertube/pictures` under a fresh `<uuid>.<ext>`, and the
  `profilePicture` column holds that name. `GET /pictures/:name` serves it.
- `null` means no picture: the client draws the default avatar, the
  username's initial (`UserAvatar`).

## Why

- **Upload only, no linked address.** A linked address that 404s logs
  `Failed to load resource` on every page showing the avatar, and an
  evaluator typing a dead one would see it everywhere. A hosted file cannot
  go missing that way.
- **The type comes from the first bytes.** JPEG, PNG and WebP are recognised
  by their signature, never by the client's MIME type or file name. SVG is
  refused: it can carry script. Nest's `FileTypeValidator` was not used: it
  loads `file-type` as an ES module, which fails under Jest and then refuses
  every file.
- **In memory first, on disk after the check.** multer keeps the file in
  memory (2 MB cap, one file, a few short fields), so nothing is written
  before the check passes. The file is written before the row, and deleted
  again if the insert or update fails (a taken email at registration): a
  refused request leaves no orphan.
- **A random name.** The client's file name never reaches the disk, and the
  name served cannot be guessed from a user id. The serving route only opens
  names matching that pattern, so `../` never reaches the file system.
- **Public reading.** An `<img>` cannot send the bearer token (ADR-0002), so
  `GET /pictures/:name` is `@Public()`. The random name is what keeps a
  picture from being listed by user id. A name never points at other bytes,
  so the answer is cached for good, unlike the API's `no-store`.
- **A named volume, not the source tree or object storage.** The `pictures`
  volume is in the shared compose file, so dev and prod both have it; the
  image creates the directory owned by `node`, so rootless Podman can write
  it (same reason as `backend_dist`). A storage service would be one more
  container for a single small file per user.
- **Nullable column.** HYP-38 first planned `NOT NULL` with a stored default
  image. `null` plus the initial drawn by the client gives the same default
  avatar with no backfill and no special case for OAuth sign-ups.

## Consequences

- **The edge proxy accepts 3 MB on `/api`** (`client_max_body_size`), above
  the backend's 2 MB cap so the backend answers the JSON 413. nginx's 1 MB
  default would have answered first with an HTML page.
- **Metadata is kept.** The file is stored as sent, not re-encoded, so a
  phone photo keeps its EXIF data (the place it was taken included). Fixing
  it means re-encoding with `sharp`, a native dependency
  (`known-limitations.md`).
- **The linked addresses were dropped.** The migration recreates the column:
  every account went back to the default avatar.
- **Deleting an account deletes its picture.** A file that fails to delete
  is logged, not retried.
