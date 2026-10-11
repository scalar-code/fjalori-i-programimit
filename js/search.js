// Finds terms in either language as you type — and forgives spelling mistakes.

// "Ndërfaqe" → "nderfaqe", "Çelës" → "celes": so people can type without ë and ç.
export function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// A "sounds-like" version of a word, used only for typo matching. It irons out the
// spellings beginners mix up most, in both languages:
//   c/k/q/ç → k   ("klasa" ≈ "class", "kompjuter" ≈ "computer", "qelës" ≈ "çelës")
//   x → ks, y → i, w → v, ph → f, th → t   ("sintaks" ≈ "syntax")
//   double letters → single   ("varriabel" ≈ "variabel", "comitt" ≈ "commit")
function loose(text) {
  return normalize(text)
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/x/g, "ks")
    .replace(/[cq]/g, "k")
    .replace(/y/g, "i")
    .replace(/w/g, "v")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/([a-z])\1+/g, "$1")
    .trim();
}

// How many typos we forgive: none for very short words, more for longer ones
const allowedTypos = (length) => (length <= 3 ? 0 : length <= 5 ? 1 : length <= 9 ? 2 : 3);

// Number of single-letter edits (add, remove, change, or swap two neighbours) between
// two words. Gives up early and returns max + 1 once it's clearly more than `max`.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, before[j - 2] + 1);
      row[j] = d;
      rowMin = Math.min(rowMin, d);
    }
    if (rowMin > max) return max + 1;
    before = prev;
    prev = row;
  }
  return prev[b.length];
}

// The names of each term, prepared once (the glossary has 1000+ terms, and we search on every keystroke)
const prepared = new WeakMap();
function namesOf(term) {
  if (!prepared.has(term)) {
    const names = [term.en, term.sq, ...(term.aliases ?? [])].filter(Boolean);
    const looseNames = names.map(loose).filter(Boolean);
    prepared.set(term, {
      names: names.map(normalize),
      loose: looseNames,
      main: new Set([term.en, term.sq].filter(Boolean).map(loose)), // the term's own names, not aliases
      looseWords: [...new Set(looseNames.flatMap((n) => n.split(" ")))],
    });
  }
  return prepared.get(term);
}

// Better matches get a higher score:
//   exact name 100 › name starts with it 60 › a word in the name starts with it 50
//   › name contains it 30 › only the explanation mentions it 10
function score(term, query) {
  const { names } = namesOf(term);

  if (names.some((n) => n === query)) return 100;
  if (names.some((n) => n.startsWith(query))) return 60;
  if (names.some((n) => n.split(/[\s\-()]+/).some((word) => word.startsWith(query)))) return 50;
  if (names.some((n) => n.includes(query))) return 30;

  if (query.length >= 3) {
    const text = normalize(`${term.explanation.sq} ${term.explanation.en}`);
    if (text.includes(query)) return 10;
  }
  return 0;
}

// Typo-tolerant score (0–28), only used when the normal search finds little.
//   whole name almost right 28 › one word of the name almost right 24
//   › the start of a name almost right (still typing) 20 — minus 4 per typo,
//   and 2 less when it's only an alias, so "pyton" shows Python before "== python"
function fuzzyScore(term, looseQuery) {
  const { loose: names, looseWords, main } = namesOf(term);
  const mainWords = new Set([...main].flatMap((n) => n.split(" ")));
  const queryWords = looseQuery.split(" ");
  let best = 0;
  const consider = (base, distance) => { best = Math.max(best, base - 4 * distance); };

  if (queryWords.length > 1) {
    // Several words ("bubel sortt"): every word has to be close to some word of the name
    const max = allowedTypos(looseQuery.length);
    for (const n of names) {
      const d = editDistance(looseQuery, n, max);
      if (d <= max) consider(28, d);
    }
    const allClose = queryWords.every((q) =>
      looseWords.some((w) => w.startsWith(q) || editDistance(q, w, allowedTypos(q.length)) <= allowedTypos(q.length)),
    );
    if (allClose) consider(22, 0);
    return best;
  }

  const max = allowedTypos(looseQuery.length);
  for (const n of names) {
    const d = editDistance(looseQuery, n, max);
    if (d <= max) consider(main.has(n) ? 28 : 26, d);
  }
  for (const w of looseWords) {
    const d = editDistance(looseQuery, w, max);
    if (d <= max) consider(mainWords.has(w) ? 24 : 22, d);
    // Still typing: compare with the start of the word ("fukns" ≈ "funks…" of "function")
    if (w.length > looseQuery.length && looseQuery.length >= 4) {
      const p = editDistance(looseQuery, w.slice(0, looseQuery.length), max);
      if (p <= max) consider(20, p);
    }
  }
  return best;
}

// Returns the matching terms, best first. If nothing (or almost nothing) matches the
// spelling exactly, it adds the closest spellings and marks the list with `.fuzzy = true`.
export function searchTerms(terms, rawQuery) {
  const query = normalize(rawQuery.trim());
  if (!query) return [];

  const scored = terms.map((term) => ({ term, score: score(term, query) }));
  const strong = scored.filter((r) => r.score >= 30).length;

  let fuzzy = false;
  const looseQuery = loose(query);
  if (strong < 5 && looseQuery.length >= 3) {
    for (const r of scored) {
      if (r.score >= 30) continue;
      const f = fuzzyScore(r.term, looseQuery);
      if (f > r.score) { r.score = f; fuzzy ||= strong === 0; }
    }
  }

  const results = scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.term.en.localeCompare(b.term.en))
    .map((r) => r.term);
  results.fuzzy = fuzzy && results.length > 0;
  return results;
}
