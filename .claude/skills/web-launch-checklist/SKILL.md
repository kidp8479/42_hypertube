---
name: web-launch-checklist
description: Pre-ship checklist for web UIs - the finishing steps a vibe-coded app usually skips (404 page, loading / error states, responsive, accessibility, performance, then SEO / legal / analytics for public products). Use before calling a web project "done", before a demo or evaluation, or when the user says "checklist de fin", "c'est pret a livrer ?", "web launch".
---

# web-launch-checklist

Complements `web-security-review` (auth, data, headers). This one covers
the quality and polish a working app still lacks. Verify each item in the
running app or the code, do not assume. Report PASS / FAIL / N/A per item
with the file or URL as evidence, then fix the FAILs that are cheap.

## Step 1: pick the tier

- **Always**: every web UI, 42 projects included.
- **Public product**: only if the site is publicly reachable and meant to be
  found or shared. A local demo or an evaluation-only app skips this tier
  (mark N/A, do not build it).

## Always

1. **404 page** custom, with a link home. Unknown routes must not show a
   blank screen or a raw framework error. Add a 500 / error boundary too.
2. **Loading states** on every async fetch (skeleton or spinner), no layout
   jump.
3. **Error states**: failed requests show a human message and a way to
   retry. No raw stack trace, no silent failure.
4. **Empty states**: lists with no data say so.
5. **Responsive**: usable at 360px width, no horizontal scroll, touch
   targets large enough.
6. **Accessibility**: `lang` on `<html>`, `alt` on every meaningful image
   (empty `alt=""` on decorative ones), labels tied to form inputs, visible
   focus, full keyboard navigation, sufficient contrast.
7. **Per-page `<title>`** and a `viewport` meta (cheap, also helps tabs and
   history).
8. **Favicon** present (no 404 on `/favicon.ico`).
9. **Forms**: real submission, validation messages, disabled / pending
   state while sending, success feedback. No dead "contact" form.
10. **Images**: webp / avif, sized to their display, `loading="lazy"`
    below the fold.
11. **Performance**: run Lighthouse (or equivalent) once; note the score,
    fix the obvious (bundle size, unoptimized images, blocking scripts).
12. **No secrets or debug output in the client bundle**; no `console.log`
    left; env vars only through the project's `.env` convention.

## Public product only

13. **Meta description** on each page.
14. **Open Graph / Twitter card**: `og:title`, `og:description`,
    `og:image` (absolute URL).
15. **`robots.txt`** and **`sitemap.xml`**; canonical URL per page.
16. **Legal**: terms / privacy page, legal notice where required.
17. **Cookies / consent**: a banner only if non-essential trackers are
    set (GDPR / ePrivacy); essential session cookies do not need one.
18. **Analytics**, ideally privacy-friendly and behind consent when needed.
19. **Monitoring**: error reporting wired, so production failures are seen.

## Output

A table: item, tier, PASS / FAIL / N/A, evidence. Finish with the FAILs
ordered by effort, and fix the quick ones in separate atomic commits
unless the user says otherwise.
