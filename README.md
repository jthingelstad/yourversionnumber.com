# yourversionnumber.com

Birthday and work milestones expressed as version numbers, with 28 themes and shareable cards. Inspired by [Jamie Thingelstad's 2018 post](https://www.thingelstad.com/2018/02/24/your-version-number.html).

The ordinary editions are static pages whose settings live in the URL. Creating a card saves a server-side record and returns a short link to it. No account is required for either flow.

## Pages

| Path | What it is |
| --- | --- |
| `/` | Landing page. |
| `/birthday/` | Age as decade.year-in-decade.days-since-birthday. |
| `/work/` | Tenure as years.quarters.weekdays-in-quarter. |
| `/examples/` | Eight birthday rosters, with one to eight people. |
| `/themes/` | All 28 themes, previewed with a date you choose. |
| `/card/new/` | Compose and preview a card before saving it. |
| `/c/<code>` | Look up a saved card; its HTML includes link-preview metadata. |
| `/about/` | Origin, arithmetic, storage, sharing, and analytics. |

The birthday edition moved from `/` to `/birthday/` in September 2026. Old `/?p=...` bookmarks are not redirected.

## Ordinary view URLs

For ordinary birthday and work views, the URL contains the names, dates, and selected theme. Editing these views does not create a saved card record. Bookmark the URL to return to the same people or roles, with their numbers recalculated using the viewer's local date.

```
https://yourversionnumber.com/birthday/?theme=birthday&p=Jamie:1974-01-15&p=Sara:1976-03-20&p=2008-09-04
https://yourversionnumber.com/work/?theme=ticker&j=Engineer:2024-01-15
```

- `theme` names a theme from `assets/themes.js`, with a stylesheet in `assets/themes/`. All themes work in both editions.
- Birthday `p` entries are repeatable: `Name:YYYY-MM-DD`, or `YYYY-MM-DD` for an unnamed entry. Legacy `p=:YYYY-MM-DD` is also accepted.
- Work `j` entries are repeatable: `Title:YYYY-MM-DD`, or `YYYY-MM-DD` for an unnamed entry.
- Names can contain colons; the last colon separates the date. Use URL encoding for names containing reserved characters.
- Malformed dates and future dates are skipped.

## Arithmetic

Birthday numbers are completed decades, years within the current decade, and calendar days since the last birthday. A person aged 52 years and 113 days is on `5.2.113`. February 29 birthdays use March 1 in non-leap years.

Work numbers are completed years of tenure, the quarter within the current tenure year (0–3), and weekdays since that quarter began. Quarters are three calendar months apart, anchored to the start date. A February 10 start reaches quarter 1 on May 10. Dates beyond the end of a month roll forward: January 31 plus three months becomes May 1. The quarter starts at zero; subsequent Monday–Friday dates count, including public holidays. There is no holiday calendar.

Both editions calculate from the viewer's local date and refresh at local midnight. A countdown appears during the final seven days before the next birthday or annual work anniversary.

## Saved cards

The composer previews a draft in the browser. Pressing **Create the card** sends the details to `/api/card`, which stores them in DynamoDB and returns a `/c/<code>` link. The card URL contains a lookup code, not the recipient's date or note.

A record includes recipient name, date, occasion, theme, note, sender name, link code, creation date, and expiry time. Notes are limited to 140 characters; names to 40. Text containing angle brackets is rejected. Notes are rendered as text, not HTML. Cards cannot be edited after creation.

Records are marked for expiry 400 days after creation. Automatic deletion may occur later; this is not an exact access cutoff. Cached previews and copies may outlast the card record. Card pages ask search engines not to index them, but anyone with the link can open or forward the card. There is no login gate.

## Themes and implementation

No framework, bundler, build step, or project dependencies. The two editions use parallel vanilla JavaScript modules and separate base stylesheets. They share core hooks, one theme manifest (`assets/themes.js`), and 28 standalone stylesheets (`assets/themes/`). The manifest and [theme gallery](https://yourversionnumber.com/themes/) are the current theme list.

Themes style the display and card messages using CSS only. About and Edit dialogs use neutral app chrome. Each manifest entry contains `name`, `label`, `home`, `animate`, `chime`, `card`, and `blurb`. `home` controls picker ordering, not edition availability. See [CONTRIBUTING.md](CONTRIBUTING.md) for the recipe and checks.

## Local development and validation

From the repo root:

```sh
npx live-server
node .github/scripts/validate-site.mjs
```

The local server opens at `http://localhost:8080/`. Open `/birthday/`, `/work/`, and `/themes-preview.html` to test the editions and theme states. Card drafts can be previewed locally; a static development server does not provide `/api/card` or saved-card routes.

The validation workflow also checks JavaScript syntax. Walk changed flows in a browser, including narrow screens and reduced motion.

## Deployment

The production domain is served by Amazon S3 and CloudFront. A push to `main` runs the site validator; after success, the Deploy workflow syncs static files to S3 and invalidates CloudFront using GitHub Actions OIDC. `server/deploy.sh` is the manual static-site deployment path.

Card creation and card pages use Lambda behind API Gateway, with records in DynamoDB. Social-preview URLs use `/og/<code>/<date>.png`. The static-site workflow excludes `server/`; pushing a Lambda source change alone does not deploy that Lambda.

## Sharing and analytics

Ordinary links expose names and dates in their query string; card links grant access to saved card contents. Either can be forwarded or retained in browser history, bookmarks, or history sync. Use information you are comfortable sharing.

Outside card pages, Tinylytics receives visit counts and interaction events such as theme selections and link copies. An inline privacy shim removes query strings and fragments from the page URL and referrer fields of analytics requests. This is analytics filtering, not a guarantee that a shared URL stays in the browser. Card pages do not load the analytics embed.

The app saves one local-storage flag per edition (`yvn-about-seen` / `yvnw-about-seen`) to remember whether its intro has been shown. It does not save names, dates, themes, or card drafts in local storage. Card records do not include email addresses, accounts, or IP addresses.
