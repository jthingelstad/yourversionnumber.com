# Agent guide — yourversionnumber.com

A bookmarkable static page that displays people's "version numbers" (`MAJOR.MINOR.PATCH` from a birthday or job-start date). Read this before making non-trivial changes.

## What it is

- Single-page static site, **two editions**:
  - **Birthday edition** at `/birthday/` — `MAJOR.MINOR.PATCH` is decade / year-in-decade / days since last birthday. People in URL via `?p=Name:YYYY-MM-DD`. Lived at `/` until September 2026; old `/?p=...` bookmarks were deliberately allowed to break.
  - **Work edition** at `/work/edition/` — `YEARS.QUARTER.DAYS+BUILD` (quarters 1–4 from the start date; business days only; build = every business day ever logged, rendered as one `.build` span after the per-digit triple; 0-indexed and buildless until 2026-09-15). Roles in URL via `?j=Title:YYYY-MM-DD`. Lived at `/work/` until September 2026; `/work/` is now its front door and forwards `?j=`/`?card=` links to the app.
- **No build step**, no framework, no bundler.
- Static files on S3 behind CloudFront. No server-side code of any kind. A push to `main` validates, then syncs the repo to the bucket.
- Vanilla JS module per edition. Vanilla CSS. One stylesheet per theme.

## Layout

```
index.html                 the birthday product's front door (asks your birthday, answers live)
about/index.html           origin, arithmetic, "everything is in the URL"
themes/index.html          the twenty birthday themes, previewed with the visitor's number
examples/index.html        eight rosters of real people, one to eight
card/index.html            write someone a card — builds a link, nothing else
card/new/index.html        six-line redirect to /card/ (the old address)
404.html
work/index.html            the Work Edition's front door, in its own voice (data-face="work")
work/themes/index.html     the nine work themes
work/card/index.html       circulate an anniversary notice
work/about/index.html      the tenure arithmetic, stated dryly
deploy.sh                  the same S3 sync CI runs, by hand
assets/
  site.css                 the spine's one stylesheet: two faces, light and dark each
  site.js                  the .vnum renderer, the site's own number, the midnight tick
  home.js                  the landing hero: date field, live number, parts, sticky note
  work-home.js             the same for /work/, mirroring the work app's arithmetic
  wall.js                  the one preview mounter (lazy, fluid) for every scaled iframe
  gallery.js               builds either gallery from the manifest, filtered by face
  examples.js              one line: mount the previews
  compose.js               the composer, for both faces
  vendor/                  rough-notation + canvas-confetti, guarded, deletable (README inside)

assets/
  themes.js                the one theme manifest, imported by both editions
  themes/<name>.css        one standalone stylesheet per theme
  core.js                  the seven core hooks, the chime synthesiser, card read/write

birthday/
  index.html               birthday edition shell
  assets/app.js            birthday behavior — parsing, render, dialogs, animation
  assets/base.css          reset, layout, neutral dialog & theme-fx styles

work/edition/
  index.html               work edition shell
  assets/app.js            work behavior (deliberate near-duplicate of birthday)
  assets/base.css          same neutral chrome

themes-preview.html        dev tool: iframes every theme in both editions
README.md                  user-facing docs
CONTRIBUTING.md            theme contributor guide
```

The two `app.js` files are deliberately parallel. Keep their logic in sync when a change makes sense for both editions.

## The spine

The unthemed layer: `/`, `/about/`, `/themes/`, `/examples/`, `/card/`,
`404.html`, and under `/work/` the front door, `/work/themes/`, `/work/card/`
and `/work/about/`. Ten pages sharing `assets/site.css`. Site nav lives here
and only here — putting it inside a themed edition would mean 29 stylesheets
each deciding what the nav looks like. **The spine never enters the editions**:
no shared nav, no Home button, no `site.css` link inside a themed page.

