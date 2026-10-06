// Starts the app: loads the terms, decides which page to show, wires up the header buttons.
//
// Every page also exists as a real HTML file (made by scripts/build.mjs), so the content is
// there before any JavaScript runs. This file then takes over: it makes clicks between pages
// instant, and powers search, flashcards and the language/theme buttons.

import { loadData } from "./data.js";
import { t, getLang, otherLang, setLang } from "./i18n.js";
import * as views from "./views.js";
import { flashcards } from "./flashcards.js";
import { contact } from "./contact.js";

// The address decides the page:
//   /                → home
//   /term/api        → term page
//   /category/web    → category page
//   /flashcards      → flashcards
//   /contact         → contact form
// To add a page: write a function that returns { title, description, html, mount },
// add one line here, and one writePage(...) line in scripts/build.mjs.
const routes = {
  "": () => views.home(),
  term: (id) => views.term(id),
  category: (id) => views.category(id),
  flashcards: () => flashcards(),
  contact: () => contact(),
};

const main = document.getElementById("main");
let currentPath = null;
let cleanup = null; // a page's mount() can return a function to run when you leave it

function render() {
  const [page = "", id] = location.pathname.replace(/^\/|\/$/g, "").split("/").map(decodeURIComponent);
  const view = (routes[page] ?? (() => views.notFound()))(id);

  cleanup?.();
  main.innerHTML = view.html;
  document.title = view.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", view.description ?? "");
  cleanup = view.mount?.(main);
  updateChrome();

  // Only jump to the top when the page actually changed (not on a language switch)
  if (location.pathname !== currentPath) {
    if (currentPath !== null) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    currentPath = location.pathname;
  }
}

export function navigate(path) {
  if (path !== location.pathname) history.pushState(null, "", path);
  render();
}

// Clicking a link to another page of this site: change the page without reloading
function interceptLinks() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (
      !link || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||  // "open in new tab" etc.
      link.target || link.hasAttribute("download") ||
      link.origin !== location.origin ||
      link.getAttribute("href").startsWith("#")                          // e.g. the "skip to content" link
    ) return;
    event.preventDefault();
    navigate(link.pathname);
    if (link.hasAttribute("data-focus-search")) focusSearch();
  });
  window.addEventListener("popstate", render); // browser back/forward buttons

  // An old /#/… link opened while already on the site (template.html handles fresh page loads)
  window.addEventListener("hashchange", () => {
    if (!location.hash.startsWith("#/")) return;
    history.replaceState(null, "", location.hash.slice(1));
    render();
  });
}

// "Kërko" in the phone menu: go home and put the cursor in the search box
function focusSearch() {
  const search = document.getElementById("search");
  if (!search) return;
  search.scrollIntoView({ block: "center" });
  search.focus();
}

// Which bottom-menu tab is the current page?
function currentTab() {
  const path = location.pathname;
  if (path === "/") return "home";
  if (path.startsWith("/flashcards")) return "flashcards";
  if (path.startsWith("/contact")) return "contact";
  return null;
}

// Header/footer text and button states that depend on language or theme
function updateChrome() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));

  const langButton = document.getElementById("lang-toggle");
  langButton.setAttribute("aria-label", t("switchLanguage"));
  langButton.querySelectorAll("[data-lang]").forEach((el) => el.classList.toggle("active", el.dataset.lang === lang));

  const tab = currentTab();
  document.querySelectorAll(".mobile-nav a").forEach((a) => {
    const active = a.dataset.nav === tab;
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

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
    if (event.key !== "/" || event.target.closest("input, textarea, select")) return;
    event.preventDefault();
    if (!document.getElementById("search")) navigate("/");
    document.getElementById("search")?.focus();
  });
}

async function start() {
  setupButtons();
  try {
    await loadData();
  } catch (error) {
    // The page's own HTML is still there and readable — just without search, flashcards etc.
    console.error(error);
    if (!main.textContent.trim()) main.innerHTML = views.loadError().html;
    return;
  }
  interceptLinks();
  render();
}

start();
