# Agent guide — yourversionnumber.com

A bookmarkable static page that displays people's "version numbers" (`MAJOR.MINOR.PATCH` from a birthday or job-start date). Read this before making non-trivial changes.

## What it is

- Single-page static site, **two editions**:
  - **Birthday edition** at `/birthday/` — `MAJOR.MINOR.PATCH` is decade / year-in-decade / days since last birthday. People in URL via `?p=Name:YYYY-MM-DD`. Lived at `/` until September 2026; old `/?p=...` bookmarks were deliberately allowed to break.
  - **Work edition** at `/work/` — `YEARS.QUARTERS.DAYS` (business days only). Roles in URL via `?j=Title:YYYY-MM-DD`.
- **No build step**, no framework, no bundler.
- Static files on S3 behind CloudFront. No server-side code of any kind. A push to `main` validates, then syncs the repo to the bucket.
- Vanilla JS module per edition. Vanilla CSS. One stylesheet per theme.

## Layout

```
index.html                 landing page — the front door, links to both editions
about/index.html           concept, math, privacy model, contributing
themes/index.html          theme gallery — all 28, previewed with the visitor's number
card/new/index.html        the card composer — builds a link, nothing else
deploy.sh                  the same S3 sync CI runs, by hand
assets/
  site.css                 neutral site chrome shared by the three spine pages
  gallery.js               builds gallery cards from each edition's THEMES manifest

assets/
  themes.js                the one theme manifest, imported by both editions
  themes/<name>.css        one standalone stylesheet per theme, shared
  core.js                  the seven core hooks, the chime synthesiser, card read/write

birthday/
  index.html               birthday edition shell
  assets/app.js            birthday behavior — parsing, render, dialogs, animation
  assets/base.css          reset, layout, neutral dialog & theme-fx styles

work/
  index.html               work edition shell
  assets/app.js            work behavior (deliberate near-duplicate of birthday)
  assets/base.css          same neutral chrome

themes-preview.html        dev tool: iframes every theme in both editions
README.md                  user-facing docs
CONTRIBUTING.md            theme contributor guide
```

The two `app.js` files are deliberately parallel. Keep their logic in sync when a change makes sense for both editions.

## The spine

`/`, `/about/`, `/examples/` and `/themes/` are the unthemed layer, sharing
`assets/site.css`. Site nav lives here and only here — putting it inside a themed
edition would mean 28 stylesheets each deciding what the nav looks like.

**Unthemed does not mean undesigned.** The first version of this layer used
system fonts and grey rules on the theory that neutral chrome would not fight the
the themes. It read as bland next to them, and the contrast was jarring rather
than calm. `site.css` is now the forty-third design — the one you cannot swap:

- Space Grotesk for display and body, JetBrains Mono for anything numeric.
  Imported once at the top of `site.css`, not linked from four `<head>`s.
- Warm cream and pink, taken from the birthday theme, so the front door looks
  related to what is behind it. Full dark counterpart.
- The motif is the product: dotted three-part numbers in mono with the
  separators in accent (`.vnum`, `.vnum .dot`). Section headings get their own
  version tags from a CSS counter on `h2::before`, so the numbering cannot drift
  from the markup.
- The landing hero computes the site's own version number from its 2026-05-01
  launch date (`assets/site.js`). It demonstrates the idea rather than
  describing it, and stays true without maintenance.

Keep new spine pages inside this system. If chrome needs to recede, it is
because a theme preview sits next to it — that is what `--surface-sunk` and the
card borders are for, not a reason to drain the colour out again.

Two duplications in this layer are deliberate:

- **The analytics privacy shim is inlined in all five HTML files.** It must run
  before the tinylytics embed, and inline script cannot half-load. Moved to an
  external file it could 404 while the embed still fires, leaking the dates in
  the query string. Copies are cheaper than that failure mode. `validate-site.mjs`
  checks every page still has it.
