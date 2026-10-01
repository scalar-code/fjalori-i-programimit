// Starts the app: loads the terms, decides which page to show, wires up the header buttons.

import { loadData } from "./data.js";
import { t, getLang, otherLang, setLang } from "./i18n.js";
import * as views from "./views.js";

// The address after "#" decides the page:
//   #/                → home
//   #/term/api        → term page
//   #/category/web    → category page
// To add a page later (e.g. flashcards): write a view in views.js and add one line here.
const routes = {
  "": () => views.home(),
  term: (id) => views.term(id),
  category: (id) => views.category(id),
};

const main = document.getElementById("main");
let currentHash = null;

function render() {
  const [page = "", id] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const view = (routes[page] ?? (() => views.notFound()))(id);

  main.innerHTML = view.html;
  document.title = view.title;
  view.mount?.(main);
  updateChrome();

  // Only jump to the top when the page actually changed (not on a language switch)
  if (location.hash !== currentHash) {
    if (currentHash !== null) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    currentHash = location.hash;
  }
}

// Header/footer text and button states that depend on language or theme
function updateChrome() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));

  const langButton = document.getElementById("lang-toggle");
  langButton.setAttribute("aria-label", t("switchLanguage"));
  langButton.querySelectorAll("[data-lang]").forEach((el) => el.classList.toggle("active", el.dataset.lang === lang));

  const dark = document.documentElement.dataset.theme === "dark";
  document.getElementById("theme-toggle").setAttribute("aria-label", t(dark ? "switchToLight" : "switchToDark"));
}

function setupButtons() {
  document.getElementById("lang-toggle").addEventListener("click", () => {
    setLang(otherLang());
    render();
  });

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    updateChrome();
  });

  // Press "/" anywhere to jump to the search box
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.target.closest("input, textarea")) return;
    event.preventDefault();
    if (!document.getElementById("search")) location.hash = "#/";
    setTimeout(() => document.getElementById("search")?.focus()); // runs after the home page renders
  });
}

async function start() {
  setupButtons();
  try {
    await loadData();
  } catch (error) {
    console.error(error);
    const view = views.loadError();
    main.innerHTML = view.html;
    updateChrome();
    return;
  }
  window.addEventListener("hashchange", render);
  render();
}

start();
