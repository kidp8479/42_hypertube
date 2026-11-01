# Transcoding: ffmpeg to a fragmented MP4, on the fly

**Date:** 2026-11-01 · **Status:** accepted

A file the browser plays natively (MP4 or WebM with browser codecs) is
served as it is, with HTTP `Range`, from the file being downloaded. Anything
else (mkv at least, as the subject requires) goes through **ffmpeg**, which
writes a **fragmented MP4** to the HTTP response while it reads:

- the video stream is copied when it is H.264, re-encoded with a fast preset
  otherwise; the audio is copied when it is AAC, converted to AAC otherwise;
- `-movflags frag_keyframe+empty_moov`, so the player starts on the first
  fragment, without the end of the file;
- seeking restarts ffmpeg at the asked position (`-ss`).

## Why

- **One process, one response.** A fragmented MP4 plays in a plain
  `<video>` in Firefox and Chrome, with no player library.
- **HLS was the alternative**: free seeking and cacheable segments, but
  temporary segment files to write and clean up, and hls.js in the SPA. More
  parts for what the subject asks.
- ffmpeg is called directly (spawned), not through `fluent-ffmpeg`, which is
  no longer maintained.

## Consequences

- ffmpeg (and ffprobe, to read the codecs) is installed in both backend
  images.
- A transcoded stream cannot seek ahead of what is downloaded; the piece
  selection (ADR-0020) follows the requested position.
- The film's own file is the one kept on disk and deleted after a month
  unwatched; the transcoded output is not stored.
- The player's `media-src` is checked against the CSP on `make up-prod`
  (ADR-0014).
