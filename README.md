# yourversionnumber.com

Birthday and work milestones expressed as version numbers, with 28 themes and shareable cards. Inspired by [Jamie Thingelstad's 2018 post](https://www.thingelstad.com/2018/02/24/your-version-number.html).

It is a static site with no server-side code. Every view, cards included, keeps all of its state in the URL; nothing is stored anywhere and no account exists.

## Pages

| Path | What it is |
| --- | --- |
| `/` | The birthday product's front door: asks your birthday, answers live. |
| `/birthday/` | Age as decade.year-in-decade.days-since-birthday. |
| `/themes/` | The twenty birthday themes, previewed with a date you choose. |
| `/examples/` | Eight birthday rosters, with one to eight people. |
| `/card/` | Write a card and copy its link. |
| `/about/` | Origin, arithmetic, and why the URL is the only state. |
| `/work/` | The Work Edition's own front door, in its own voice. |
| `/work/edition/` | Tenure as years.quarters.weekdays-in-quarter. |
| `/work/themes/` | The nine work themes. |
| `/work/card/` | Circulate an anniversary notice. |
| `/work/about/` | The tenure arithmetic, stated dryly. |

The birthday edition moved from `/` to `/birthday/` in September 2026; old `/?p=...` bookmarks are not redirected. The work edition moved from `/work/` to `/work/edition/` the same month; `/work/?j=...` and `/work/?card=...` links are forwarded.

## View URLs

The URL contains the names, dates, and selected theme. Bookmark the URL to return to the same people or roles, with their numbers recalculated using the viewer's local date.

```
https://yourversionnumber.com/birthday/?theme=birthday&p=Jamie:1974-01-15&p=Sara:1976-03-20&p=2008-09-04
https://yourversionnumber.com/work/edition/?theme=ticker&j=Engineer:2024-01-15
```

- `theme` names a theme from `assets/themes.js`, with a stylesheet in `assets/themes/`. All themes work in both editions.
- Birthday `p` entries are repeatable: `Name:YYYY-MM-DD`, or `YYYY-MM-DD` for an unnamed entry. Legacy `p=:YYYY-MM-DD` is also accepted.
- Work `j` entries are repeatable: `Title:YYYY-MM-DD`, or `YYYY-MM-DD` for an unnamed entry.
- Names can contain colons; the last colon separates the date. Use URL encoding for names containing reserved characters.
- Malformed dates and future dates are skipped.

## Arithmetic

Birthday numbers are completed decades, years within the current decade, and calendar days since the last birthday. A person aged 52 years and 113 days is on `5.2.113`. February 29 birthdays use March 1 in non-leap years.

Work numbers are completed years of tenure, the quarter within the current tenure year (1–4), and weekdays since that quarter began. Quarters are three calendar months apart, anchored to the start date. A February 10 start reaches quarter 2 on May 10. Dates beyond the end of a month roll forward: January 31 plus three months becomes May 1. Days start at zero on the quarter's first day; subsequent Monday–Friday dates count, including public holidays. There is no holiday calendar.

Both editions calculate from the viewer's local date and refresh at local midnight. A countdown appears during the final seven days before the next birthday or annual work anniversary.

## Cards

A card is a view with one person and a signed note. The composers at `/card/` and `/work/card/` build the link and the link *is* the card — there is nothing to create, save, or expire:

```
https://yourversionnumber.com/birthday/?theme=departures&card=Sara:1984-03-09&from=Jamie&note=Four%20whole%20decades.
https://yourversionnumber.com/work/edition/?theme=timesheet&card=Sara:2019-09-03&from=Jamie&note=Five%20years.
```

`card=Name:YYYY-MM-DD` takes the place of `p=`/`j=` and puts the page in card mode (one person, no picker, no editing). `from` and `note` are optional. Notes are clipped to 140 characters and names to 40, and both are rendered as text, never HTML. Anyone holding the link can read, forward, or edit it.

## Themes and implementation

No framework, bundler, build step, or project dependencies. The two editions use parallel vanilla JavaScript modules and separate base stylesheets. They share core hooks, one theme manifest (`assets/themes.js`), and 28 standalone stylesheets (`assets/themes/`). The manifest and [theme gallery](https://yourversionnumber.com/themes/) are the current theme list.

Themes style the display and card messages using CSS only. About and Edit dialogs use neutral app chrome. Each manifest entry contains `name`, `label`, `home`, `animate`, `chime`, `card`, and `blurb`. `home` is the product a theme belongs to; a theme is offered only in its own product's picker, gallery and composer (twenty birthday, nine work), though every stylesheet still renders if a URL names it. See [CONTRIBUTING.md](CONTRIBUTING.md) for the recipe and checks.

## Local development and validation

From the repo root:

```sh
npx live-server
node .github/scripts/validate-site.mjs
```

The local server opens at `http://localhost:8080/`. Open `/birthday/`, `/work/edition/`, and `/themes-preview.html` to test the editions and theme states. The composer works locally too; it is all client-side.

The validation workflow also checks JavaScript syntax. Walk changed flows in a browser, including narrow screens and reduced motion.

## Deployment

The production domain is served by Amazon S3 and CloudFront; the bucket holds exactly the files in this repo. A push to `main` runs the site validator; after success, the Deploy workflow syncs the files to S3 and invalidates CloudFront using GitHub Actions OIDC. `deploy.sh` is the same sync, run by hand.

## Sharing and analytics

A link exposes what it shows: names and dates, and on a card the note and sender. It can be forwarded or retained in browser history, bookmarks, or history sync. Use information you are comfortable sharing.

Tinylytics receives visit counts and interaction events such as theme selections and link copies. An inline privacy shim removes query strings and fragments from the page URL and referrer fields of analytics requests. This is analytics filtering, not a guarantee that a shared URL stays in the browser.

The app saves one local-storage flag per edition (`yvn-about-seen` / `yvnw-about-seen`) to remember whether its intro has been shown. It does not save names, dates, themes, or card drafts in local storage.
