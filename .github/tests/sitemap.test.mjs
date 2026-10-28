// sitemap.xml is written by hand, and each page's <lastmod> is the day (US
// Central) of the last commit that changed that page's HTML file. Search
// reads lastmod only while it stays true, so this holds it to git: change a
// page and the run on main fails until its lastmod moves too. Never a deploy
// date: a lastmod that is always "now" is ignored.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const SITE = "https://yourversionnumber.com";
const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", env: { ...process.env, TZ: "America/Chicago" } }).trim();
const sitemap = readFileSync("sitemap.xml", "utf8");
const urls = Array.from(sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g), ([, body]) => ({
  loc: /<loc>([^<]*)<\/loc>/.exec(body)?.[1],
  lastmod: /<lastmod>([^<]*)<\/lastmod>/.exec(body)?.[1],
}));

test("every listed page is a directory index on this site with a lastmod", () => {
  assert.equal(urls.length, 11);
  for (const { loc, lastmod } of urls) {
    assert.ok(loc?.startsWith(SITE + "/") && loc.endsWith("/"), loc);
    assert.ok(existsSync(loc.slice(SITE.length + 1) + "index.html"), loc);
    assert.match(lastmod ?? "", /^\d{4}-\d{2}-\d{2}$/, loc);
  }
});

test("each lastmod is the day its page's HTML last changed in git", () => {
  // A shallow clone dates every file to its one commit (the workflow fetches all).
  assert.equal(git("rev-parse", "--is-shallow-repository"), "false", "needs full history: fetch-depth: 0");
  const wrong = [];
  for (const { loc, lastmod } of urls) {
    const file = loc.slice(SITE.length + 1) + "index.html";
    const day = git("log", "-1", "--date=format-local:%Y-%m-%d", "--format=%ad", "--", file);
    if (day !== lastmod) wrong.push(`${loc} (${file}): set <lastmod>${day}</lastmod>, not ${lastmod}`);
  }
  assert.deepEqual(wrong, []);
});
