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
    "searchParams.delete('url')",
    "searchParams.delete('referrer')",
    privateQuery,
  ]) {
    if (!html.includes(required)) failures.push(`${htmlPath}: missing privacy guard ${required}`);
  }
}

await validateEdition({
  htmlPath: "index.html",
  scriptPath: "assets/app.js",
  themesDirectory: "themes",
  privateQuery: "?p=",
});
await validateEdition({
  htmlPath: "work/index.html",
  scriptPath: "work/assets/app.js",
  themesDirectory: "work/themes",
  privateQuery: "?j=",
});

if (failures.length > 0) {
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}

console.log("Validated both editions, theme assets, local references, and analytics privacy guards.");
