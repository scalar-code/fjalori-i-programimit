// Loads data/terms.json once and gives the rest of the app easy ways to read it.

let categoryList = [];
let termList = [];      // sorted A–Z by English name
const termsById = new Map();

export async function loadData() {
  const response = await fetch("data/terms.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  categoryList = data.categories;
  termList = [...data.terms].sort((a, b) => a.en.localeCompare(b.en));
  termList.forEach((term) => termsById.set(term.id, term));
}

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
