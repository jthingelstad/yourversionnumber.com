# Agent guide — yourversionnumber.com

A bookmarkable static page that displays people's "version numbers" (`MAJOR.MINOR.PATCH` from a birthday or job-start date). Read this before making non-trivial changes.

## What it is

- Single-page static site, **two editions**:
  - **Birthday edition** at `/` — `MAJOR.MINOR.PATCH` is decade / year-in-decade / days since last birthday. People in URL via `?p=Name:YYYY-MM-DD`.
  - **Work edition** at `/work/` — `YEARS.QUARTERS.DAYS` (business days only). Roles in URL via `?j=Title:YYYY-MM-DD`.
- **No build step**, no framework, no bundler.
- Deployed via GitHub Pages from `main` / repo root.
- Vanilla JS module per edition. Vanilla CSS. One stylesheet per theme.

## Layout

```
index.html                 birthday edition shell
assets/
  app.js                   birthday behavior — parsing, render, dialogs, animation
  base.css                 reset, layout, neutral dialog & theme-fx styles
themes/<name>.css          one standalone stylesheet per birthday theme

work/
  index.html               work edition shell
  assets/app.js            work behavior (deliberate near-duplicate of birthday)
  assets/base.css          same neutral chrome
  themes/<name>.css        one standalone stylesheet per work theme

themes-preview.html        dev tool: iframes every theme in both editions
README.md                  user-facing docs
CONTRIBUTING.md            theme contributor guide
```

The two `app.js` files are deliberately parallel. Keep their logic in sync when a change makes sense for both editions.

## Core conventions (do not break these)

1. **URL is the single source of truth.** Birthday: `?theme=...&p=Name:YYYY-MM-DD`. Work: `?theme=...&j=Title:YYYY-MM-DD`. Each bookmark is self-contained. Do not add `localStorage`/cookies/IndexedDB for theme or people — different bookmarks intentionally have different themes, and persisting either would cause surprising bleed between bookmarks.
2. **No build tooling.** No bundler, no transpiler, no SSG, no `package.json`. The user explicitly prefers lean over conventional. If a feature seems to need tooling, push back; usually it doesn't.
3. **Themes are CSS-only.** No per-theme JS. When a theme idea can't be expressed in CSS, the answer is to add a *generic* hook in core `app.js` that all themes can opt into via CSS — that's how we got `.theme-fx`, `data-row-variant`, `--row-hue`, version-event flags, etc. Per-theme JS would create lifecycle/teardown bugs, cross-theme conflicts, review burden, and a real privacy risk: birthdays live in the URL and an accepted-but-malicious theme could beacon them. Don't open that door.
4. **Themes paint display only.** Header, person rows, footer, empty-state CTA, and the `.theme-fx` decorative layer. They do **not** style the About or Edit dialogs — those are app chrome with a neutral OS-light/dark look in `base.css`. Selectors under `.app-dialog` are off-limits.
5. **Person rows have no editing affordances.** No inline inputs, no click-to-edit. Editing is gated behind the header's Birthdays/Roles button (class `.edit-btn`) → `<dialog>`. Visual hover effects (tilt, scale, glow) are fine — the rule is no *editing* affordances on rows, not no animation.
6. **Theme manifest at the top of each `app.js`.** Flat array. Each entry: `{ name, label, kind, animate, swatch }`. `kind` drives `<optgroup>` headers (`light|dark|fun|retro`). `animate: true` opts into count-up. `swatch` is a 3-color array (e.g. `['#0f0f10', '#222', '#fafafa']`) used for the picker chip.

## Themable hooks (for theme authors)

**Body data-attrs:**
- `data-people-count="0|1|many"` — empty / solo / group views.
- `data-birthday="true"` (birthday edition) — anyone is on patch 0 today.
- `data-quarter-start="true"` / `data-tenure-anniversary="true"` (work edition).
- `data-palindrome="true"` — concatenated digits read the same forward and back.
- `data-round-decade="true"` — anyone hit a clean decade today.
- `data-zero="true"` (birthday edition) — anyone is on `v0.0.0`.
- `data-mode="work"` (work edition only).

