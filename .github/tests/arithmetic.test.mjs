// The front doors mirror the editions' arithmetic by hand (site.js copies
// computeVersion and computeWorkVersion). These tests are what keep the copies
// honest: the door must show the number the visitor sees one click later.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeVersion, computeTenure, versionString, tenureString } from "../../assets/site.js";
import { read, liftFunctions, on } from "./helpers.mjs";

const birthday = liftFunctions(read("birthday/assets/app.js"), ["computeVersion", "anniversaryDate"]);
const work = liftFunctions(read("work/edition/assets/app.js"), ["computeWorkVersion", "anniversaryDate", "businessDaysBetween"]);

const DATES = [
  on(2026, 9, 15), on(2026, 9, 11), on(2026, 9, 12), on(2026, 9, 13), on(2026, 9, 14),   // a Fri–Mon span
  on(2026, 3, 1), on(2026, 2, 28), on(2028, 2, 29), on(2026, 12, 31), on(2027, 1, 1),
];
const STARTS = ["1974-01-15", "1990-09-15", "2004-02-29", "1900-01-01", "2026-09-15", "2019-01-31", "2019-09-03", "2023-02-13", "1999-12-31", "2019-02-10"];

test("birthday: the door's computeVersion equals the edition's", () => {
  for (const start of STARTS) for (const today of DATES) {
    if (on(...start.split("-").map(Number)) > today) continue;
    const a = computeVersion(start, today), b = birthday.computeVersion(start, today);
    assert.equal(versionString(a), `${b.major}.${b.minor}.${b.patch}`, `${start} on ${today.toDateString()}`);
    assert.equal(a.age, b.age);
  }
});

test("work: the door's computeTenure equals the edition's, build included", () => {
  for (const start of STARTS) for (const today of DATES) {
    const a = computeTenure(start, today), b = work.computeWorkVersion(start, today);
    if (!b) { assert.equal(a, null, `${start} before start`); continue; }
    assert.equal(tenureString(a), `${b.major}.${b.minor}.${b.patch}`, `${start} on ${today.toDateString()}`);
    assert.equal(a.build, b.build, `build for ${start} on ${today.toDateString()}`);
  }
});

test("quarters are 1-4, never 0, and Q1 starts on the anniversary", () => {
  for (const start of STARTS) for (const today of DATES) {
    const t = work.computeWorkVersion(start, today);
    if (t) assert.ok(t.minor >= 1 && t.minor <= 4, `${start} on ${today.toDateString()} gave quarter ${t.minor}`);
  }
  assert.equal(work.computeWorkVersion("2019-09-03", on(2026, 9, 3)).minor, 1);
  assert.equal(work.computeWorkVersion("2019-09-03", on(2026, 9, 3)).patch, 0);
});

test("month-end starts roll forward: three months after 31 January is 1 May", () => {
  assert.equal(work.computeWorkVersion("2019-01-31", on(2026, 4, 30)).minor, 1);
  assert.equal(work.computeWorkVersion("2019-01-31", on(2026, 5, 1)).minor, 2);
  assert.equal(work.computeWorkVersion("2019-01-31", on(2026, 5, 1)).patch, 0);
});

test("build: Monday is Friday plus one; Saturday and Sunday equal Friday", () => {
  const fri = work.computeWorkVersion("2019-09-03", on(2026, 9, 11)).build;
  assert.equal(work.computeWorkVersion("2019-09-03", on(2026, 9, 12)).build, fri);
  assert.equal(work.computeWorkVersion("2019-09-03", on(2026, 9, 13)).build, fri);
  assert.equal(work.computeWorkVersion("2019-09-03", on(2026, 9, 14)).build, fri + 1);
});

test("birthday edge cases: patch 0 today, 0.0.0 newborn, round decade, Feb 29", () => {
  assert.equal(versionString(computeVersion("1990-09-15", on(2026, 9, 15))), "3.6.0");
  assert.equal(versionString(computeVersion("2026-09-15", on(2026, 9, 15))), "0.0.0");
  assert.equal(versionString(computeVersion("1966-09-15", on(2026, 9, 15))), "6.0.0");
  assert.equal(versionString(computeVersion("2004-02-29", on(2026, 3, 1))), "2.2.0");   // non-leap year: March 1
  assert.equal(versionString(computeVersion("2004-02-29", on(2028, 2, 29))), "2.4.0");
});
