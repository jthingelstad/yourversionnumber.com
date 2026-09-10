import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const failures = [];

async function validateEdition({ htmlPath, privateQuery }) {
  const html = await readFile(resolve(repoRoot, htmlPath), "utf8");

  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const reference = match[1].split(/[?#]/, 1)[0];
    if (!reference || /^(?:https?:|mailto:|data:|#)/.test(reference)) continue;
    const target = reference.startsWith("/")
      ? resolve(repoRoot, `.${reference}`)
      : resolve(repoRoot, dirname(htmlPath), reference);
    if (!existsSync(target)) failures.push(`${htmlPath}: missing local asset ${reference}`);
  }

  for (const required of [
    "tinylytics.app/collector/",
    "sanitizeCollectorUrl",
    "['url', 'referrer']",
    "parsed.origin + parsed.pathname",
    privateQuery,
  ]) {
    if (!html.includes(required)) failures.push(`${htmlPath}: missing privacy guard ${required}`);
  }

  // Crawlers and no-JS visitors only ever see the static markup in index.html,
  // so keep the indexable content from regressing back to an empty <main>.
  for (const required of ['<h1 class="site-title">', "<noscript>", 'type="application/ld+json"']) {
    if (!html.includes(required)) failures.push(`${htmlPath}: missing indexable content ${required}`);
  }
}

await validateEdition({ htmlPath: "birthday/index.html", privateQuery: "?p=" });
await validateEdition({ htmlPath: "work/index.html", privateQuery: "?j=" });

// One manifest, one theme folder, both editions reading the same array.
// A manifest entry without a stylesheet ships a picker option that 404s; a
// stylesheet without an entry is a file nobody can reach.
{
  const manifestSrc = await readFile(resolve(repoRoot, "assets/themes.js"), "utf8");
  const entries = [...manifestSrc.matchAll(/\{\s*name:\s*'([^']+)'[\s\S]*?\n\s*blurb:/g)].map((m) => m[1]);
  if (entries.length === 0) failures.push("assets/themes.js: could not read the manifest");

  const files = (await readdir(resolve(repoRoot, "assets/themes")))
    .filter((f) => f.endsWith(".css"))
    .map((f) => f.replace(/\.css$/, ""));

  for (const name of entries) {
    if (!files.includes(name)) failures.push(`assets/themes.js: ${name} has no assets/themes/${name}.css`);
  }
  for (const file of files) {
    if (!entries.includes(file)) failures.push(`assets/themes/${file}.css: not in the manifest, unreachable`);
  }

  // `kind` was only ever there to build optgroups; the picker is flat now.
  if (/\bkind:/.test(manifestSrc)) failures.push("assets/themes.js: `kind` is retired, use `home`");
  for (const m of manifestSrc.matchAll(/name:\s*'([^']+)'[\s\S]*?home:\s*(null|'([^']*)')/g)) {
    const home = m[3] ?? null;
    if (home !== null && home !== "birthday" && home !== "work") {
      failures.push(`assets/themes.js: ${m[1]} has home '${home}', expected birthday | work | null`);
    }
  }

  // Nothing may reach into a per-edition theme folder any more.
  for (const stale of ["birthday/themes", "work/themes"]) {
    if (existsSync(resolve(repoRoot, stale))) failures.push(`${stale}/ still exists; themes live in assets/themes/`);
  }
}

// Spine pages: neutral chrome, no theme manifest, but the same privacy shim
// (kept inline on every page so it cannot half-load ahead of the embed) and the
// shared nav that ties the site together.
for (const spinePath of ["index.html", "about/index.html", "themes/index.html", "examples/index.html"]) {
  const html = await readFile(resolve(repoRoot, spinePath), "utf8");
  for (const required of [
    "tinylytics.app/collector/",
    "sanitizeCollectorUrl",
    "['url', 'referrer']",
    'class="site-nav__brand"',
    '<link rel="stylesheet" href="/assets/site.css">',
    'type="application/ld+json"',
  ]) {
    if (!html.includes(required)) failures.push(`${spinePath}: missing ${required}`);
  }
  for (const dest of ["/birthday/", "/work/", "/examples/", "/themes/", "/about/"]) {
    if (!html.includes(`href="${dest}"`)) failures.push(`${spinePath}: no link to ${dest}`);
  }
}

// The examples page carries its rosters and links in static HTML — the frames
// are enhancement only. If that inverts, the page stops working without JS.
{
  const html = await readFile(resolve(repoRoot, "examples/index.html"), "utf8");
  const slots = [...html.matchAll(/data-example-url="([^"]+)"/g)].map((m) => m[1]);
  if (slots.length < 8) failures.push(`examples/index.html: only ${slots.length} examples`);
  for (const href of slots) {
    if (!html.includes(`<a href="${href}">`)) failures.push(`examples/index.html: ${href} has a preview but no static link`);
  }
  const sizes = [...html.matchAll(/(\d+) (?:person|people) &middot;/g)].map((m) => Number(m[1]));
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
    if (!sizes.includes(n)) failures.push(`examples/index.html: no example with ${n} people`);
  }
}

// Themes style the header controls as a set. A theme that dresses .about-btn
// but not .home-btn leaves the way out of the edition looking like a stray link.
for (const themeFile of (await readdir(resolve(repoRoot, "assets/themes")))
  .filter((f) => f.endsWith(".css"))
  .map((f) => `assets/themes/${f}`)) {
  const css = await readFile(resolve(repoRoot, themeFile), "utf8");
  if (css.includes(".about-btn") && !css.includes(".home-btn")) {
    failures.push(`${themeFile}: styles .about-btn but not .home-btn`);
  }
}

// Every theme needs gallery copy, or its card renders bare.
{
  const manifestSrc = await readFile(resolve(repoRoot, "assets/themes.js"), "utf8");
  const names = [...manifestSrc.matchAll(/name:\s*'([^']+)'/g)].length;
  const blurbs = [...manifestSrc.matchAll(/blurb:\s*'/g)].length;
  if (names !== blurbs) failures.push(`assets/themes.js: ${names} themes but ${blurbs} blurbs`);
}

// The UI stopped asking for contributions; keep it that way.
for (const page of ["index.html", "about/index.html", "themes/index.html", "examples/index.html",
                    "birthday/assets/app.js", "work/assets/app.js"]) {
  const html = await readFile(resolve(repoRoot, page), "utf8");
  if (/pull request|CONTRIBUTING\.md|your theme here/i.test(html)) {
    failures.push(`${page}: contribution call-to-action is back`);
  }
}

// ── Phase 2 theme guards ────────────────────────────────────────────────────
// Three defects the audit found, now mechanical. A and B carry a baseline of
// the themes that already fail: the list only ever shrinks, so a new violation
// is impossible while the phase-3 sweep works through the existing ones. Guard
// C needs no baseline — nothing violates it any more.

// Families a theme may name without importing: generics, and faces that ship
// with an OS and are deliberately used as fallbacks.
const SYSTEM_FAMILIES = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
  "ui-monospace", "ui-serif", "ui-sans-serif", "inherit", "initial", "unset",
  "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Menlo", "Consolas",
  "SF Mono", "SFMono-Regular", "Courier New", "Arial", "Helvetica",
  "Helvetica Neue", "Georgia", "Times New Roman", "Impact", "Trebuchet MS",
  "Lucida Console", "Chalkboard SE", "Comic Sans MS", "Apple Color Emoji",
  "Atlassian Sans", "emoji",
]);

// Shrink these as phase 3 lands. Do not add to them.
const FONT_IMPORT_BASELINE = new Set([]);
// Themes that already re-declare a selector. Shrink as each is rebuilt.
const DUPLICATE_SELECTOR_BASELINE = new Set([
  "birthday.css", "brutalist.css", "cubicle.css", "memphis.css",
  "ooo.css", "terminal.css",
  "zen.css",
]);

const EMOJI_BASELINE = new Set([
  "progress.css",
]);

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

for (const file of (await readdir(resolve(repoRoot, "assets/themes"))).filter((f) => f.endsWith(".css"))) {
  const css = await readFile(resolve(repoRoot, "assets/themes", file), "utf8");
  const imports = [...css.matchAll(/@import\s+url\(([^)]*)\)/g)].map((m) => m[1]).join(" ");

  // A — every named font is imported.
  const named = new Set();
  for (const m of css.matchAll(/font-family:\s*([^;}]+)/g)) {
    for (const fam of m[1].split(",")) {
      const name = fam.trim().replace(/^['"]|['"]$/g, "");
      if (name && !name.startsWith("var(") && !SYSTEM_FAMILIES.has(name)) named.add(name);
    }
  }
  const missing = [...named].filter((n) => !imports.replace(/%20/g, "+").includes(n.replace(/ /g, "+")));
  if (missing.length && !FONT_IMPORT_BASELINE.has(file)) {
    failures.push(`assets/themes/${file}: names ${missing.join(", ")} but never imports it`);
  }
  if (!missing.length && FONT_IMPORT_BASELINE.has(file)) {
    failures.push(`assets/themes/${file}: now imports every font it names — drop it from FONT_IMPORT_BASELINE`);
  }

  // B — no emoji. They render in whatever font the visitor's OS ships, which
  // is the single biggest reason the replica themes look like mockups.
  const hasEmoji = EMOJI.test(css);
  if (hasEmoji && !EMOJI_BASELINE.has(file)) {
    failures.push(`assets/themes/${file}: emoji in theme CSS — draw it or cut it`);
  }
  if (!hasEmoji && EMOJI_BASELINE.has(file)) {
    failures.push(`assets/themes/${file}: no emoji left — drop it from EMOJI_BASELINE`);
  }

  // D — a newline escape that swallows the next character. "\\AB" is U+00AB,
  // not newline + B, because \\A is only one hex digit and CSS keeps reading.
  // Four of these shipped in ooo alone. Six-digit escapes cannot do it.
  for (const m of css.matchAll(/\\A[0-9a-fA-F]/g)) {
    failures.push(`assets/themes/${file}: ${m[0]} is one escape, not a newline — write \\00000A`);
  }

  // E — the audit's "appended sediment": a selector declared twice in one file,
  // where the second block silently overrides the first. Baselined like A and B.
  if (!DUPLICATE_SELECTOR_BASELINE.has(file)) {
    const seen = new Set();
    const dupes = new Set();
    for (const m of css.matchAll(/^([^\s@}/][^{]*)\{/gm)) {
      const sel = m[1].trim().replace(/\s+/g, " ").replace(/,$/, "");
      if (seen.has(sel)) dupes.add(sel);
      seen.add(sel);
    }
    for (const sel of dupes) {
      failures.push(`assets/themes/${file}: ${sel} is declared twice — merge it`);
    }
  }

  // C — no !important. After hook 1 there is no reason for it, and its presence
  // is the clearest signal that a hook is missing.
  if (css.includes("!important")) {
    failures.push(`assets/themes/${file}: !important — use --version-size or ask for a hook`);
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}

console.log(`Validated both editions, the shared manifest, theme assets, local references, and analytics privacy guards.`);
