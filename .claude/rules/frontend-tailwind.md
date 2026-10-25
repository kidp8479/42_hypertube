---
paths:
  - "frontend/src/**/*.tsx"
  - "frontend/src/**/*-classes.ts"
  - "frontend/src/styles/**/*.css"
---

# Tailwind and UI conventions (frontend)

Additions to ADR-0012 (Tailwind v4 on top of the design tokens), which
wins where it covers a topic.

## Styling

- Classes use project tokens only. Tailwind's default palette and type
  scale are reset, so a default class (a stock colour or size) generates
  no CSS: take the name from the design tokens file (ADR-0012).
- No arbitrary value (`bg-[#...]`, `p-[13px]`) and no `style={{...}}`
  unless the value is computed at runtime. Both bypass the tokens.
- A class list shared by two components moves to a `<name>-classes.ts`
  function, not `@apply`. A variant's colours live only in the variant.
- Order a class list by family: layout, spacing, sizing, typography,
  colour, state (`hover:`, `focus-visible:`), then breakpoints.
- Mobile first: the base classes are the narrow layout, `md:` / `lg:` add
  the wider one.
- Reuse the shared UI components (ADR-0006: look-and-feel with no
  domain) before writing a new control, and put a new one of that kind
  there too.

## Accessibility

- An action is a `<button>`, a navigation is a link; never a clickable
  `div`.
- Landmarks where they fit: `header`, `nav`, `main`, `section`, `footer`.
- Never `outline-hidden` / `outline-*` on a focusable element: it removes
  the shared focus ring (WCAG 2.4.7, see ADR-0012).
- An icon-only control has an `aria-label` (translated); a decorative
  image has `alt=""`.
- Every form input has a visible label tied to it, and its error message
  is linked with `aria-describedby`.
