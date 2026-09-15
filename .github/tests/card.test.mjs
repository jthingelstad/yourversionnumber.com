// The card codec: cardURL() writes, readCardData() reads, and the two must
// never drift. Limits are code points, so an over-long emoji note cannot end
// in half a surrogate pair.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cardURL, readCardData, CARD_LIMITS, clipPoints, countPoints } from "../../assets/core.js";

const roundTrip = (edition, card) => readCardData(new URL("http://x" + cardURL(edition, card)).searchParams);

test("a card round-trips exactly, colons and all", () => {
  const card = { name: "Dr: Who: The Third", date: "1984-03-09", theme: "departures", from: "Ann & Bob", note: "100% sure, plus+sign = equals&p=Evil:2000-01-01" };
  assert.deepEqual(roundTrip("birthday", card), { name: card.name, date: card.date, from: card.from, note: card.note });
});

test("the colon is written literally; the edition path is the prefix", () => {
  const u = cardURL("work", { name: "Sara", date: "2019-09-03", theme: "timesheet" });
  assert.equal(u, "/work/?theme=timesheet&card=Sara:2019-09-03");
});

test("from and note are optional and absent when empty", () => {
  const back = roundTrip("birthday", { name: "Sara", date: "1984-03-09", theme: "zen", from: "", note: "" });
  assert.deepEqual(back, { name: "Sara", date: "1984-03-09", from: "", note: "" });
  assert.equal(cardURL("birthday", { name: "Sara", date: "1984-03-09" }).includes("note="), false);
});

test("limits are code points on both sides, and never split a surrogate pair", () => {
  const note = "a" + "😀".repeat(200);
  const back = roundTrip("birthday", { name: "👨‍👩‍👧‍👦".repeat(30), date: "1984-03-09", note, from: "x".repeat(99) });
  assert.equal(countPoints(back.note), CARD_LIMITS.note);
  assert.equal(countPoints(back.name), CARD_LIMITS.name);
  assert.equal(back.from.length, CARD_LIMITS.from);
  const lone = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
  assert.equal(lone.test(back.note + back.name), false);
  // read-side clipping of a hostile URL, not just what we wrote
  const hostile = readCardData(new URLSearchParams("card=Sara:1984-03-09&note=" + encodeURIComponent("😀".repeat(300))));
  assert.equal(countPoints(hostile.note), CARD_LIMITS.note);
  assert.equal(lone.test(hostile.note), false);
});

test("the wrong shape is no card at all", () => {
  for (const q of ["card=Sara", "card=:1984-03-09", "card=", "p=Sara:1984-03-09", "card=Sara:1984-3-9"]) {
    assert.equal(readCardData(new URLSearchParams(q)), null, q);
  }
});

test("clipPoints and countPoints count what a person sees", () => {
  assert.equal(countPoints("日本語"), 3);
  assert.equal(countPoints("😀😀"), 2);
  assert.equal(clipPoints("😀😀😀", 2), "😀😀");
  assert.equal(clipPoints("", 5), "");
});
