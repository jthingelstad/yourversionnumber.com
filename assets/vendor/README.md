# Vendored libraries

One, MIT, a single file, loaded only by `/` (`index.html`), feature-guarded in
`assets/home.js` with `window.confetti &&`. Delete the file and the landing
page works exactly as before — that is the test that keeps it here. Never load
it from a CDN in production.

| File | Library | Version | Licence | Retrieved | Source |
|---|---|---|---|---|---|
| `confetti.browser.min.js` | canvas-confetti | 1.9.3 | MIT | 2026-09-15 | https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js |

What it does, and the whole of what it is allowed to do:

- **canvas-confetti** fires once, in the page's own four colours, only when the
  entered date's patch is 0 — the day it is actually someone's birthday. Never
  on load, never on every input, never on `/work/`.

It is a no-op under `prefers-reduced-motion: reduce`. The delight on this site
is the number being large, the copy being funny, and the themes; if this ever
starts feeling like the point, delete it. (rough-notation used to sit beside it,
circling the hero number; it was removed in September 2026.)
