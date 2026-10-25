// Layout classes the auth pages share.

/** The centred column of an auth page; each page adds its own max width. */
export const AUTH_COLUMN = 'mx-auto my-12 flex flex-col gap-4';

/** The links under a form. Each one is a tap target, 24px tall at least (WCAG 2.2). */
export const AUTH_LINKS =
  'flex flex-wrap justify-between gap-3 text-base [&_a]:inline-block [&_a]:min-h-target [&_a]:py-1';
