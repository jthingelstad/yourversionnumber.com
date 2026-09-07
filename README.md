# yourversionnumber.com

A bookmarkable web page that shows people's "version numbers" — their age expressed as `MAJOR.MINOR.PATCH` (decade . year-in-decade . days since their last birthday). Inspired by [Jamie Thingelstad's 2018 post](https://www.thingelstad.com/2018/02/24/your-version-number.html).

## URL format

The URL is the source of truth. Bookmark a URL, get the same view back later.

```
https://yourversionnumber.com/?theme=family&p=Jamie:1974-01-15&p=Sara:1976-03-20&p=:2008-09-04
```

- `theme` — name of a stylesheet in `themes/`. Optional; when omitted, the page renders with the `birthday` theme so the first paint matches the og-image people see in link previews. The "🎲 Surprise me" option in the picker still rolls a random theme on demand.
- `p` — repeatable. `Name:YYYY-MM-DD`, or just `YYYY-MM-DD` for an unnamed entry. (The old `p=:YYYY-MM-DD` form is still parsed, for old bookmarks.) Future dates are skipped with a console warning so the math never goes negative; malformed entries the same.

## Themes

Twenty-five ship for the birthday edition. Each is a standalone stylesheet in `themes/`.

- `dark` — Minimalist dark mode with violet accents.
- `family` — Warm cream + handwritten Caveat, family-album feel.
- `pastel` — Soft gradient haze with pastel cards.
- `birthday` — Confetti, balloons, and party-hat pink.
- `nature` — Scattered leaves on linen, earthy serif.
- `ocean` — Wavy gradients with a tiny shoreline wave.
- `galaxy` — Deep-space gradient with neon numerals.
- `zen` — Quiet cream with a vermillion first-letter.
- `weather` — Sky-blue card with a sun/cloud per row.
- `polaroid` — Taped Polaroid grid with a slight tilt.
- `tarot` — Purple stars and Fool / Priestess / Empress cards.
- `newspaper` — Broadsheet typography with section rules.
- `subway` — Black NYC subway map with route bullets.
- `receipt` — Thermal-printer monospace with QTY 1.
- `steampunk` — Sepia gear-and-cog ledger.
- `brutalist` — Yellow + red + black, oversized type.
- `comic` — Comic panels with POW / ZAP / BOOM stickers.
- `memphis` — 80s squiggles, triangles, and dots.
- `vinyl` — Spinning 33⅓ records.
- `terminal` — Green-on-black CLI prompt.
- `arcade` — Pixel-fonted hi-score CRT cabinet.
- `vaporwave` — Pink/cyan grid with a palm-tree sunset.
- `y2k` — Frosted-glass chrome and blur.
- `pixel` — Eight-bit pixel font on a dark green field.
- `gameboy` — Classic GB DMG palette and cart silhouette.

Themes paint the **display**: header, person rows, footer, empty-state CTA. They do not style the About or Edit dialogs — those are app chrome with a neutral look in `assets/base.css` that follows the OS light/dark preference. This keeps themes simple and the dialogs consistent on every theme.

To add one: drop a new file at `themes/<name>.css`, add an entry to the `THEMES` array in `assets/app.js`, and reference it as `?theme=<name>`. Each entry has:

- `name` — filename (without `.css`).
- `label` — human-readable name shown in the picker.
- `kind` — `light`, `dark`, `fun`, or `retro`. Drives the `<optgroup>` it appears under.
- `animate` — `true` to opt the theme into the count-up animation on initial render. Calmer themes should leave this `false`.

Hooks available for theme-side polish, with no JS cost when ignored:

- `body[data-people-count="0|1|many"]` — style solo vs group views differently.
- `body[data-birthday="true"]` — present when any person on the page has `patch === 0`.
- `.person-name` — renders inside `.person` when a name is set. Themes can opt into styling it; falls back to a small muted treatment in `base.css`.
- `.edit-btn` — header button, sits next to `.about-btn`. Theme files pair the two so the new button picks up the same look.

A visitor with no `?theme=` in the URL sees the `birthday` theme — same as the og-image. Once a theme is explicitly chosen via the picker (or specified in the URL), it's written to the URL and that's what the bookmark holds. The work edition does the same with `earnings` as its default.

## Work Edition™

There's a sibling page at [`/work/`](https://yourversionnumber.com/work/) — _Your Version Number: Work Edition™_ — with the same idea applied to your work life: `<years-of-tenure>.<quarter-within-tenure-year>.<business-days-in-quarter>`. Quarters are 3 calendar months from your start date (Feb 10 start → Q1 May 10), and PATCH counts business days only — weekends don't tick.

```
https://yourversionnumber.com/work/?theme=boardroom&j=Engineer:2024-01-15
```

- `theme` — name of a stylesheet in `work/themes/`. Independent set from the root themes.
- `j` — repeatable. `Title:YYYY-MM-DD`, or just `YYYY-MM-DD` for a nameless entry.

Seventeen ship for the work edition:

- `boardroom` — Board-update slide with KPI rail (ARR, NPS, payback).
- `slack` — Slack channel feed with reactions and avatars.
- `slidedeck` — Confidential business-review slide with three bullets.
- `earnings` — Live stock-ticker on a black trading screen.
- `github` — GitHub PR list with avatars, labels, and the Open pill.
- `whiteboard` — Sticky-note grid in primary colors.
- `inbox` — Gmail-style inbox with subject lines and senders.
- `okr` — Q-scorecard with progress bar and ON-TRACK pill.
- `cubicle` — Manila-folder corporate newsletter.
- `kanban` — Jira-style cards in an In-Progress column.
- `standup` — Daily-standup card with Yesterday / Today / Blockers.
- `invite` — Calendar invite with Accepted check.
- `confluence` — Wiki page with breadcrumbs and comment counts.
- `zoom` — Gallery-view tiles with reactions.
- `spreadsheet` — Excel grid with row numbers.
- `pomodoro` — Tomato-timer Deep Work card.
- `ooo` — Out-of-office auto-reply with handwritten signature.

Code lives at `work/index.html`, `work/assets/app.js`, `work/assets/base.css`, `work/themes/*.css` — fully separate from the root site. Same repo, same deploy.

## Local development

No build step. From the repo root:

```sh
npx live-server
```

Opens the page at `http://localhost:8080/` with live reload on file save.

## Deployment

GitHub Pages, "Deploy from a branch" → `main` / `/ (root)`. Push to `main` and the site is live within a minute.

For the custom domain: set `yourversionnumber.com` in the repo's Pages settings, point DNS at GitHub Pages (apex `A` records to GitHub's IPs, plus a `www` `CNAME`), and ensure the `CNAME` file at the repo root contains `yourversionnumber.com`.

## Privacy

Birthdays live in the URL and only in the URL. The site has no server, no database, and no birthday telemetry — visit counts go to a privacy-friendly analytics service (tinylytics), but both the page URL and the referrer it would normally see are rewritten in `index.html` down to origin + path. Analytics records which page was viewed (`/` or `/work/`) and which site the visitor arrived from; the `?p=` and `?j=` query strings never leave the browser.

Birthdays in the URL are still visible to anyone you share the link with, and to your browser's history sync. Don't paste sensitive data here.

The only thing the site persists locally is a single boolean (`yvn-about-seen` / `yvnw-about-seen` in localStorage) so the About dialog auto-opens once for new visitors and stays out of the way after that.