Rebuilt in September 2026 from `design_handoff_spine_joy/` (a Claude Design
handoff, gitignored). The one before it was a rack unit — engraved labels,
`SLOT A / SLOT B`, a status LED, CSS-counter version tags on every heading —
and it was competent and joyless. Read the handoff's `01-decisions.md` before
redesigning anything here; the decisions below came out of it.

- **Two products, not one product with a toggle.** `/` is the birthday
  product's front door; `/work/` is the Work Edition's, with its own wordmark,
  nav, palette, copy and jokes, and the work app lives at `/work/edition/`.
  Neither nav offers the other. The one door between them is `.escape`, hard
  right in the bar: "Go to the office!" / "Let's go home!". Not a
  `Birthdays | Work` segmented control — that says "two modes of one thing",
  which is the merge this undid.
- **Three jobs per front door, in order: look, keep, give.** Hero (see your
  number, live) → "Then keep it" (bookmark, add people, dress it up) → a band
  for making one for someone else. One filled button per job; everything else
  is an outline `.btn` or a `.link`. Themes are not a fourth job — they are
  how you personalise the page you keep, so their tiles sit inside job 2.
- **The motif is `.vnum`**: mono digits in cobalt, separators in tangerine,
  rendered per-character by `site.js` `renderVnum()` with an `aria-label`
  carrying the whole string — the same contract as the editions' `.version`.
  Re-rendering reuses unchanged spans so only the digits that changed animate.
  No CSS counters, no version tags on headings; that experiment is retired.
- **The site's own number appears once**, as the `.bar__v` pill beside the
  wordmark, linking to the site's own birthday page
  (`/birthday/?theme=terminal&p=yourversionnumber.com:2026-05-01`). Not the
  hero, not the footer.
- **Two faces in one stylesheet**, switched by `body[data-face="work"]`: hand-
  drawn (wobbly two-value radii, sub-2° rotations, a marker highlight, a sticky
  note, sun-yellow offset shadow) and photocopier (square corners, dashed
  rules, tractor-feed holes, one rubber stamp). Same class names and sizes.
- **Light and dark per face**, and dark is a concept, not an inversion: chalk
  on a blackboard, and the office at 11pm. `prefers-color-scheme` only. **No
  toggle, no stored preference** — the spine has no storage of any kind, and
  `validate-site.mjs` fails on `localStorage` in any spine page.
- **Type:** Bricolage Grotesque (display and body), Martian Mono (numbers
  only). Imported once at the top of `site.css`. Sentence case everywhere; the
  only uppercase is the work face's document furniture.
- **Hand-drawn, in CSS only** — except for two vendored, guarded, deletable
  libraries on `/` alone: rough-notation (one scribbled circle round your
  number) and canvas-confetti (only when `patch === 0`). `assets/vendor/README.md`
  has the rules. `/work/` gets neither.
- **The landing page's opening state is a fixed worked example** (`5.2.113`),
  identical in the static markup and in `home.js`, so nothing flashes and a
  crawler sees the same thing. It becomes the visitor's own number on input;
  the form is a native GET to `/birthday/?p=YYYY-MM-DD` and is never intercepted.
- **The work front door mirrors the work app's arithmetic exactly**
  (`computeTenure()` in `site.js` is a copy of `computeWorkVersion()`,
  build included). If one changes, change both in the same commit. The build
  is rendered as its own element beside the triple, never inside the
  per-digit renderer, so a tube-per-digit theme never sees it.
- **Every preview on the spine is the real page in a scaled iframe**, mounted
  lazily by `wall.js`. There is no second renderer and there must never be one.
  `wall.js` reads `clientWidth`, not `getBoundingClientRect()`, because the
  tiles are rotated a fraction of a degree and the bounding box lies.
- **`--orange` never carries text and white never sits on it.** The primary
  button is ink-on-tangerine (5.4:1); at night the label flips to `--btn-ink`.
