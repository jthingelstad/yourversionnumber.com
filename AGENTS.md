# Agent guide — yourversionnumber.com

A bookmarkable static page that displays people's "version numbers" (`MAJOR.MINOR.PATCH` from a birthday). Read this before making non-trivial changes.

## What it is

- Single-page static site. **No build step**, no framework, no bundler.
- Deployed via GitHub Pages from `main` / repo root.
- Vanilla JS module. Vanilla CSS. ~500 lines of JS, one stylesheet per theme.

## Layout

```
index.html              minimal shell + Tinylytics embed
assets/
  app.js                all behavior — parsing, render, dialogs, animation
  base.css              reset, layout, neutral dialog styles
themes/<name>.css       one standalone stylesheet per theme (18 today)
README.md               user-facing docs
CONTRIBUTING.md         theme contributor guide
```

## Core conventions (do not break these)

1. **URL is the single source of truth.** `?theme=...` and `?p=Name:YYYY-MM-DD` (or just `?p=YYYY-MM-DD`) is the entire app state. Each bookmark is self-contained. Do not add `localStorage` for theme or people — different bookmarks intentionally have different themes, and persisting either would cause surprising bleed between bookmarks.
2. **No build tooling.** No bundler, no transpiler, no SSG. The user explicitly prefers lean over conventional. If a feature seems to need tooling, push back; usually it doesn't.
3. **Themes paint display only.** Header, person rows, footer, empty-state CTA. They do **not** style the About or Edit dialogs — those are app chrome with a neutral OS-light/dark look in `base.css`. Selectors under `.app-dialog` are off-limits for themes.
4. **Person rows are display-only.** No inline inputs, no hover affordances, no click-to-edit. Editing is gated behind the header's Birthdays button (class `.edit-btn`) → `<dialog>`. Rows render `.person-name` (when set) plus `.version`. Nothing else.
5. **Theme manifest in `app.js`.** A flat array at the top of `assets/app.js`. Each entry has `{ name, label, kind, animate }`. `kind` drives `<optgroup>` headers in the picker. `animate: true` opts into count-up.

## Themable hooks (for theme authors)

- `body[data-people-count="0|1|many"]` — solo vs group views.
- `body[data-birthday="true"]` — at least one person on the page is on `patch === 0` today.
- `.person-name`, `.version` inside `.person`.
- `.about-btn`, `.edit-btn` — header buttons; theme rules pair them.
- `.add-btn` — empty-state CTA.
- `.theme-select`, `.site-header`, `.site-title`, `.site-footer`, `.intro`.

Off-limits (app chrome, styled in `base.css`):
- Anything matching `.app-dialog*`, `.edit-row*`, `.edit-list`, `.edit-add`.

## Animation

- Count-up runs **only on initial page-load render**, gated by `THEMES[i].animate` and `prefers-reduced-motion`. Implementation uses an `isFirstRender` flag set to `false` after the bootstrap render.
- A midnight `setTimeout` re-renders so a tab left open advances the patch number at the day boundary. No animation on midnight tick.

## Local development

```sh
npx live-server
```

Opens `http://localhost:8080/` with live reload. There is no test suite. Verify changes by opening the page in a browser and walking the relevant flows.

## Verifying changes

1. `node --check assets/app.js` for JS syntax.
2. Open the live page; confirm the change in the relevant flow (initial render, Edit dialog, About dialog, theme switch, empty state, midnight, etc.).
3. Walk a sample of themes (at least one each of light/dark/fun/retro) to ensure layout and chrome still look intended.
4. Check `?p=:YYYY-MM-DD` (legacy unnamed form) and `?p=YYYY-MM-DD` (current unnamed form) both still parse.

## What to avoid

- Adding state persistence (localStorage, cookies, IndexedDB).
- Adding theming inside `.app-dialog`.
- Reintroducing inline edit controls on person rows.
- Mass-refactoring themes into shared partials. Themes intentionally have full freedom; that's the point.
- Adding dependencies to `package.json` (there is no `package.json` and we'd like to keep it that way).

## Privacy

Birthdays in the URL are visible to anyone with the link and to browser history sync. Do not store sensitive data. Don't add any feature that exfiltrates birthdays beyond the URL the user chose to share.
