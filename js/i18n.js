// All the interface text in both languages.
// To add a new piece of text: add the same key to BOTH `sq` and `en`.

const strings = {
  sq: {
    siteName: "Fjalori i Programimit",
    tagline: "Termat e programimit, të shpjeguar thjesht",
    skipToContent: "Kalo te përmbajtja",
    heroTitle: "Kupto kodin <em>në gjuhën tënde</em>",
    heroLede: "Termat bazë të programimit, të shpjeguar thjesht në shqip — me shembuj nga jeta e përditshme.",
    searchLabel: "Kërko një term",
    searchPlaceholder: "Kërko… p.sh. API, cikël, variabël",
    searchHint: "Mund të shkruash shqip ose anglisht — edhe pa ë dhe ç.",
    noResults: (q) => `Asnjë rezultat për „${q}“.`,
    wordOfTheDay: "Fjala e ditës",
    readMore: "Lexo më shumë →",
    categories: "Kategoritë",
    allTerms: "Të gjitha termat",
    termCount: (n) => `${n} ${n === 1 ? "term" : "terma"}`,
    home: "Kreu",
    inAlbanian: "Në shqip:",
    sameInAlbanian: "Në shqip përdoret i njëjti emër.",
    explanation: "Shpjegimi",
    analogy: "Si ta mendosh",
    analogyOther: "Lexoje në anglisht",
    codeExample: "Shembull kodi",
    copy: "Kopjo",
    copied: "U kopjua!",
    related: "Terma të lidhur",
    previous: "← I mëparshmi",
    next: "Tjetri →",
    notFoundTitle: "Nuk u gjet",
    notFoundText: "Kjo faqe nuk ekziston (ende).",
    termNotFound: "Ky term nuk është në fjalor (ende).",
    backHome: "Kthehu në kreu",
    loadError: "Termat nuk u ngarkuan.",
    loadErrorHint: "Nëse e hape skedarin direkt, hape përmes një serveri lokal (shih README).",
    switchToDark: "Kalo në pamjen e errët",
    switchToLight: "Kalo në pamjen e çelët",
    switchLanguage: "Switch to English",
    footer: "Bërë me kujdes për studentët në Shqipëri dhe Kosovë.",
  },
  en: {
    siteName: "Fjalori i Programimit",
    tagline: "The programming glossary in Albanian & English",
    skipToContent: "Skip to content",
    heroTitle: "Understand code <em>in your own language</em>",
    heroLede: "Core programming terms explained simply in Albanian and English — with everyday analogies.",
    searchLabel: "Search for a term",
    searchPlaceholder: "Search… e.g. API, loop, variable",
    searchHint: "Type in English or Albanian — ë and ç are optional.",
    noResults: (q) => `No results for “${q}”.`,
    wordOfTheDay: "Word of the day",
    readMore: "Read more →",
    categories: "Categories",
    allTerms: "All terms",
    termCount: (n) => `${n} ${n === 1 ? "term" : "terms"}`,
    home: "Home",
    inAlbanian: "In Albanian:",
    sameInAlbanian: "Albanian uses the same word.",
    explanation: "Explanation",
    analogy: "Think of it like this",
    analogyOther: "Read it in Albanian",
    codeExample: "Code example",
    copy: "Copy",
    copied: "Copied!",
    related: "Related terms",
    previous: "← Previous",
    next: "Next →",
    notFoundTitle: "Not found",
    notFoundText: "This page doesn't exist (yet).",
    termNotFound: "This term isn't in the glossary (yet).",
    backHome: "Back to home",
    loadError: "Couldn't load the terms.",
    loadErrorHint: "If you opened the file directly, open it through a local server instead (see README).",
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
    switchLanguage: "Kalo në shqip",
    footer: "Made with care for students in Albania and Kosovo.",
  },
};

// Name of each language, written in that language (used as labels on term pages)
export const languageNames = { sq: "Shqip", en: "English" };

const STORAGE_KEY = "lang";
let lang = "sq";
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved in strings) lang = saved;
} catch {}

export const getLang = () => lang;
export const otherLang = () => (lang === "sq" ? "en" : "sq");

export function setLang(next) {
  lang = next in strings ? next : "sq";
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
}

// t("readMore") → text in the current language.
// For keys that are functions, pass the extra values: t("termCount", 5)
export function t(key, ...args) {
  const value = strings[lang][key] ?? strings.sq[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}
