# 0003. Playback is a pure function

- Status: Accepted
- Date: 2026-11-03

## Context
The plan (§6.5) requires the counts-to-positions logic to be independent of layout so the editor, phone watch mode and dancer view share it. The prototype animated dots inside a component with its own timer, which couldn't be driven by audio.

## Decision
`positionsAt(formations, count)` in `src/model/playback.ts` is the only place positions are interpolated. Components render its result; anything that can produce a count (the editor glide in `usePlayhead`, later the audio clock or a scrubber) drives it.

## Consequences
*(Update 2026-11-09: the stage no longer re-renders per frame; the count lives in a playhead clock outside React and dots are moved on the canvas from `positionsAt`. See [0014](0014-canvas-performance.md). The contract above is unchanged.)*

Playback logic is unit-tested exhaustively without a browser or audio. The stage re-renders per animation frame during a glide, which is fine at ~40 dots; if it becomes a bottleneck, optimise the canvas layer, not the contract.
