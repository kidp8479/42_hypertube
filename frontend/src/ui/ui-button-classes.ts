// The button look as Tailwind classes, shared by `Button` and the links that
// must look like one (a link that navigates away has to stay an anchor).

/** `solid` is the one main action of a screen, `outline` is any other. */
export type ButtonVariant = 'solid' | 'outline';

// Disabled stays readable: muted text on an edge-coloured border.
const BASE =
  'min-h-target cursor-pointer border px-4 py-3 text-center font-mono text-sm leading-label font-medium tracking-label no-underline disabled:cursor-not-allowed disabled:border-edge disabled:bg-transparent disabled:text-muted';

// Resting colours live only here, never in BASE: two utilities setting the same
// property on one element resolve by stylesheet order, not class order.
const VARIANTS: Record<ButtonVariant, string> = {
  outline: 'border-ink text-ink hover:not-disabled:bg-ink/8',
  solid: 'border-ink bg-ink text-bg hover:not-disabled:bg-ink-hover',
};

/** The class list that makes an element look like a button of `variant`. */
export function buttonClasses(variant: ButtonVariant): string {
  return `${BASE} ${VARIANTS[variant]}`;
}