- **Nav and footer markup are repeated across the three spine pages.** Removing
  that would take a build step, which convention 2 rules out; three copies of a
  rarely-touched nav is the smaller cost. Revisit if the spine outgrows ~6 pages.

### The examples page uses real people

`/examples/` links to eight rosters built from public figures' birthdays. Two
rules, both load-bearing:

- **Everyone on it must be living.** A version number that keeps incrementing
  for someone who has died is the wrong artefact to publish. Dolly Parton was in
  the first draft of this page; she died on 2026-08-25, two weeks before it was
  written, which is exactly how this fails.
- **Verify against sources, not memory.** Dates were checked on 2026-09-08.
  Every birthday on the page was confirmed, and one (Rasmus Lerdorf) was wrong
  from memory and corrected.

That makes this the one page on the site that rots on its own. Re-check the
roster periodically; when someone dies, replace the whole grouping rather than
swapping a person, so the sizes 1-8 stay covered. `validate-site.mjs` enforces
that every size from 1 to 8 is present and that each preview has a static link,
but it cannot know whether anyone is still alive.

The gallery does *not* hardcode theme cards. `assets/gallery.js` scrapes the
`THEMES` array out of each edition's `app.js` at runtime, so adding a theme stays
a two-step job. That is why every theme entry needs a `blurb`.

## Cards

A card is a view with one person and a signed note, and it lives in the URL like
everything else:

```
/birthday/?theme=departures&card=Sara:1984-03-09&from=Jamie&note=Four%20whole%20decades.
/work/?theme=timesheet&card=Sara:2019-09-03&from=Jamie&note=Five%20years.
```

- `card=Name:YYYY-MM-DD` takes the place of `p=`/`j=` and is what puts the page
  in card mode: `body[data-card]` is set, the roster/picker/edit controls hide,
  and `.card-message` (recipient, note, from) renders under the number. Both
  `from` and `note` are optional.
- `readCardData()` and `cardURL()` in `core.js` are the reader and the writer.
  The composer builds with one, the editions parse with the other, so the two
  cannot drift. The edition applies the same real-date/not-future checks to
  the card's date that it applies to a `p=` entry.
- Limits (`CARD_LIMITS`: name 40, from 40, note 140) are clipped on read, not
  rejected — a long link still renders. Free text is rendered with
  `textContent`, never `innerHTML`.
- The composer's preview is an iframe of the real link. There is no second
  renderer.

**History, so nobody rebuilds it.** From 2026-09-09 to 2026-09-14 cards were
server-side: `POST /api/card` wrote DynamoDB, `/c/<code>` was a Lambda that
returned per-card `og:` tags, and `/og/<code>/<date>.png` was a headless-Chromium
screenshot Lambda. It existed for one thing — per-card link previews, since
crawlers do not run JS — and it cost an unauthenticated public write endpoint,
a database of other people's names and notes, and 75 MB of Chromium whose
source never made it into the repo. Four cards were ever created, all in QA.
It was torn down on 2026-09-14. The trade accepted: a card link unfurls with
the edition's generic image and title, not the recipient's name. If per-card
unfurls are ever wanted again, the right shape is a single *stateless* function
that reads the card from the query string and emits `og:` tags with a static
per-theme image — no writes, no table, no Chromium. Build it after someone
other than Jamie has sent a card, not before.

**Anything a theme renders must survive a bare font environment.** A glyph that
is not in one of the theme's own imported faces renders as tofu on machines
without it. Guard B covers the pictograph ranges; geometric shapes like `▸` and
`▶` are not caught and must be drawn or replaced with ASCII.

## Core conventions (do not break these)

