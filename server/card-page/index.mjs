// GET /c/{code} — the card itself.
//
// This exists because crawlers do not run JavaScript, so og: tags have to be in
// the HTML the server returns. Everything else about the site stays static.
//
// The page is the real edition, in the sender's chosen theme, with the card
// block injected and body[data-card] set so the roster and picker are
// suppressed. The number is computed client-side on every load — which is the
// point of the feature: the card counts down before the day and keeps climbing
// after it.

import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { escapeHtml } from "./shared.mjs";

const db = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME || "yvn-cards";
const ORIGIN = process.env.SITE_ORIGIN || "https://yourversionnumber.com";

function page({ code, card, today }) {
  const edition = card.occasion === "work" ? "work" : "birthday";
  const base = `/${edition}/`;
  const name = escapeHtml(card.name);
  const from = escapeHtml(card.from);
  const note = escapeHtml(card.note);
  const theme = escapeHtml(card.theme);
  const title = `${name}'s version number`;
  const description = `A card from ${from}.`;
  // The image key carries the date: a live card cannot have a permanent
  // preview, or it would still say "3 days to go" next April.
  const image = `${ORIGIN}/og/${code}/${today}.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Your Version Number">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${ORIGIN}/c/${code}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<link rel="stylesheet" href="${base}assets/base.css?v=4">
<link id="theme-css" rel="stylesheet" href="/assets/themes/${theme}.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ctext y='14' font-size='14'%3E%F0%9F%8E%82%3C/text%3E%3C/svg%3E">
<script id="card-data" type="application/json">${JSON.stringify({
    code, theme: card.theme, occasion: card.occasion,
    name: card.name, date: card.date, note: card.note, from: card.from,
  }).replace(/</g, "\\u003c")}</script>
</head>
<body>
<main id="app"></main>
<script type="module" src="${base}assets/app.js?v=4"></script>
</body>
</html>
`;
}

export async function handler(event) {
  const path = event.rawPath || event.requestContext?.http?.path || "";
  const code = (path.split("/").filter(Boolean).pop() || "").toLowerCase();

  const headers = {
    "content-type": "text/html; charset=utf-8",
    "x-robots-tag": "noindex",
    // Cached by code, but only for an hour — the og:image key changes daily.
    "cache-control": "public, max-age=300, s-maxage=3600",
  };

  if (!/^[a-z0-9]{6}$/.test(code)) {
    return { statusCode: 404, headers, body: "<!DOCTYPE html><title>No such card</title><p>No such card." };
  }

  let item;
  try {
    const res = await db.send(new GetItemCommand({
      TableName: TABLE,
      Key: { code: { S: code } },
    }));
    item = res.Item;
  } catch (err) {
    console.error("get failed", err);
    return { statusCode: 500, headers, body: "<!DOCTYPE html><title>Error</title><p>Something went wrong." };
  }

  if (!item) {
    return { statusCode: 404, headers, body: "<!DOCTYPE html><title>No such card</title><p>This card has expired or never existed." };
  }

  const card = Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v.S ?? v.N]));
  const today = new Date().toISOString().slice(0, 10);
  return { statusCode: 200, headers, body: page({ code, card, today }) };
}
