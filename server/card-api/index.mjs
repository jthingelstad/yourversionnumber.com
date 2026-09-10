// POST /api/card — validate, store, return the code.
//
// The only endpoint on the site that writes anything down. Everything it keeps
// is listed in the item below; there is no email, no account, no IP, and no
// analytics on this route.

import { randomBytes } from "node:crypto";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { makeCode, validate, TTL_DAYS } from "./shared.mjs";

const db = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME || "yvn-cards";

const CORS = {
  "content-type": "application/json",
  "cache-control": "no-store",
};

function reply(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

export async function handler(event) {
  if ((event.requestContext?.http?.method || event.httpMethod) !== "POST") {
    return reply(405, { error: "method not allowed" });
  }

  let parsed;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "";
    parsed = JSON.parse(raw);
  } catch {
    return reply(400, { error: "body must be JSON" });
  }

  const { errors, card } = validate(parsed);
  if (errors.length) return reply(400, { error: errors[0], errors });

  const created = new Date().toISOString().slice(0, 10);
  const ttl = Math.floor(Date.now() / 1000) + TTL_DAYS * 86400;

  // Six characters is 30^6 ≈ 7e8. Retry on collision rather than trusting it.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode(randomBytes(6));
    try {
      await db.send(new PutItemCommand({
        TableName: TABLE,
        Item: {
          code: { S: code },
          occasion: { S: card.occasion },
          name: { S: card.name },
          date: { S: card.date },
          theme: { S: card.theme },
          note: { S: card.note },
          from: { S: card.from },
          created: { S: created },
          ttl: { N: String(ttl) },
        },
        ConditionExpression: "attribute_not_exists(code)",
      }));
      return reply(201, { code, url: `/c/${code}` });
    } catch (err) {
      if (err.name !== "ConditionalCheckFailedException") {
        console.error("put failed", err);
        return reply(500, { error: "could not create the card" });
      }
    }
  }
  return reply(500, { error: "could not allocate a code" });
}
