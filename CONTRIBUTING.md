# Contributing a theme

Themes are the easiest way to contribute. Each one is a single CSS file. There's no JavaScript involved, no build step, no review beyond "does it look good and not break anything."

## The recipe

1. **Drop a file** at `assets/themes/<your-name>.css`. One file works in both editions. Pick a short, lowercase, hyphenated name.
2. **Register it** in `assets/themes.js` — add an entry to the `THEMES` array near the top:
   ```js
   { name: 'your-name', label: 'Your Name', kind: 'light', animate: false,
     blurb: 'One sentence describing the look. Shown in the theme gallery.' },
   ```
   - `kind` is `light`, `dark`, `fun`, or `retro` — drives which `<optgroup>` it appears under in the picker.
   - `animate: true` opts the theme into the count-up animation on initial page load. Use it for vibrant themes; leave it `false` for calmer ones.
   - `blurb` is one sentence of copy for the [theme gallery](https://yourversionnumber.com/themes/), which builds its cards from this array. CI fails if a theme has no blurb.
3. **Open the page** with `npx live-server` and visit `http://localhost:8080/?theme=your-name&p=Jamie:1980-01-01` to see it.
4. **Open a pull request**.

## What a theme styles

Themes paint the **display**. That's:

- `.site-header`, `.site-title`, `.theme-select`, `.about-btn`, `.edit-btn`
- `.intro` (the empty-state copy)
- `.people`, `.person`, `.person-name`, `.version`
- `.add-btn` (empty-state "+ Add a birthday" button)
- `.site-footer`, `.site-stats`, `.hit-counter`

## What a theme does NOT style

The About and Edit dialogs are app chrome — they look the same on every theme, in a neutral light/dark card that follows the OS preference. **Don't add rules for `.app-dialog`, `.edit-row`, `.edit-list`, `.edit-add`, or any of their descendants.** If you want a "themed" feel for forms, the answer is no — those live in the dialog and stay neutral.

## Hooks you can use

These attributes/classes appear in the DOM regardless of theme; you can hook into them or ignore them:

- `body[data-people-count="0"]` — empty state.
- `body[data-people-count="1"]` — solo view. Good place to crank the version font size up.
- `body[data-people-count="many"]` — multiple people; keep it compact.
- `body[data-birthday="true"]` — at least one person is on `patch === 0` today. Sprinkle some flourish.

Pair `.about-btn` with `.edit-btn` in your selectors so both header buttons share the same look:

```css
.about-btn, .edit-btn { /* ... */ }
.about-btn:hover, .edit-btn:hover { /* ... */ }
```

## Style philosophy

Each theme is its own world. They don't share variables, they don't extend each other, they aren't a design system. If your theme needs a custom font, `@import` it from Google Fonts at the top of your file. If your theme wants animations, put `@keyframes` in your file. Themes are stylesheets that swap in whole-cloth — own the aesthetic.

## Pre-PR checklist

- [ ] Loads cleanly with `?theme=your-name` (no theme), `?theme=your-name&p=:1980-01-01` (one unnamed person), `?theme=your-name&p=Jamie:1980-01-01&p=Sara:1982-03-15` (named, multiple).
- [ ] Empty state ("+ Add a birthday" CTA) is reachable and looks coherent.
- [ ] Header buttons (theme picker, About, Edit) all look intended; no overlap, no broken layout.
- [ ] Picking your theme via the dropdown, then switching to another, then back, works.
- [ ] Footer is readable and the visit counter is visible.
- [ ] Open Edit and About — the neutral dialogs should still look right against your theme's backdrop.
- [ ] At narrow widths (~360px) nothing overflows or truncates.
- [ ] You added the entry to `THEMES` in `assets/themes.js`, including a `blurb` — without it, the picker doesn't list your theme and `?theme=your-name` will fall back to a random pick.

## Work themes

Both editions load from `assets/themes/` and read `assets/themes.js`. There is no separate work theme set any more — branch on `[data-edition="work"]` where the wording differs. Same recipe, same `{ name, label, kind, animate, blurb }` shape, same off-limits selectors (`.app-dialog*`, `.edit-row*`), and the same three header controls to style together (`.home-btn`, `.edit-btn`, `.about-btn`).

Extra hooks unique to work mode:

- `body[data-mode="work"]` — always present on the `/work/` page. Useful if you ever share styles between modes.
- `body[data-quarter-start="true"]` — a role on the page just rolled over to a new quarter (PATCH = 0). Analogous to `data-birthday="true"` on the root site.
- `body[data-tenure-anniversary="true"]` — a role's MAJOR just bumped (MINOR = 0 ∧ PATCH = 0). Always implies `data-quarter-start="true"`.

Verify with `?theme=<name>&j=Engineer:2024-01-15`.

## Naming

- Filename and `name` field: lowercase, hyphenated, short. `cyberpunk-2077.css` is fine; `My Cool Theme!.css` isn't.
- `label`: title case, what users see in the picker.
- Pick a `kind` that fits — when in doubt, look at the existing themes for which bucket your aesthetic belongs in.

That's it. Have fun.


## Core hooks

Core computes, your theme opts in from CSS. No theme ever ships JavaScript.

| Hook | One-line example |
| --- | --- |
| `data-edition` | `[data-edition="work"] .person::after { content: 'BILLABLE DAYS'; }` |
| `--version-size` | `.version { --version-size: clamp(2rem, 5vw, 3rem); }` |
| `--major` `--minor` `--patch` | `.badge::after { width: calc(var(--patch) * 1px); }` |
| `--patch-pct` | `.bar { transform: scaleX(var(--patch-pct)); }` |
| per-digit spans | `.digit { border: 1px solid; } .digit[data-d="0"] { opacity: .6; }` |
| `data-weekday` `data-season` | `[data-season="autumn"] .theme-fx { --leaf: #c1751f; }` |
| `--days-until` `data-countdown` | `[data-countdown] .version::after { content: 'SOON'; }` |

`chime` is named in the manifest and played by core, never by a theme.

## Pre-flight

CI fails on all three of these:

- **Every font you name must be in your `@import`.** Five themes used to render in fonts they never loaded.
- **No emoji.** They render in whatever font the visitor's OS ships, which is why several themes looked like mockups of themselves. Draw it with `clip-path`, `box-shadow` or an inline SVG `data:` URI, or cut it.
- **No `!important`.** After `--version-size` there is no reason for it, and its presence means a hook is missing — ask for the hook.

Also check your theme at 390px, and confirm any motion is guarded by `prefers-reduced-motion`.