1. **URL is the single source of truth — for everything, cards included.** Birthday: `?theme=...&p=Name:YYYY-MM-DD`. Work: `?theme=...&j=Title:YYYY-MM-DD`. Card: `?theme=...&card=Name:YYYY-MM-DD&from=...&note=...`. Each link is self-contained and the site stores nothing, anywhere, ever. This was broken once (server-side cards, September 2026) and reverted within a week; see *Cards* above before proposing anything that writes. Do not add `localStorage`/cookies/IndexedDB for theme or people — different bookmarks intentionally have different themes, and persisting either would cause surprising bleed between bookmarks. The one exception is `yvn-about-seen` / `yvnw-about-seen` — a single boolean each that lets the About dialog auto-open once for new visitors. No PII, no app state.
2. **No build tooling.** No bundler, no transpiler, no SSG, no `package.json`. The user explicitly prefers lean over conventional. If a feature seems to need tooling, push back; usually it doesn't.
3. **Themes are CSS-only.** No per-theme JS. When a theme idea can't be expressed in CSS, the answer is to add a *generic* hook in core `app.js` that all themes can opt into via CSS — that's how we got `.theme-fx`, `data-row-variant`, `--row-hue`, version-event flags, etc. Per-theme JS would create lifecycle/teardown bugs, cross-theme conflicts, review burden, and a real privacy risk: birthdays live in the URL and an accepted-but-malicious theme could beacon them. Don't open that door.
4. **Themes paint display only.** Header, person rows, footer, empty-state CTA, and the `.theme-fx` decorative layer. They do **not** style the About or Edit dialogs — those are app chrome with a neutral OS-light/dark look in `base.css`. Selectors under `.app-dialog` are off-limits.
5. **Person rows have no editing affordances.** No inline inputs, no click-to-edit. Editing is gated behind the header's Birthdays/Roles button (class `.edit-btn`) → `<dialog>`. Visual hover effects (tilt, scale, glow) are fine — the rule is no *editing* affordances on rows, not no animation.
6. **One theme manifest, `assets/themes.js`.** Both editions import it; neither carries its own copy. Each entry: `{ name, label, home, animate, chime, card, blurb }`. `home` is `'birthday' | 'work' | null` and controls **ordering only** — every theme is selectable in both editions, natives first in each picker. `kind` and `<optgroup>`s are retired; the picker is a flat list. `animate: true` opts into count-up; `chime` names a sound core plays on the midnight tick; `card: true` means the theme styles `.card-message` in its own voice.

## Themable hooks (for theme authors)

**Body data-attrs:**
- `data-people-count="0|1|many"` — empty / solo / group views.
- `data-birthday="true"` (birthday edition) — anyone is on patch 0 today.
- `data-quarter-start="true"` / `data-tenure-anniversary="true"` (work edition).
- `data-palindrome="true"` — concatenated digits read the same forward and back.
- `data-round-decade="true"` — anyone hit a clean decade today.
- `data-zero="true"` (birthday edition) — anyone is on `0.0.0`.
- `data-mode="work"` (work edition only).

**Per-row hooks (on `.person`):**
- `data-row-index="0..N"` — render order.
- `data-row-variant="0..7"` — **deterministic** hash of name+birthday. Stable: Alice always looks like Alice even after Bob is added above her. Use for varying per-row content (`::after` reactions, avatars, timestamps, route bullets, weather icons, …).
- `--row-hue` (0..359) and `--row-tilt` (≈±1.8deg) — inline CSS vars from the same hash.
- `.is-bumping` class added briefly to every row at midnight when patch increments (~1.2 s; skipped under `prefers-reduced-motion`).

**Decorative effects layer (`.theme-fx`):**
- A `position: fixed; inset: 0; pointer-events: none; overflow: hidden` div appended on every render. Themes paint motion (falling leaves, drifting waves, confetti, scanlines, shooting stars, gear silhouettes, …) into `.theme-fx::before` and `.theme-fx::after`.
- Empty by default; themes that don't use it leave it untouched.

