# yourversionnumber.com

A bookmarkable web page that shows people's "version numbers" — their age expressed as `MAJOR.MINOR.PATCH` (decade . year-in-decade . days since their last birthday). Inspired by [Jamie Thingelstad's 2018 post](https://www.thingelstad.com/2018/02/24/your-version-number.html).

## URL format

The URL is the source of truth. Bookmark a URL, get the same view back later.

```
https://yourversionnumber.com/?theme=family&p=Jamie:1974-01-15&p=Sara:1976-03-20&p=:2008-09-04
```

- `theme` — name of a stylesheet in `themes/`. Optional; defaults to `default`.
- `p` — repeatable. `Name:YYYY-MM-DD`, or just `YYYY-MM-DD` for an unnamed entry. (The old `p=:YYYY-MM-DD` form is still parsed, for old bookmarks.)

Unknown themes fall back to `default`. Malformed `p` entries are skipped (with a console warning).

## Themes

Eighteen ship by default: `default`, `dark`, `family`, `pastel`, `birthday`, `nature`, `ocean`, `galaxy`, `zen`, `terminal`, `arcade`, `vaporwave`, `y2k`, `newspaper`, `steampunk`, `brutalist`, `comic`, `memphis`. Each is a standalone stylesheet in `themes/`.

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

A first-time visitor with no `?theme=` in the URL gets `dark` if their OS is in dark mode, otherwise `default`. Once any theme is chosen it's written to the URL and that's what the bookmark holds.

## Work mode

There's a sibling page at [`/work/`](https://yourversionnumber.com/work/) with the same idea applied to your work life: `<years-of-tenure>.<quarter-within-tenure-year>.<business-days-in-quarter>`. Quarters are reckoned from your work anniversary (not the calendar), and PATCH counts business days only — weekends don't tick.

```
https://yourversionnumber.com/work/?theme=boardroom&j=Engineer:2024-01-15
```

- `theme` — name of a stylesheet in `work/themes/`. Independent set from the root themes.
- `j` — repeatable. `Title:YYYY-MM-DD`, or just `YYYY-MM-DD` for a nameless entry.

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

Birthdays in the URL are visible to anyone with the link, and to your browser's history sync. Don't paste sensitive data here.
