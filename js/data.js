// Holds the terms from data/terms.json and gives the rest of the app easy ways to read them.
// In the browser, loadData() fetches the file; the build script calls setData() directly.

let categoryList = [];
let termList = [];      // sorted A–Z by English name
const termsById = new Map();
let audioIds = new Set(); // terms that have a "Dëgjo" recording (audio/manifest.json)

export function setData(data, audioManifest = {}) {
  audioIds = new Set(Object.keys(audioManifest));
  categoryList = data.categories;
  termList = [...data.terms].sort((a, b) => a.en.localeCompare(b.en));
  termsById.clear();
  termList.forEach((term) => termsById.set(term.id, term));
}

export async function loadData() {
  const [response, audio] = await Promise.all([
    fetch("/data/terms.json"),
    fetch("/audio/manifest.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  setData(await response.json(), audio);
}

export const hasAudio = (id) => audioIds.has(id);
export const audioUrl = (id) => `/audio/${encodeURIComponent(id)}.m4a`;

export const allTerms = () => termList;
export const allCategories = () => categoryList;
export const getTerm = (id) => termsById.get(id);
export const getCategory = (id) => categoryList.find((c) => c.id === id);
export const termsInCategory = (id) => termList.filter((term) => term.category === id);

// Same word for everyone on the same day; moves to the next term at midnight.
export function wordOfTheDay(date = new Date()) {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return termList[dayNumber % termList.length];
}
