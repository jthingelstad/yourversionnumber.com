// Shared helpers for both card Lambdas.
//
// Plain Node ESM, not TypeScript: the repo has no build tooling anywhere (that
// is core convention 2), and adding tsc to compile two small handlers would
// import a build step into a project whose whole point is not having one.

// Base32 without the glyphs people mistype when reading a link aloud: no I, L,
// O, U, 0 or 1.
const ALPHABET = "23456789abcdefghjkmnpqrstvwxyz";

export function makeCode(bytes) {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export const LIMITS = {
  note: 140,
  name: 40,
  from: 40,
  theme: 32,
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_TEXT = /[<>]/;

export function validate(body) {
  const errors = [];
  const out = {};

  for (const field of ["name", "from", "note"]) {
    const value = typeof body?.[field] === "string" ? body[field].trim() : "";
    if (!value) errors.push(`${field} is required`);
    else if (value.length > LIMITS[field]) errors.push(`${field} is over ${LIMITS[field]} characters`);
    // Never render this as HTML, and never store anything that looks like it.
    else if (SAFE_TEXT.test(value)) errors.push(`${field} may not contain < or >`);
    else out[field] = value;
  }

  const date = typeof body?.date === "string" ? body.date.trim() : "";
  if (!DATE.test(date)) errors.push("date must be YYYY-MM-DD");
  else if (Number.isNaN(Date.parse(date + "T00:00:00Z"))) errors.push("date is not a real date");
  else if (Date.parse(date + "T00:00:00Z") > Date.now()) errors.push("date is in the future");
  else out.date = date;

  const occasion = body?.occasion === "work" ? "work" : "birthday";
  out.occasion = occasion;

  const theme = typeof body?.theme === "string" ? body.theme.trim() : "";
  if (!/^[a-z0-9-]{1,32}$/.test(theme)) errors.push("theme is not a valid name");
  else out.theme = theme;

  return { errors, card: out };
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const TTL_DAYS = 400;
