# 0026. A UI styling skill, a screenshot tool and a written style guide

- Status: Accepted
- Date: 2026-11-13
- Builds on [0011](0011-component-based-ui.md) (components), [0005](0005-theme-tokens.md) and [0023](0023-accessibility-checks-and-readable-colours.md) (tokens and colour roles).

## Context
The UI rules were written down and mostly tested (tokens, shared components, touch size, contrast), but two gaps remained. Nothing said how the app is *meant to look* beyond those rules (sizes, spacing, density), so a new screen could follow every rule and still look out of place. And "look at it" (step 8 of the workflow) had no repeatable way to do it: each session had to improvise a way to see the screens. Passing tests do not show how something looks.

## Decisions (made with the project owner)
- **A project skill, `.claude/skills/ui-styling/SKILL.md`**: the order to apply the existing rules in (read the docs, build with the catalog and tokens, look at it in screenshots, finish with docs and verify). It links to the docs and copies nothing from them, so a rule is still written in one place.
- **`npm run screenshots`** photographs the main screens at phone (390px) and desktop (1280px) width in both themes into `screenshots` (git-ignored), by a Playwright file (`e2e/ui.shots.ts`) with its own config that reuses the end-to-end settings. The file name (`*.shots.ts`) is what keeps `npm run test:e2e` and `verify` from running it. Run on demand, about 15 seconds.
- **A written style guide**, as a section of `docs/components.md` ("How the app looks"), *derived from the existing components and screens* (checked against the code and the screenshots). It records conventions and invents none; a screen that needs to differ changes the convention in the same change.
- CLAUDE.md step 8 now points to the skill instead of describing the procedure.

## Not done, on purpose
- **No public design skill installed** (for example Anthropic's frontend-design or Vercel's web-design-guidelines). They pull toward looks this app's token and component rules forbid, and the Vercel one fetches its rules from the internet on every run. They can be tried one at a time later.
- **No pixel-comparison (visual regression) tests.** Fonts and rendering differ between this machine and Linux CI, so they would fail for reasons outside a change; the pictures are for a person or Claude to look at.
- **The skill's discoverability is not tested beyond its front matter** (a test checks the name matches the folder and that there is a description); whether a given session lists it is up to Claude Code.

## Consequences
- The style guide can go stale. It has a "Last verified" date, and the skill tells Claude to update it when a convention changes; looking at the screenshots against it is how drift shows.
- The photographed screens are a fixed list in `e2e/ui.shots.ts`; a new screen is added there.
