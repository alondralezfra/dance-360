# 0014. Canvas performance: motion outside React, no shadows

- Status: Accepted
- Date: 2026-11-09
- Refines [0003](0003-playback-is-a-pure-function.md) (positions still come only from `positionsAt`; this changes how they reach the screen).

## Context
Playback (build-order step 3) will move every dot 60 times a second, including on phones ("watch mode"). A measurement of the transition glide, which uses the same render path, found:

| Dancers | Laptop | ~4x slower CPU (mid-range phone) |
|---|---|---|
| 40 | 16.6ms/frame | **31ms (~32fps)** |
| 100 | 16.6ms | **62ms (~16fps)** |
| 200 | 20ms, dropping frames | n/a |

(Method: a 3-formation project seeded into storage, glide forward and back three times, `requestAnimationFrame` intervals from a production build with the CPU throttled through the browser's debugging protocol. 16.7ms is 60fps.) A CPU profile showed where it went: Konva's slow path for shapes with a drop shadow (about half the frame at 100 dancers), and React re-rendering the whole canvas every frame (about 100 dancers x 4 canvas objects, re-attaching event handlers each time, re-diffing props, re-measuring text). Part colours were also recomputed per dancer per frame, and the static floor was reconciled every frame.

## Decision (target agreed with the project owner: up to about 40 dancers, smooth on a typical mid-range phone)
- **Motion bypasses React.** A **playhead clock** (`features/stage/playheadClock.ts`: `get`/`set`/`subscribe`, outside React) holds the count. Whatever produces a count sets it: today the glide (`usePlayhead`), later the audio transport. `useDotMotion` subscribes, calls the pure `positionsAt`, and sets each dot's canvas node position directly, then asks the layer to redraw. React renders each dot's *resting* position (the selected formation); a glide moves nodes away from it and ends back on it.
- **React re-renders only for structural changes**: an edit, the selection, the size or pixel ratio, or the playhead entering a new **section** (`useSyncExternalStore` over `sectionIndexAt`, so only a section change is a change). Dot colours are computed once per section change, not per frame.
- **Memoised, stable pieces**: `DancerDot` and `StageFloor` are `memo`; the callbacks they receive have stable identity (id passed as an argument), so unrelated updates don't re-render them.
- **No drop shadow on dots** (chosen over cached dot images and idle-only shadows): a crisp outline is the fastest and reads cleanly on a busy stage.
- The clock is the seam for step 3: audio playback will `set` the same clock; the stage and `useDotMotion` do not change.

## Results (same method)
| Dancers | Laptop | ~4x slower CPU | ~6x slower CPU |
|---|---|---|---|
| 40 | 16.6ms | **17.1ms (60fps)** | 21.9ms |
| 100 | 16.6ms | 23.8ms | 37.5ms |
| 200 | **16.6ms, no drops** | n/a | n/a |

## Consequences
- Guarded by deterministic tests rather than timing: `StageCanvas.test.tsx` fails if a glide re-renders the dots per frame (and checks the dots still move, colours change exactly at section boundaries, and stepping back works); `useDotMotion.test.tsx` and `playheadClock.test.ts` cover the pieces. A timing test would be flaky on slow CI machines.
- "Never animate positions inside a component" still holds in spirit: positions come only from `positionsAt`; the hook only applies them to nodes. Code that moves nodes must not invent positions.
- Not done (measured as not needed for the 40-dancer target; available if the target grows): switching off drag hit-testing while playing, capping the pixel ratio on high-density phones, drawing labels only for the selected dancer on small screens, cached dot images. Re-measure with the method above once audio playback exists.
- A node moved by the clock is briefly out of sync with React's props if an edit lands mid-glide; the next tick re-applies the clock's position, and a glide ends on the resting position, so this is invisible in practice.