**Core hooks (phase 2 — core computes, themes opt in from CSS):**
- `data-edition="birthday|work"` on `body`. Branch only where the *language* differs — a label, a unit, a joke that lands one way. If a theme needs a different structure per edition, the theme is wrong.
- `--version-size` / `--version-leading` on `.version`. Set these instead of overriding the base clamp; `!important` in a theme now fails CI.
- `--major`, `--minor`, `--patch` on each `.person` — unitless, so `calc()` works. Not usable in `content:`; that is what the digit spans are for.
- `--patch-pct` (0–1) on each `.person` and on `body` from the first row. Birthday: patch ÷ that person's own year length, so leap years handle themselves. Work: patch ÷ business days in the quarter.
- **Per-digit spans.** `.version` contains one `.digit` per character (`52` is two) with `data-d` carrying the value, and `.sep` for the dots. `.version` carries an `aria-label` with the whole number so screen readers announce one thing. `base.css` gives `.digit` only `display: inline-block`, and `.version` `white-space: nowrap` — without that the number breaks mid-value in narrow themes.
- `data-weekday` (`sun`…`sat`) and `data-season` (`spring|summer|autumn|winter`) on `body`, from the visitor's local date.
- `--days-until` and `data-countdown` on `body`, present **only** when the next date is within 7 days — so `body[data-countdown]` is a clean "is this imminent" selector. Every theme should say something of its own; `base.css` prints a plain `.countdown` line until one does.

**Class hooks:** `.person`, `.person-name`, `.version`, `.digit`, `.sep`, `.countdown`, `.site-header`, `.site-title`, `.intro`, `.add-btn`, `.about-btn`, `.edit-btn`, `.theme-select`, `.theme-picker`, `.site-footer`, `.site-cross-link`, `.site-attribution`, `.site-stats`.

**Off-limits** (app chrome, styled in `base.css`):
- Anything matching `.app-dialog*`, `.edit-row*`, `.edit-list`, `.edit-add`.

## Animation

- **Count-up** runs only on initial page-load render. Gated by `THEMES[i].animate`, an `isFirstRender` flag, and `prefers-reduced-motion`.
- **Midnight tick** re-renders at the day boundary; afterwards every `.person` gets `.is-bumping` for ~1.2 s. Skipped under `prefers-reduced-motion`.
- **Chime** is named by the manifest and played by core — never by a theme, so no contributor ever ships audio. Synthesised with WebAudio oscillators: no files, no network, no assets. All four conditions must hold before it fires: (1) only on the midnight tick, never on load or theme switch; (2) only after the visitor has interacted with the page, since WebAudio refuses otherwise; (3) never under `prefers-reduced-motion`; (4) peak gain ≤ 0.15, because this fires on a page someone left open overnight.
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
- State persistence (`localStorage`, cookies, IndexedDB) for app data. The `yvn-about-seen` / `yvnw-about-seen` flags are the only allowed exception — a single boolean each, used solely to auto-open the About dialog on first visit.
- Theming inside `.app-dialog`.
- Reintroducing inline edit controls on person rows.
- Mass-refactoring themes into shared partials or mixins. Themes intentionally have full freedom; that's the point.
- Adding dependencies. There is no `package.json`, and we'd like to keep it that way.

## Privacy

Birthdays in the URL are visible to anyone with the link and to browser history sync. Do not store sensitive data. Don't add any feature that exfiltrates birthdays beyond the URL the user chose to share. This is the primary reason themes are CSS-only — a JS-capable theme could read URL params and beacon them.

The tinylytics analytics embed normally posts `window.location.href` to its collector — which would leak `?p=` and `?j=` content. Both `index.html` files install a `fetch` interceptor before the deferred tinylytics script loads that strips `url` and `referrer` from any request to `tinylytics.app/collector/`. Only the path counts. If you swap the analytics provider, port the same scrubber.

## Cache behavior

CloudFront in front of S3. `deploy.yml` stamps `Cache-Control: public, max-age=300`
on HTML and invalidates `/*` on every deploy; CSS and JS carry `max-age=600` set
by `deploy.sh`. There is no asset hashing. For deploys that couple JS and CSS in
a way that would visibly break mid-rollout, manually bump the `?v=N` query on
the affected `<link>`/`<script>`/`import` — `core.js` is imported from five
places, so bump all of them together or you ship two module instances. Don't
reach for build tooling to automate this.
