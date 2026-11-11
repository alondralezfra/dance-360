# 0023. Automated accessibility checks, and readable colours as a rule

- Status: Accepted
- Date: 2026-11-10
- Part of the safety net in [operations-and-quality.md](../operations-and-quality.md). Builds on the theme tokens in [0005](0005-theme-tokens.md).

## Context
Tests already query the app by role and accessible name, which catches a lot, but nothing checked the things a machine can verify across a whole screen: colour contrast, names that match visible text, roles and structure. A first scan with axe found real problems: secondary grey text a hair under the standard in the light theme (4.34 : 1), the faint formation numbers (2.3 : 1 in light), the dark-theme indigo button just under (4.46 : 1), a dropdown whose spoken name did not include its visible text, and, in states a quick scan misses, the indigo link text on dark (hard to read) and a primary button that turned unreadable on hover in dark.

## Decisions (made with the project owner)
- **An axe scan is part of the e2e suite** (`e2e/accessibility.spec.ts`, using `@axe-core/playwright`, a development-only dependency). It scans the projects home, the stage, the dancer drawer (phone), Cast & Parts with a part added, the sections picker, the Song tab with no song, with a song, and with the speaker-delay calibration open, the error screen and the not-found screen, in the **light and dark themes, on a desktop and a phone width**, against **WCAG 2.1 levels A and AA**. **Any violation fails the test**, and the message names the rule, the element and why.
- **The findings are fixed, not excepted.** There is no list of ignored rules.
- **Colour tokens carry roles** (see below), and a unit test (`src/theme/contrast.test.ts`) reads the real tokens from `index.css` and checks every text-on-background pair the app uses in both themes, so a colour tweak that hurts readability fails in milliseconds, before the browser scan.

## Colour roles (the rule)
- Text is `text-foreground`, `text-muted-foreground` (secondary text) or `text-link` (indigo text such as links): each is **4.5 : 1** on every background it is used on, in both themes.
- `text-subtle-foreground` is for **icons, placeholders and decoration only**, never for text a person has to read (3 : 1).
- `--primary` is for **fills** (buttons) with `--primary-foreground` text; `--primary-hover` must keep that white text readable (in dark it is *darker* than the button, not lighter). Do not use `text-primary` for text: use `text-link`.
- Changes made: light `--muted-foreground` #64748b → #5a6a80, light `--subtle-foreground` #94a3b8 → #7a8aa0, dark `--subtle-foreground` #64748b → #75849c, dark `--primary` #6366f1 → #5f62ef, dark `--primary-hover` #818cf8 → #4f52de, light `--danger` #dc2626 → #c81e1e, and a new `--link` (light #4f46e5, dark #a5b4fc). The formation numbers now use `text-muted-foreground`. The look is the same in spirit; secondary text and the dark-theme button are a touch stronger.
- The sections dropdown's accessible name is now "Sections of part 2: All sections" (what it is for, then the text it shows), so a person using voice control can say what they see.

## Not done, on purpose
- **An automated scan is not an accessibility audit.** It finds the machine-checkable problems (about a third of what matters). It does not replace trying the app with a keyboard only, a screen reader and zoom, which are still to do; the canvas screens (stage, timeline) in particular need a human pass.
- **Not scanned yet:** every state of every screen (for example, an open undo history, the project name rename in progress), and the pages as a screen reader announces them.
- **Reduced motion and focus order** are not tested automatically.
- **WCAG 2.2 and AAA** are not enforced.

## Consequences
- A new screen or state that breaks the standard fails the suite, so new states should be added to `e2e/accessibility.spec.ts` when they are built.
- A new colour pair must be added to the table in `src/theme/contrast.test.ts` if it puts text on a background not listed there.
- An axe upgrade can add rules and fail a previously green build; fix the finding (or, if it is a false positive, disable that one rule in the spec with a comment saying why).
