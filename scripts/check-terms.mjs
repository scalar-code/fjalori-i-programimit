// Checks data/terms.json for common mistakes after you add or edit terms.
// Run with:  node scripts/check-terms.mjs

import { readFileSync } from "node:fs";

let data;
try {
  data = JSON.parse(readFileSync(new URL("../data/terms.json", import.meta.url), "utf8"));
} catch (error) {
  console.error("✗ terms.json is not valid JSON:\n ", error.message);
  console.error("  Tip: look for a missing comma or an extra comma before } or ].");
  process.exit(1);
}

const problems = [];
const categoryIds = new Set(data.categories.map((c) => c.id));
const termIds = new Set();

for (const term of data.terms) {
  const label = `"${term.id ?? term.en ?? "?"}"`;

  if (!term.id) problems.push(`${label}: missing "id"`);
  else if (!/^[a-z0-9-]+$/.test(term.id)) problems.push(`${label}: id should be lowercase letters, numbers and dashes only`);
  else if (term.id === "index") problems.push(`${label}: "index" can't be used as an id (it clashes with index.html on the server)`);
  if (termIds.has(term.id)) problems.push(`${label}: id is used twice`);
  termIds.add(term.id);

  if (!term.en) problems.push(`${label}: missing "en"`);
  if (!("sq" in term)) problems.push(`${label}: missing "sq" (use null if Albanian uses the same word)`);
  if (!categoryIds.has(term.category)) problems.push(`${label}: unknown category "${term.category}"`);

  for (const field of ["explanation", "analogy"]) {
    if (!term[field]?.sq) problems.push(`${label}: missing ${field}.sq`);
    if (!term[field]?.en) problems.push(`${label}: missing ${field}.en`);
  }
  if (term.code && (!term.code.language || !term.code.snippet)) {
    problems.push(`${label}: "code" needs both "language" and "snippet" (or set it to null)`);
  }
}

for (const term of data.terms) {
  for (const relatedId of term.related ?? []) {
    if (!termIds.has(relatedId)) problems.push(`"${term.id}": related term "${relatedId}" does not exist`);
  }
}

if (problems.length) {
  console.error(`✗ Found ${problems.length} problem(s):`);
  problems.forEach((p) => console.error("  - " + p));
  process.exit(1);
}
console.log(`✓ All good: ${data.terms.length} terms in ${data.categories.length} categories.`);
