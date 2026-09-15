// The analytics privacy shim decides what leaves the browser. It is inlined in
// every page (validate-site.mjs diffs the copies); this runs the copy from
// index.html against a mocked location and asserts, request by request, that
// names and dates never go out and the virtual path is the one we want.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { read } from "./helpers.mjs";

const html = read("index.html");
const start = html.indexOf("<script>\n// Analytics privacy shim, v2") + "<script>".length;
const shim = html.slice(start, html.indexOf("</script>", start));
const SECRET = "https://yourversionnumber.com/birthday/?p=Secret:1970-01-01";

function page(href, defaultTheme = "birthday", framed = false) {
  const u = new URL(href);
  const sent = [];
  const win = {};
  win.top = framed ? {} : win; win.self = win;
  const ctx = {
    window: win,
    location: { hostname: u.hostname, pathname: u.pathname, search: u.search, origin: u.origin },
    document: { documentElement: { getAttribute: (k) => (k === "data-analytics-default" ? defaultTheme : null) } },
    navigator: { sendBeacon: (url) => { sent.push(["beacon", url]); return true; } },
    URL, URLSearchParams, Response, Promise, encodeURIComponent,
  };
  win.fetch = (input) => { sent.push(["fetch", input]); return Promise.resolve("net"); };
  Object.assign(win, { location: ctx.location, document: ctx.document, navigator: ctx.navigator });
  vm.createContext(ctx);
  vm.runInContext(shim, ctx);
  const q = `url=${encodeURIComponent(href)}&path=${encodeURIComponent(u.pathname)}&referrer=${encodeURIComponent(SECRET)}&event=theme.viewed&event_value=zen`;
  const collector = "https://tinylytics.app/collector/8JZbs4z3jyWQay28S2av?" + q;
  return {
    hit() { ctx.window.fetch(collector, { method: "post" }); return sent.pop(); },
    beacon() { ctx.navigator.sendBeacon(collector); return sent.pop(); },
    track(vp) { const n = sent.length; ctx.window.yvnTrackPath(vp); return sent.length > n ? sent.pop() : null; },
  };
}
const params = (req) => Object.fromEntries(new URL(req[1]).searchParams);

test("a roster view becomes /birthday/<theme>/ and the query never leaves", () => {
  const p = params(page("https://yourversionnumber.com/birthday/?theme=fridge&p=Jamie:1974-01-15&p=Sara:1976-03-20").hit());
  assert.equal(p.path, "/birthday/fridge/");
  assert.equal(p.url, "https://yourversionnumber.com/birthday/fridge/");
  assert.equal(p.referrer, "https://yourversionnumber.com/birthday/");
  assert.equal(p.event, "theme.viewed");
});

test("no theme, or an invalid one, reports the declared default", () => {
  assert.equal(params(page("https://yourversionnumber.com/birthday/?p=Jamie:1974-01-15").hit()).path, "/birthday/birthday/");
  assert.equal(params(page("https://yourversionnumber.com/work/edition/?j=Eng:2019-09-03", "ticker").hit()).path, "/work/edition/ticker/");
  for (const t of ["../../x", "%3Cscript%3E", "BIRTHDAY", "birthday%E2%80%8B", "a".repeat(40)]) {
    assert.equal(params(page(`https://yourversionnumber.com/birthday/?theme=${t}&p=A:1974-01-15`).hit()).path, "/birthday/birthday/", t);
  }
});

test("a card becomes /card/<edition>/<theme>/ with no name, note or sender", () => {
  const req = page("https://yourversionnumber.com/birthday/?theme=departures&card=Sara:1984-03-09&from=Jamie&note=Four%20decades").hit();
  assert.equal(params(req).path, "/card/birthday/departures/");
  assert.equal(/Sara|Jamie|decades|1984/.test(req[1]), false);
  assert.equal(params(page("https://yourversionnumber.com/work/edition/?theme=ooo&card=R:2019-09-03", "ticker").hit()).path, "/card/work/ooo/");
});

test("spine pages keep their own path; the referrer loses its query", () => {
  const p = params(page("https://yourversionnumber.com/themes/?p=Secret:1970-01-01").hit());
  assert.equal(p.path, "/themes/");
  assert.equal(p.referrer.includes("Secret"), false);
});

test("sendBeacon is rewritten exactly like fetch", () => {
  assert.equal(params(page("https://yourversionnumber.com/birthday/?theme=zen&p=Secret:1970-01-01").beacon()).path, "/birthday/zen/");
});

test("nothing is sent from another host or from a frame", () => {
  const local = page("http://127.0.0.1:8931/birthday/?theme=zen&p=Secret:1970-01-01");
  assert.equal(local.hit(), undefined);
  assert.equal(local.beacon(), undefined);
  assert.equal(local.track("/card/copied/birthday/zen/"), null);
  const framed = page("https://yourversionnumber.com/birthday/?theme=zen&p=Secret:1970-01-01", "birthday", true);
  assert.equal(framed.hit(), undefined);
});

test("yvnTrackPath sends only slug paths", () => {
  const p = page("https://yourversionnumber.com/card/");
  assert.equal(params(p.track("/card/copied/birthday/departures/")).path, "/card/copied/birthday/departures/");
  for (const bad of ["/card/copied/<img>/", "/card/copied/Sara:1984/", "card/copied/x/", "/card/copied/x"]) {
    assert.equal(p.track(bad), null, bad);
  }
});

test("every collector request carries no secret at all", () => {
  for (const href of [
    "https://yourversionnumber.com/birthday/?theme=fridge&p=Secret:1970-01-01",
    "https://yourversionnumber.com/birthday/?card=Secret:1970-01-01&note=Secret&from=Secret",
    "https://yourversionnumber.com/work/edition/?j=Secret:2019-09-03",
  ]) {
    const req = page(href, "ticker").hit();
    assert.equal(req[1].includes("Secret"), false, href);
    assert.equal(req[1].includes("1970"), false, href);
  }
});
