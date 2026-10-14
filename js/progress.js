// Remembers which terms you know, so flashcards can skip them next time.
// Saved only in this browser (localStorage) — no account needed. Flashcards and the quiz both update it.

const STORAGE_KEY = "fjalori-known";

let known = null; // Set of term ids, loaded on first use

function load() {
  if (known) return known;
  try {
    known = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    known = new Set(); // private mode, blocked storage or broken data: start fresh
  }
  return known;
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...known])); } catch {}
}

export const isKnown = (id) => load().has(id);
export const countKnown = (ids) => ids.filter(isKnown).length;

export function markKnown(id) {
  load().add(id);
  save();
}

export function markUnknown(id) {
  if (load().delete(id)) save();
}

export function forget(ids) {
  load();
  ids.forEach((id) => known.delete(id));
  save();
}