- **David Hussman is credited in the footer of every spine page**, in words
  only — never a version number for him, never mourning styling. Same rule that
  keeps `/examples/` to living people.

Two duplications in this layer are deliberate:

- **The analytics privacy shim is inlined in every spine HTML file.** It must run
  before the tinylytics embed, and inline script cannot half-load. Moved to an
  external file it could 404 while the embed still fires, leaking the dates in
  the query string. Copies are cheaper than that failure mode. `validate-site.mjs`
  checks every page still has it.
- **Nav and footer markup are repeated across the spine pages.** Removing that
  would take a build step, which convention 2 rules out. The pages were last
  emitted from a throwaway script; when you touch the bar or foot, touch all
  ten.

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

The galleries do *not* hardcode theme tiles. `assets/gallery.js` imports the
manifest and filters by `body[data-face]`, so adding a theme stays a two-step
job. That is why every theme entry needs a `blurb`.

## Cards

A card is a view with one person and a signed note, and it lives in the URL like
everything else:

```
/birthday/?theme=departures&card=Sara:1984-03-09&from=Jamie&note=Four%20whole%20decades.
/work/edition/?theme=timesheet&card=Sara:2019-09-03&from=Jamie&note=Five%20years.
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

1. **URL is the single source of truth — for everything, cards included.** Birthday: `?theme=...&p=Name:YYYY-MM-DD`. Work: `?theme=...&j=Title:YYYY-MM-DD`. Card: `?theme=...&card=Name:YYYY-MM-DD&from=...&note=...`. Each link is self-contained and the site stores nothing, anywhere, ever. This was broken once (server-side cards, September 2026) and reverted within a week; see *Cards* above before proposing anything that writes. Do not add `localStorage`/cookies/IndexedDB for theme or people — different bookmarks intentionally have different themes, and persisting either would cause surprising bleed between bookmarks. The one exception is `yvn-about-seen` / `yvnw-about-seen` — a single boolean each, set when the first-visit dialog is dismissed by any route (button, Escape, backdrop), so it shows once. Never on a `?card=` link, never when framed. No PII, no app state.
2. **No build tooling.** No bundler, no transpiler, no SSG, no `package.json`. The user explicitly prefers lean over conventional. If a feature seems to need tooling, push back; usually it doesn't.
3. **Themes are CSS-only.** No per-theme JS. When a theme idea can't be expressed in CSS, the answer is to add a *generic* hook in core `app.js` that all themes can opt into via CSS — that's how we got `.theme-fx`, `data-row-variant`, `--row-hue`, version-event flags, etc. Per-theme JS would create lifecycle/teardown bugs, cross-theme conflicts, review burden, and a real privacy risk: birthdays live in the URL and an accepted-but-malicious theme could beacon them. Don't open that door.
4. **Themes paint display only.** Header, person rows, footer, empty-state CTA, and the `.theme-fx` decorative layer. They do **not** style the About, Edit or first-visit dialogs — those are app chrome in `base.css`. Selectors under `.app-dialog` and `.first-visit` are off-limits. The first-visit dialog (`openIntro()` in each `app.js`, spec `INTRO-DIALOGS.md` in the spine handoff) is a signpost, not a brochure: it names the number on the page behind it with that page's real figures, offers the front door in a NEW tab, and gets out of the way; the `?` button still opens the fuller About dialog.
5. **Person rows have no editing affordances.** No inline inputs, no click-to-edit. Editing is gated behind the header's Birthdays/Roles button (class `.edit-btn`) → `<dialog>`. Visual hover effects (tilt, scale, glow) are fine — the rule is no *editing* affordances on rows, not no animation.
6. **One theme manifest, `assets/themes.js`.** Both editions import it; neither carries its own copy. Each entry: `{ name, label, home, animate, chime, card, blurb }`. `home` is `'birthday' | 'work'` and is **load-bearing**: a theme belongs to exactly one product and is offered only in that product's picker, gallery and composer — twenty birthday, nine work. (Every stylesheet still renders if a URL names it in the other edition; it is simply never offered.) The counts are hard-coded in page copy ("Twenty themes", "Nine themes") and asserted by CI. Boarding Pass is the one theme in both products, as two forked stylesheets sharing one label: `holiday` (birthday) and `boardingpass` (work). `kind` and `<optgroup>`s are retired; the picker is a flat list. `animate: true` opts into count-up; `chime` names a sound core plays on the midnight tick; `card: true` means the theme styles `.card-message` in its own voice.

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
- Anything matching `.app-dialog*`, `.edit-row*`, `.edit-list`, `.edit-add`, and `.first-visit*` (the first-visit dialog — it sets every value explicitly and must look identical over zen and over terminal; note it is deliberately NOT called `.intro`, which is the masthead paragraph hook themes do style).

## Animation

- **Count-up** runs only on initial page-load render. Gated by `THEMES[i].animate`, an `isFirstRender` flag, and `prefers-reduced-motion`.
- **Midnight tick** re-renders at the day boundary; afterwards every `.person` gets `.is-bumping` for ~1.2 s. Skipped under `prefers-reduced-motion`.
- **Chime** is named by the manifest and played by core — never by a theme, so no contributor ever ships audio. Synthesised with WebAudio oscillators: no files, no network, no assets. All four conditions must hold before it fires: (1) only on the midnight tick, never on load or theme switch; (2) only after the visitor has interacted with the page, since WebAudio refuses otherwise; (3) never under `prefers-reduced-motion`; (4) peak gain ≤ 0.15, because this fires on a page someone left open overnight.
- **`.theme-fx` motion** must respect `prefers-reduced-motion`. `base.css` kills animations on `.theme-fx`, its pseudo-elements, and `.is-bumping` under that setting; theme-specific keyframes elsewhere should self-guard.

## Local development

```sh
npx live-server
```

Opens at `http://localhost:8080/`. Visit `/birthday/` for the birthday edition and `/work/edition/` for the work edition; `/` and `/work/` are the two front doors. There is no test suite. Verify changes by opening the page in a browser and walking the relevant flows.

