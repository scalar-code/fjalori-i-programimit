// Finds terms in either language as you type.

// "Ndërfaqe" → "nderfaqe", "Çelës" → "celes": so people can type without ë and ç.
export function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Better matches get a higher score:
//   exact name 100 › name starts with it 60 › a word in the name starts with it 50
//   › name contains it 30 › only the explanation mentions it 10
function score(term, query) {
  const names = [term.en, term.sq, ...(term.aliases ?? [])].filter(Boolean).map(normalize);

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

export function searchTerms(terms, rawQuery) {
  const query = normalize(rawQuery.trim());
  if (!query) return [];

  return terms
    .map((term) => ({ term, score: score(term, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.term.en.localeCompare(b.term.en))
    .map((r) => r.term);
}