**Per-row hooks (on `.person`):**
- `data-row-index="0..N"` — render order.
- `data-row-variant="0..7"` — **deterministic** hash of name+birthday. Stable: Alice always looks like Alice even after Bob is added above her. Use for varying per-row content (`::after` reactions, avatars, timestamps, route bullets, weather icons, …).
- `--row-hue` (0..359) and `--row-tilt` (≈±1.8deg) — inline CSS vars from the same hash.
- `.is-bumping` class added briefly to every row at midnight when patch increments (~1.2 s; skipped under `prefers-reduced-motion`).

**Decorative effects layer (`.theme-fx`):**
- A `position: fixed; inset: 0; pointer-events: none; overflow: hidden` div appended on every render. Themes paint motion (falling leaves, drifting waves, confetti, scanlines, shooting stars, gear silhouettes, …) into `.theme-fx::before` and `.theme-fx::after`.
- Empty by default; themes that don't use it leave it untouched.

**Class hooks:** `.person`, `.person-name`, `.version`, `.site-header`, `.site-title`, `.intro`, `.add-btn`, `.about-btn`, `.edit-btn`, `.theme-select`, `.theme-swatch`, `.theme-picker`, `.site-footer`, `.site-cross-link`, `.site-attribution`, `.site-stats`.

**Off-limits** (app chrome, styled in `base.css`):
- Anything matching `.app-dialog*`, `.edit-row*`, `.edit-list`, `.edit-add`.

## Animation

- **Count-up** runs only on initial page-load render. Gated by `THEMES[i].animate`, an `isFirstRender` flag, and `prefers-reduced-motion`.
- **Midnight tick** re-renders at the day boundary; afterwards every `.person` gets `.is-bumping` for ~1.2 s. Skipped under `prefers-reduced-motion`.
- **`.theme-fx` motion** must respect `prefers-reduced-motion`. `base.css` kills animations on `.theme-fx`, its pseudo-elements, and `.is-bumping` under that setting; theme-specific keyframes elsewhere should self-guard.

## Local development

```sh
npx live-server
```

Opens at `http://localhost:8080/`. Visit `/` for the birthday edition and `/work/` for the work edition. There is no test suite. Verify changes by opening the page in a browser and walking the relevant flows.

## Verifying changes

1. `node --check assets/app.js && node --check work/assets/app.js`.
2. **Open `themes-preview.html`** under `live-server` (`http://localhost:8080/themes-preview.html`). It iframes every theme in both editions side-by-side with shared rosters. Walk the page and eyeball every theme. Switch the roster selector to exercise edge cases (empty / solo / `data-birthday` / `data-round-decade` / `data-quarter-start`).
3. Open both editions directly to confirm the change in the relevant flow (initial render, Edit dialog, About dialog, theme switch, midnight tick).
4. Test 3+ rows to confirm `data-row-variant` produces visible per-row variation where it should.
5. Birthday edition: confirm `?p=:YYYY-MM-DD` (legacy unnamed) and `?p=YYYY-MM-DD` (current unnamed) both still parse.
6. Toggle OS reduced-motion and confirm `.theme-fx` motion and `.is-bumping` go quiet.

`themes-preview.html` reads each edition's manifest live by fetching `app.js` and regexing `THEMES`. New themes show up automatically once registered. If you change the manifest format, update the regex in the preview script too.

## What to avoid

- Per-theme JS files (see core convention 3). Add a generic core hook instead.
- State persistence (`localStorage`, cookies, IndexedDB).
- Theming inside `.app-dialog`.
- Reintroducing inline edit controls on person rows.
- Mass-refactoring themes into shared partials or mixins. Themes intentionally have full freedom; that's the point.
- Adding dependencies. There is no `package.json`, and we'd like to keep it that way.

## Privacy

Birthdays in the URL are visible to anyone with the link and to browser history sync. Do not store sensitive data. Don't add any feature that exfiltrates birthdays beyond the URL the user chose to share. This is the primary reason themes are CSS-only — a JS-capable theme could read URL params and beacon them.

## Cache behavior

GitHub Pages serves with `Cache-Control: max-age=600` plus `ETag`; browsers revalidate every 10 min. There is no asset hashing. For deploys that couple JS and CSS in a way that would visibly break mid-rollout, manually bump a `?v=N` query on the affected `<link>`/`<script>` tags in the relevant `index.html`. Don't reach for build tooling to automate this.