## Verifying changes

CI (`.github/workflows/validate.yml`) is the whole quality gate, and every
piece of it runs locally with nothing installed:

1. `node --check` on every script.
2. `node .github/scripts/validate-site.mjs` — the site's own linter: the
   privacy shim byte-identical on every page and the embed flags it allows,
   the manifest (20/9 split, unique slugs, every default theme exists), the
   hook and off-limits rules, the examples page's static links, and that
   **every reference to one asset carries the same `?v=`** (a module imported
   at two versions loads twice — bump all references together).
3. `node --test '.github/tests/*.test.mjs'` — three suites, no dependencies: the door's
   arithmetic must equal the edition's (`computeVersion`, `computeWorkVersion`
   with build; a Fri–Mon span; month-end rolls; quarters 1–4), the card codec
   (round-trips, code-point clipping, no split surrogates, bad shapes),
   and the analytics shim (virtual paths, no secret in any request, nothing
   from frames or other hosts, `yvnTrackPath` takes slug paths only). The app
   functions are lifted out of `app.js` by name (`helpers.mjs`) because those
   files are browser modules; renaming one fails the test on purpose.
4. `npx --yes html-validate@9 <the thirteen HTML files>` — recommended rules
   minus noise (`.htmlvalidate.json`). It found real things on first run: two
   `<main>`s per front door, `aria-label` on plain spans (ignored by AT), a
   `<form>` with no submit. The theme `<link>` has a documented exemption:
   giving it a default `href` would flash the wrong theme.

There is **no build step and no `package.json`**, evaluated and declined in
September 2026: none of that month's real bugs would have been caught by
ESLint, Stylelint or Prettier, and the one thing a bundler solves — cache
busting — is a validator check instead. html-validate runs from the npm cache
in CI only.

