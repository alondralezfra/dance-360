# 0005. Theme tokens instead of raw colours

- Status: Accepted
- Date: 2026-11-03

## Context
The goal is component-based UI with themes and consistency. Tailwind alone gives utility classes, not a design system; the prototype hard-coded palette colours (`bg-indigo-600`) and hex values in the canvas.

## Decision
Semantic CSS-variable tokens (`--primary`, `--surface`, `--border`, ...) are defined per theme in `src/index.css` and exposed to Tailwind via `@theme inline`. Components use `bg-primary`, never palette names or hex (enforced). The theme is the `data-theme` attribute on `<html>`. The Konva canvas reads the same variables (`useCanvasTheme`). Shared controls live in `components/ui/` using `class-variance-authority`.

## Consequences
Restyling or adding a theme is a CSS-only change. New colours need a token first. Part colours (user data) will be the exception: they are dynamic values, not theme tokens.
