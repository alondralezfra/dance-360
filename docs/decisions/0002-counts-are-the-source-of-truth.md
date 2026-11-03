# 0002. Counts, not seconds, are the source of truth

- Status: Accepted
- Date: 2026-11-03 (from plan §3.1)

## Context
Formations must stay correct if the audio turns out to be offset or the BPM is adjusted.

## Decision
A formation stores an absolute integer `count` (0 = Set 1, Count 1; 8 = Set 2, Count 1) and `transitionCounts`. The project's `tempo` (BPM + start offset) converts counts to audio time at playback. Dancers *arrive* on a formation's count.

## Consequences
Fixing the tempo map once shifts everything. Counts are kept unique and ordered (`normalizeCounts`). Tempo changes mid-song would require a richer tempo map later (a data migration). The model has no notion of seconds except in `tempo.ts`.