Then by hand:

- **Open `themes-preview.html`** under `npx live-server`. It iframes every
  theme in both editions side-by-side with shared rosters. Walk the page and
  eyeball every theme. Switch the roster selector to exercise edge cases.
- Open both editions directly to confirm the change in the relevant flow
  (initial render, Edit dialog, first-visit dialog, theme switch, card).
- Birthday edition: confirm `?p=:YYYY-MM-DD` (legacy unnamed) and
  `?p=YYYY-MM-DD` both still parse.
- Toggle OS reduced-motion and confirm `.theme-fx` motion and `.is-bumping`
  go quiet.

Headless Chrome notes, learned the hard way: it will not lay out below
~500px (screenshot a 390px iframe inside a wider window); `--virtual-time-budget`
never finishes a `requestAnimationFrame` count-up (not a bug); it identifies
as a bot so Tinylytics drops its hits; and framed pages skip the first-visit
dialog by design, so dialog tests need a top-level `--dump-dom`.

## What to avoid

- Per-theme JS files (see core convention 3). Add a generic core hook instead.
- State persistence (`localStorage`, cookies, IndexedDB) for app data. The `yvn-about-seen` / `yvnw-about-seen` flags are the only allowed exception — a single boolean each, used solely to show the first-visit dialog once.
- Theming inside `.app-dialog`.
- Reintroducing inline edit controls on person rows.
- Mass-refactoring themes into shared partials or mixins. Themes intentionally have full freedom; that's the point.
- Adding dependencies. There is no `package.json`, and we'd like to keep it that way.

## Privacy

Birthdays in the URL are visible to anyone with the link and to browser history sync. Do not store sensitive data. Don't add any feature that exfiltrates birthdays beyond the URL the user chose to share. This is the primary reason themes are CSS-only — a JS-capable theme could read URL params and beacon them.

The tinylytics analytics embed normally posts `window.location.href` to its collector — which would leak `?p=`, `?j=`, `?card=`, `?note=` and `?from=`. Every page inlines the **analytics shim v2** before the deferred embed (CI diffs all twelve copies byte-for-byte). It wraps `fetch` and `navigator.sendBeacon` and, for any collector request:

- sends nothing from a frame (every preview is a real edition page) or from any host but `yourversionnumber.com` (local checkouts, QA harnesses — the September 2026 dashboard is mostly one harness run);
- replaces the page URL with a **virtual path** that carries the theme and nothing a person typed: `/birthday/<theme>/`, `/work/edition/<theme>/`, `/card/<edition>/<theme>/`. The theme slug is validated; a missing or invalid one becomes the edition's default, declared as `data-analytics-default` on `<html>` (CI checks it equals `DEFAULT_THEME`);
- reduces the referrer to origin + path;
- exposes `window.yvnTrackPath(vp)` for the two card actions — the composers record a copy as a view of `/card/copied/<edition>/<theme>/`, so the Cards segment reads compose → copied → viewed top to bottom.

The embed is `min.js?events` and nothing else: `?hits` was the footer counters (removed), `?beacon`/`?auto` would switch to beacons nobody has tested, `?spa` would double count. Tinylytics **segments** are `/birthday`, `/work`, `/card`; **goals** are `/card/copied` and `/card/birthday` + `/card/work`. If you swap the analytics provider, port the same shim.

## Cache behavior

CloudFront in front of S3. `deploy.yml` stamps `Cache-Control: public, max-age=300`
on HTML and invalidates `/*` on every deploy; CSS and JS carry `max-age=600` set
by `deploy.sh`. There is no asset hashing. For deploys that couple JS and CSS in
a way that would visibly break mid-rollout, manually bump the `?v=N` query on
the affected `<link>`/`<script>`/`import` — `core.js` is imported from five
places and `site.js` from every spine page, so bump all of them together or
you ship two module instances. Don't
reach for build tooling to automate this.
