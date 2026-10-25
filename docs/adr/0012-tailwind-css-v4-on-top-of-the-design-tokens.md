# Tailwind CSS v4 on top of the design tokens

**Date:** 2026-10-25 · **Status:** accepted

The frontend is styled with Tailwind CSS v4 utility classes. The design tokens
of HYP-66 (`frontend/src/styles/tokens.css`) are the Tailwind theme (`@theme`),
and Tailwind's default palette, fonts, type scale and radii are reset, so a
class can only use a project token. There is no JavaScript config: the
`@tailwindcss/vite` plugin reads `styles/app.css`. No CSS Modules remain.

## Why

- **No styling system had been chosen.** ADR-0006 left CSS Modules as a
  default. HYP-19 (base layout), HYP-87 (profile pages) and the rest of HYP-66
  were about to add most of the app's CSS; switching later would mean
  migrating all of it.
- **The tokens become the only vocabulary.** With the defaults reset,
  `text-ink` exists and `text-red-500` does not: an off-palette colour or an
  off-scale size generates no CSS, so it shows up as unstyled in the browser
  instead of shipping as a one-off value. An arbitrary value (`bg-[#f00]`)
  still bypasses the theme and is a review point. Space keeps Tailwind's 4px
  step, the scale the tokens already used.
- **Styles sit with the markup.** A component is one file, and a deleted
  component cannot leave an orphan stylesheet behind.
- **An internship skill.** Tailwind is common in React codebases, which is the
  rule ADR-0006 sets for adopting a tool.

## Decisions inside it

- **v4, CSS-first.** The theme is plain CSS variables in `@theme`, which keeps
  `tokens.css` readable as the identity's single source and leaves no
  `tailwind.config.js` to keep in step with it.
- **`base.css` inside `@layer base`.** Unlayered CSS beats every layer, so an
  element rule outside the layer would override the utilities on that element.
- **Shared looks are class-list functions, not `@apply`.** `buttonClasses()`
  gives a `<button>` and a link that must stay an anchor the same look. Two
  utilities setting the same property resolve by stylesheet order, not class
  order, so a variant's colours live only in the variant, never in the base
  list.
- **The focus ring stays a plain `:root` variable.** It is not a utility
  value, so it is not in `@theme`.

## Alternatives considered

- **Keep CSS Modules**: works, but the tokens stay a convention a module can
  ignore, and each component carries a second file.
- **Tailwind v3 with a JS config**: the theme would live in JavaScript, away
  from the contrast notes in `tokens.css`.
- **CSS-in-JS (styled-components, Emotion)**: a runtime cost and a second
  styling model for no gain at this size.

## Consequences

- Class lists are long on some elements; a list reused by two components
  moves to a `*-classes.ts` file next to them.
- A token added to `tokens.css` is a new class at once. One removed is not a
  build error: the classes using it silently generate nothing, so grep for
  them first.
- Tailwind's reset (preflight) leaves `h2`-`h6` at the body size and strips
  list markers; `base.css` only sizes `h1`. A page that adds a section title
  or a bulleted list styles it with classes.
- The shared focus ring is in the base layer, so a utility wins over it: an
  `outline-hidden` or `outline-*` class removes the keyboard focus indicator
  (WCAG 2.4.7). Never put one on a focusable element.
- Vitest no longer processes CSS (the `css: true` option was there for CSS
  Modules imports).
- The new dependency needs `npm ci` in the frontend container after the pull
  (HYP-86).
