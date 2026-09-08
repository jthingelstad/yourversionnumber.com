import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const failures = [];

async function validateEdition({ htmlPath, scriptPath, themesDirectory, privateQuery }) {
  const html = await readFile(resolve(repoRoot, htmlPath), "utf8");
  const script = await readFile(resolve(repoRoot, scriptPath), "utf8");
  const manifest = script.match(/const THEMES = \[([\s\S]*?)\n\];/)?.[1] ?? "";
  const themeNames = [...manifest.matchAll(/name:\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );

  if (themeNames.length === 0) {
    failures.push(`${scriptPath}: could not read the theme manifest`);
  }
  for (const theme of themeNames) {
    const stylesheet = resolve(repoRoot, themesDirectory, `${theme}.css`);
    if (!existsSync(stylesheet)) failures.push(`${scriptPath}: missing ${themesDirectory}/${theme}.css`);
  }

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

await validateEdition({
  htmlPath: "birthday/index.html",
  scriptPath: "birthday/assets/app.js",
  themesDirectory: "birthday/themes",
  privateQuery: "?p=",
});
await validateEdition({
  htmlPath: "work/index.html",
  scriptPath: "work/assets/app.js",
  themesDirectory: "work/themes",
  privateQuery: "?j=",
});

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

// Every theme in both manifests needs gallery copy, or its card renders bare.
for (const scriptPath of ["birthday/assets/app.js", "work/assets/app.js"]) {
  const script = await readFile(resolve(repoRoot, scriptPath), "utf8");
  const manifest = script.match(/const THEMES = \[([\s\S]*?)\n\];/)?.[1] ?? "";
  const names = [...manifest.matchAll(/name:\s*'([^']+)'/g)].length;
  const blurbs = [...manifest.matchAll(/blurb:\s*'/g)].length;
  if (names !== blurbs) failures.push(`${scriptPath}: ${names} themes but ${blurbs} blurbs`);
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}

console.log("Validated both editions, theme assets, local references, and analytics privacy guards.");
