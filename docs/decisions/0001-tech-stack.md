# 0001. Tech stack

- Status: Accepted
- Date: 2026-11-02 (recorded 2026-11-03)

## Context
A web app that must work on desktop, iPad and phone, with a drag-heavy canvas editor, synced audio playback later, and eventually accounts, cloud data and possibly a native app (plan §6).

## Decision
React + TypeScript on Vite; Konva (`react-konva`) for the stage canvas; Zustand for state; React Router; Tailwind v4 for styling with Radix primitives for accessible overlays; Vitest + Testing Library + Playwright for tests. Supabase is the expected backend (not yet integrated).

## Consequences
- Canvas rendering handles many draggable dots with touch support; the cost is that canvas content isn't in the DOM, so tests drive it by coordinates and assert on saved data.
- Tailwind gives styling but not components or themes, so those are built in `components/ui/` and `index.css` ([0005](0005-theme-tokens.md)).
- Everything is web-first; a PWA may cover mobile, with a native app later only if offline/audio needs demand it.
