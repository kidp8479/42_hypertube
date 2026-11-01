# Metadata: TMDb, with OMDb for the IMDb rating

**Date:** 2026-11-01 · **Status:** accepted

A film found in a source is matched on **TMDb** (title and year), which gives
the summary, the cast and crew (director, producer, main cast), the genres,
the runtime, the cover and the popularity. TMDb's `external_ids` gives the
IMDb id, and **OMDb** answers the **IMDb rating** for it. The subject asks
for "its IMDb (OMDb or TMDb for free API) rating".

## Why

- **TMDb for the content.** Structured credits, genres for the filters,
  posters on its image CDN, and summaries translated in the user's language
  (the app is in English and French). No daily quota: its documentation
  names "somewhere in the 40 requests per second range".
- **OMDb for the rating only.** It returns the IMDb rating directly, which is
  the number the subject and the marking sheet name. Its free key allows
  1,000 requests a day, so it is called once per film, never per page view.

## Consequences

- Two API keys, both from config (ADR-0003), never in the code or a log.
- Ratings and metadata are stored with the film once matched, so a library
  page reads the database, not the providers.
- A film TMDb cannot match still shows, with what its source gives (name,
  year when known, the source's cover).
- TMDb covers come from `image.tmdb.org` over https, already allowed by the
  SPA's `img-src https:` (ADR-0014).
