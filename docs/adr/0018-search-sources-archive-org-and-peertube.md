# Search sources: archive.org and PeerTube

**Date:** 2026-11-01 · **Status:** accepted

The library searches two external sources, as the subject requires, both
legal and both with a JSON API:

- **archive.org**: the `advancedsearch.php` API over the `feature_films`
  collection (about 28,500 films), sorted by downloads for the default
  "most popular" view. Every item has an `<id>_archive.torrent`.
- **PeerTube**, through the federated search API of SepiaSearch
  (`sepiasearch.org/api/v1/search/videos`), filtered on Creative Commons and
  public-domain licences and a minimum duration. Every video file has a
  `.torrent`.

## Why

A spike on 2026-11-01 probed each candidate's API and swarm (tracker
announce and UDP scrape):

| Candidate | API | Peers | Verdict |
|---|---|---|---|
| legittorrents.info (the subject's example) | none | none | dead: the site reads "RIP 2005-2023" |
| archive.org | JSON search, popularity, metadata | 0 seeders on its trackers, data through HTTP webseeds | kept |
| PeerTube (SepiaSearch) | federated JSON search, licence filter | 0 on the instance tracker, data through webseeds | kept |
| publicdomaintorrents.info | HTML only | tracker answers no peers, no webseeds | rejected: its films cannot be downloaded |
| Blender open movies, the marking sheet's TPB AFK magnet | none | real swarms (56 to 383 seeders) | not a search source; reachable through archive.org copies and magnets |

archive.org is the source most 42 Hypertube projects use; PeerTube is the
second legal source with a real search API.

## Consequences

- **Both sources serve data through webseeds** (BEP-19), not peers: the
  BitTorrent client must download pieces from a webseed as well as from
  peers ([ADR-0020](0020-bittorrent-client-written-by-hand.md)).
- **PeerTube licences are declared by the uploader**, and some are wrong (a
  1986 animated film marked public domain). Results are limited to
  Creative Commons and public-domain licences, on an allowlist of
  instances, and the list is reviewed before the defense.
- The marking sheet's TPB AFK magnet (a Creative Commons film) is also on
  archive.org; the magnet itself must still play, so the client handles
  magnets and real peers.
- Each source is one backend module with its own service, the only place
  that knows the provider's URL and response shape; a source that is down
  gives partial results, never a 5xx.
