// Shared helpers for the test suites. No dependencies: node:test only.
//
// The two edition app.js files are browser modules with top-level DOM work, so
// they cannot be imported here. The arithmetic the spine must agree with is
// lifted out of them by name instead — brittle on purpose: if a function is
// renamed or restructured the test fails loudly, which is the right outcome
// for the one piece of code two files must keep identical.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");

// Pull `function <name>(...) { ... }` (top-level, brace-balanced) out of a
// source file and return it as a callable, with any helper functions it needs
// lifted the same way.
export function liftFunctions(source, names) {
  const parts = [];
  for (const name of names) {
    const start = source.indexOf(`function ${name}(`);
    if (start === -1) throw new Error(`function ${name} not found`);
    let depth = 0, i = source.indexOf("{", start);
    for (; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}" && --depth === 0) break;
    }
    parts.push(source.slice(start, i + 1));
  }
  return new Function(`${parts.join("\n")}\nreturn { ${names.join(", ")} };`)();
}

// Local-time date constructor, so tests read like the dates they mean.
export const on = (y, m, d) => new Date(y, m - 1, d);
