# The BitTorrent client is written by hand, with no library

**Date:** 2026-11-01 · **Status:** accepted

The subject forbids "libraries used to create a video stream from a
torrent" (webtorrent, pulsar, peerflix), and the marking sheet has the
evaluator check every library with the students, a forbidden one counting
as cheating. The client uses **no BitTorrent library at all**, not even for
the file format. It implements:

- bencode, the format of `.torrent` files and tracker answers, and the
  info hash (SHA-1 of the bencoded `info` dictionary);
- trackers over HTTP and UDP (BEP-15);
- the peer wire protocol: handshake, bitfield, have, interested, choke,
  request, piece;
- magnet links: the extension protocol and `ut_metadata` (BEP-9, BEP-10) to
  fetch the info dictionary from peers;
- webseeds (BEP-19): pieces fetched over HTTP ranges, checked by SHA-1 like
  any piece;
- piece selection for streaming: pieces around what the player asks for
  first, then the rest in order;
- storage on disk, and the download running in the background.

## Why

- **No room for doubt at the defense.** Protocol libraries such as
  `bittorrent-protocol`, `bittorrent-tracker` or `ut_metadata` do not stream
  a video, but they come from the webtorrent project, the one the subject
  names. So does the npm `bencode` package (`webtorrent/node-bencode`).
  Whether they pass depends on the evaluator, and a "cheating" verdict
  scores 0.
- **It is what the project grades**: downloading through the protocol and
  streaming before the end. bencode is small (a decoder fits in a few dozen
  lines) and a good first piece to test against real `.torrent` files.
- Most 42 Hypertube projects on GitHub use a full client (libtorrent,
  anacrolix/torrent, librqbit); this choice is stricter on purpose.

## Consequences

- The sources need webseeds (ADR-0018) and the marking sheet's magnet needs
  peers, UDP trackers and `ut_metadata`: all four are in scope from the start.
  DHT is not, until a magnet without a working tracker needs it.
- The client is a backend module of its own, tested with recorded tracker
  answers and peer messages, and checked against the TPB AFK magnet.
