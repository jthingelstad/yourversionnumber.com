# yourversionnumber.com

A bookmarkable web page that shows people's "version numbers" — their age expressed as `MAJOR.MINOR.PATCH` (decade . year-in-decade . days since their last birthday). Inspired by [Jamie Thingelstad's 2018 post](https://www.thingelstad.com/2018/02/24/your-version-number.html).

## URL format

The URL is the source of truth. Bookmark a URL, get the same view back later.

```
https://yourversionnumber.com/?theme=family&p=Jamie:1974-01-15&p=Sara:1976-03-20&p=:2008-09-04
```

- `theme` — name of a stylesheet in `themes/`. Optional; defaults to `default`.
- `p` — repeatable. `Name:YYYY-MM-DD`. Name is optional (`p=:1974-01-15` is valid and renders the version with no label).

Unknown themes fall back to `default`. Malformed `p` entries are skipped (with a console warning).

## Themes

Eighteen ship by default: `default`, `dark`, `family`, `pastel`, `birthday`, `nature`, `ocean`, `galaxy`, `zen`, `terminal`, `arcade`, `vaporwave`, `y2k`, `newspaper`, `steampunk`, `brutalist`, `comic`, `memphis`. Each is a standalone stylesheet in `themes/` — themes can override any styling, not just colors.

To add one: drop a new file at `themes/<name>.css`, add `<name>` to the `THEMES` array in `assets/app.js`, and reference it as `?theme=<name>`.

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
