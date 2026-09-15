# Vendored libraries

Two, both MIT, both single files, both loaded only by `/` (`index.html`), both
feature-guarded in `assets/home.js` with `window.X &&`. Delete either file and
the landing page works exactly as before — that is the test that keeps them
here. Never load these from a CDN in production.

| File | Library | Version | Licence | Retrieved | Source |
|---|---|---|---|---|---|
| `rough-notation.iife.js` | rough-notation | 0.5.1 | MIT | 2026-09-15 | https://cdnjs.cloudflare.com/ajax/libs/rough-notation/0.5.1/rough-notation.iife.min.js |
| `confetti.browser.min.js` | canvas-confetti | 1.9.3 | MIT | 2026-09-15 | https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js |

What they do, and the whole of what they are allowed to do:

- **rough-notation** scribbles one hand-drawn circle around the hero number
  when the visitor enters their birthday. One annotation per page, removed
  before it is redrawn, never on `/work/`.
- **canvas-confetti** fires once, in the page's own four colours, only when the
  entered date's patch is 0 — the day it is actually someone's birthday. Never
  on load, never on every input, never on `/work/`.

Both are no-ops under `prefers-reduced-motion: reduce`. The delight on this
site is the number being large, the copy being funny, and the themes; if either
of these ever starts feeling like the point, delete it.
