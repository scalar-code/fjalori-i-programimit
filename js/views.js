// Every page of the site is one function here.
// Each returns { title, description, html, mount? }:
//   title – text for the browser tab (and Google's result title)
//   description – the short summary Google and WhatsApp show under the title
//   html  – what goes inside <main>
//   mount – optional; runs after the html is on the page (to wire up buttons etc.)

import { t, getLang, otherLang, languageNames } from "./i18n.js";
import { allTerms, allCategories, getTerm, getCategory, termsInCategory, wordOfTheDay, hasAudio, audioUrl } from "./data.js";
import { searchTerms } from "./search.js";

// ---------- small helpers ----------

// Makes text safe to put inside HTML (so a "<" in a term can't break the page)
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export const termUrl = (id) => `/term/${encodeURIComponent(id)}`;
export const categoryUrl = (id) => `/category/${encodeURIComponent(id)}`;

// Shortens text for <meta name="description"> (Google shows about 155 characters)
export function summarize(text, max = 155) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:—–-]+$/, "") + "…";
}
export const hueStyle = (category) => `style="--hue:${Number(category?.hue) || 220}"`;

function categoryBadge(category) {
  if (!category) return "";
  return `<a class="badge" href="${categoryUrl(category.id)}" ${hueStyle(category)}>${esc(category.name[getLang()])}</a>`;
}

function chip(term) {
  const category = getCategory(term.category);
  const alt = term.sq && term.sq !== term.en ? ` <small>${esc(term.sq)}</small>` : "";
  return `<a class="chip" href="${termUrl(term.id)}" ${hueStyle(category)}>${esc(term.en)}${alt}</a>`;
}

// Font Awesome icon, e.g. icon("lightbulb") → <i class="fa-solid fa-lightbulb">  (see fontawesome.com/icons)
export const icon = (name, style = "solid") => `<i class="fa-${style} fa-${name}" aria-hidden="true"></i>`;

const searchIcon = icon("magnifying-glass");

// ---------- Home ----------

let lastQuery = ""; // remembered so the results are still there when you come back
let lastSearchCategory = ""; // "" = search every category

// "All terms" on the home page: show 20, then 20 more per click; after 8 clicks also offer "show all"
const TERMS_STEP = 20;
const SHOW_ALL_AFTER = 8;
let shownTerms = TERMS_STEP; // remembered so the list stays open when you come back

function renderResults(query, categoryId = "") {
  const pool = categoryId ? termsInCategory(categoryId) : allTerms();
  const results = searchTerms(pool, query);
  if (results.length === 0) {
    const category = getCategory(categoryId);
    return `<li role="presentation"><p class="empty">${esc(category
      ? t("noResultsIn", query.trim(), category.name[getLang()])
      : t("noResults", query.trim()))}</p></li>`;
  }

  // Nothing matched the spelling exactly, so these are the closest spellings
  const hint = results.fuzzy ? `<li role="presentation"><p class="empty">${esc(t("didYouMean", query.trim()))}</p></li>` : "";
  return hint + results
    .map((term, i) => {
      const category = getCategory(term.category);
      return `<li role="presentation">
        <a class="result" id="result-${i}" role="option" aria-selected="false" href="${termUrl(term.id)}">
          <span class="result-names">
            <span class="result-en">${esc(term.en)}</span>
            ${term.sq ? `<span class="result-sq">${esc(term.sq)}</span>` : ""}
          </span>
          <span class="badge" ${hueStyle(category)}>${esc(category?.name[getLang()])}</span>
        </a>
      </li>`;
    })
    .join("");
}

export function home() {
  const lang = getLang();
  const word = wordOfTheDay();
  const wordCategory = getCategory(word.category);
  const terms = allTerms();

  const categoryCards = allCategories()
    .map((category) => {
      const count = termsInCategory(category.id).length;
      return `<a class="cat-card" href="${categoryUrl(category.id)}" ${hueStyle(category)}>
        <span class="cat-icon" aria-hidden="true">${esc(category.icon)}</span>
        <span>
          <h3>${esc(category.name[lang])}</h3>
          <p>${esc(category.description[lang])}</p>
          <span class="count">${t("termCount", count)}</span>
        </span>
      </a>`;
    })
    .join("");

  return {
    title: t("homeTitle"),
    description: t("homeDescription", terms.length),
    html: `
      <section class="hero">
        <h1>${t("heroTitle")}</h1>
        <p class="lede">${esc(t("heroLede"))}</p>

        <div class="search" role="search">
          <label class="search-box">
            ${searchIcon}
            <input id="search" type="search" autocomplete="off" spellcheck="false"
              role="combobox" aria-expanded="false" aria-autocomplete="list"
              aria-label="${esc(t("searchLabel"))}" aria-controls="results"
              placeholder="${esc(t("searchPlaceholder"))}">
            <kbd aria-hidden="true">/</kbd>
          </label>
          <div class="search-filter">
            <label for="search-category">${esc(t("searchIn"))}</label>
            <select id="search-category">
              <option value="">${esc(t("everyCategory"))}</option>
              ${allCategories().map((c) => `<option value="${esc(c.id)}"${c.id === lastSearchCategory ? " selected" : ""}>${esc(c.name[lang])}</option>`).join("")}
            </select>
          </div>
          <ul id="results" class="results" role="listbox" aria-label="${esc(t("searchLabel"))}" hidden></ul>
          <p class="search-hint">${esc(t("searchHint"))}</p>
        </div>
      </section>

      <section class="section" aria-labelledby="wotd-label">
        <article class="wotd" ${hueStyle(wordCategory)}>
          <div class="wotd-top">
            <span class="eyebrow" id="wotd-label">${esc(t("wordOfTheDay"))}</span>
            ${categoryBadge(wordCategory)}
          </div>
          <h2>${esc(word.en)}</h2>
          <p class="alt">${word.sq ? esc(word.sq) : esc(t("sameInAlbanian"))}</p>
          <p class="text">${esc(word.explanation[lang])}</p>
          <a class="link-arrow" href="${termUrl(word.id)}">${esc(t("readMore"))} ${icon("arrow-right")}</a>
        </article>

        <a class="cta" href="/flashcards">
          <span class="cta-icon">${icon("layer-group")}</span>
          <span class="cta-text">
            <strong>${esc(t("flashcardsCta"))}</strong>
            <span>${esc(t("flashcardsCtaText", terms.length))}</span>
          </span>
          <span class="cta-arrow">${icon("arrow-right")}</span>
        </a>

        <a class="cta" href="/quiz">
          <span class="cta-icon">${icon("circle-question")}</span>
          <span class="cta-text">
            <strong>${esc(t("quizCta"))}</strong>
            <span>${esc(t("quizCtaText"))}</span>
          </span>
          <span class="cta-arrow">${icon("arrow-right")}</span>
        </a>
      </section>

      <section class="section">
        <div class="section-head"><h2>${esc(t("categories"))}</h2></div>
        <div class="cat-grid">${categoryCards}</div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>${esc(t("allTerms"))}</h2>
          <span class="count">${t("termCount", terms.length)}</span>
        </div>
        <div class="chips" id="all-terms">${terms.slice(0, shownTerms).map(chip).join("")}</div>
        <div class="more-row" id="more-row"></div>
      </section>
    `,
    mount(root) {
      const list = root.querySelector("#all-terms");
      const moreRow = root.querySelector("#more-row");

      const showTerms = (count) => {
        const next = Math.min(count, terms.length);
        list.insertAdjacentHTML("beforeend", terms.slice(list.children.length, next).map(chip).join(""));
        shownTerms = next;
        renderMoreButtons();
      };

      const renderMoreButtons = () => {
        const left = terms.length - shownTerms;
        if (left <= 0) {
          moreRow.innerHTML = "";
          return;
        }
        const clicks = Math.round((shownTerms - TERMS_STEP) / TERMS_STEP);
        moreRow.innerHTML = `
          <button class="btn btn-ghost" type="button" data-more>${esc(t("showMore", Math.min(TERMS_STEP, left)))}</button>
          ${clicks >= SHOW_ALL_AFTER ? `<button class="btn btn-ghost" type="button" data-all>${esc(t("showAll", terms.length))}</button>` : ""}`;
      };

      moreRow.addEventListener("click", (event) => {
        if (event.target.closest("[data-more]")) showTerms(shownTerms + TERMS_STEP);
        else if (event.target.closest("[data-all]")) showTerms(terms.length);
      });
      renderMoreButtons();

      const input = root.querySelector("#search");
      const results = root.querySelector("#results");
      const categorySelect = root.querySelector("#search-category");
      let active = 0; // which result ↑/↓ have moved to; Enter opens it

      const options = () => [...results.querySelectorAll("a.result")];
      const highlight = (index) => {
        const items = options();
        if (items.length === 0) return input.removeAttribute("aria-activedescendant");
        active = (index + items.length) % items.length; // wraps around at both ends
        items.forEach((a, i) => {
          a.classList.toggle("is-active", i === active);
          a.setAttribute("aria-selected", String(i === active));
        });
        input.setAttribute("aria-activedescendant", items[active].id);
        items[active].scrollIntoView({ block: "nearest" });
      };

      const update = () => {
        lastQuery = input.value;
        lastSearchCategory = categorySelect.value;
        const hasQuery = input.value.trim() !== "";
        results.hidden = !hasQuery;
        input.setAttribute("aria-expanded", String(hasQuery));
        results.innerHTML = hasQuery ? renderResults(input.value, categorySelect.value) : "";
        highlight(0);
      };

      input.value = lastQuery;
      update();
      input.addEventListener("input", update);
      categorySelect.addEventListener("change", () => {
        update();
        input.focus();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          if (results.hidden) return;
          event.preventDefault(); // stop the cursor jumping to the start/end of the text
          highlight(active + (event.key === "ArrowDown" ? 1 : -1));
        } else if (event.key === "Enter") {
          options()[active]?.click(); // the router in main.js turns the click into a page change
        } else if (event.key === "Escape") {
          input.value = "";
          update();
        }
      });
    },
  };
}

// ---------- Term page ----------

export function term(id) {
  const item = getTerm(id);
  if (!item) return notFound(t("termNotFound"));

  const lang = getLang();
  const other = otherLang();
  const category = getCategory(item.category);
  const related = (item.related ?? []).map(getTerm).filter(Boolean);

  const terms = allTerms();
  const index = terms.indexOf(item);
  const previous = terms[(index - 1 + terms.length) % terms.length];
  const next = terms[(index + 1) % terms.length];

  const albanianLine = item.sq
    ? `${esc(t("inAlbanian"))} <strong lang="sq">${esc(item.sq)}</strong>`
    : esc(t("sameInAlbanian"));

  const code = item.code
    ? `<section class="block code">
        <div class="code-head">
          <h2>${esc(t("codeExample"))}<span class="code-lang">${esc(item.code.language)}</span></h2>
          <button class="copy-btn" type="button">${icon("copy", "regular")} <span>${esc(t("copy"))}</span></button>
        </div>
        <pre><code>${esc(item.code.snippet)}</code></pre>
      </section>`
    : "";

  // "Dëgjo": the Albanian explanation read aloud (voice: folsh.ai, see scripts/generate-audio.py)
  const listenButton = hasAudio(item.id)
    ? `<button class="listen-btn" type="button" aria-pressed="false" lang="${lang}">
        <span class="listen-icon">${icon("volume-high")}</span><span class="listen-label">${esc(t("listen"))}</span>
      </button>`
    : "";

  const relatedHtml = related.length
    ? `<section class="section">
        <div class="section-head"><h2>${esc(t("related"))}</h2></div>
        <div class="chips">${related.map(chip).join("")}</div>
      </section>`
    : "";

  return {
    title: t("termTitle", item.en),
    description: summarize(
      lang === "sq" && item.sq ? `${item.sq} (${item.en}): ${item.explanation.sq}` : item.explanation[lang],
    ),
    html: `
      <nav class="crumbs" aria-label="breadcrumb">
        <a href="/">${esc(t("home"))}</a><span aria-hidden="true">/</span>
        <a href="${categoryUrl(category?.id)}">${esc(category?.name[lang])}</a>
      </nav>

      <article ${hueStyle(category)}>
        <header class="term-head">
          ${categoryBadge(category)}
          <h1 lang="en">${esc(item.en)}</h1>
          <p class="alt">${albanianLine}</p>
        </header>

        <section class="block">
          <div class="explain-primary" lang="${lang}">
            <div class="explain-head">
              <h2>${esc(t("explanation"))}<span class="lang-tag">${lang.toUpperCase()}</span></h2>
              ${lang === "sq" ? listenButton : ""}
            </div>
            <p>${esc(item.explanation[lang])}</p>
          </div>
          <div class="explain-secondary" lang="${other}">
            <div class="explain-head">
              <h2>${esc(languageNames[other])}<span class="lang-tag">${other.toUpperCase()}</span></h2>
              ${other === "sq" ? listenButton : ""}
            </div>
            <p>${esc(item.explanation[other])}</p>
          </div>
        </section>

        <section class="block analogy">
          <h2>${icon("lightbulb", "regular")} ${esc(t("analogy"))}</h2>
          <p lang="${lang}">${esc(item.analogy[lang])}</p>
          <details>
            <summary>${esc(t("analogyOther"))}</summary>
            <p lang="${other}">${esc(item.analogy[other])}</p>
          </details>
        </section>

        ${code}
      </article>

      ${relatedHtml}

      <nav class="term-nav">
        <a href="${termUrl(previous.id)}"><small>${icon("arrow-left")} ${esc(t("previous"))}</small><strong>${esc(previous.en)}</strong></a>
        <a class="next" href="${termUrl(next.id)}"><small>${esc(t("next"))} ${icon("arrow-right")}</small><strong>${esc(next.en)}</strong></a>
      </nav>
    `,
    mount(root) {
      const stopAudio = setupListenButton(root, item.id);
      const button = root.querySelector(".copy-btn");
      if (!button) return stopAudio;
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(item.code.snippet);
          button.innerHTML = `${icon("check")} <span>${esc(t("copied"))}</span>`;
          setTimeout(() => (button.innerHTML = `${icon("copy", "regular")} <span>${esc(t("copy"))}</span>`), 1500);
        } catch {
          // Clipboard can be blocked (e.g. non-https); selecting the code is a good fallback
          getSelection().selectAllChildren(root.querySelector(".code pre"));
        }
      });
      return stopAudio;
    },
  };
}

// Plays/pauses the term's recording; returns a function that stops it (used when leaving the page)
function setupListenButton(root, id) {
  const button = root.querySelector(".listen-btn");
  if (!button) return undefined;
  const label = button.querySelector(".listen-label");
  const iconBox = button.querySelector(".listen-icon");
  let audio = null;

  const show = (playing) => {
    button.setAttribute("aria-pressed", String(playing));
    button.classList.toggle("is-playing", playing);
    iconBox.innerHTML = icon(playing ? "pause" : "volume-high");
    label.textContent = t(playing ? "pause" : "listen");
  };

  button.addEventListener("click", () => {
    if (!audio) {
      audio = new Audio(audioUrl(id)); // downloaded only when someone clicks
      audio.addEventListener("ended", () => show(false));
      audio.addEventListener("pause", () => show(false));
      audio.addEventListener("play", () => show(true));
      audio.addEventListener("error", () => { label.textContent = t("audioError"); });
    }
    if (audio.paused) audio.play().catch(() => (label.textContent = t("audioError")));
    else audio.pause();
  });

  return () => audio?.pause();
}

// ---------- Category page ----------

export function category(id) {
  const cat = getCategory(id);
  if (!cat) return notFound();

  const lang = getLang();
  const terms = termsInCategory(id);
  const cards = terms
    .map((item) => `<a class="term-card" href="${termUrl(item.id)}" ${hueStyle(cat)}>
        <h3>${esc(item.en)}</h3>${item.sq ? `<span class="alt">${esc(item.sq)}</span>` : ""}
        <p>${esc(item.explanation[lang])}</p>
      </a>`)
    .join("");

  return {
    title: t("categoryTitle", cat.name[lang]),
    description: summarize(t("categoryDescription", cat.description[lang], terms.length, terms.slice(0, 4).map((x) => x.en).join(", "))),
    html: `
      <nav class="crumbs" aria-label="breadcrumb"><a href="/">${esc(t("home"))}</a></nav>
      <header class="page-head" ${hueStyle(cat)}>
        <span class="cat-icon" aria-hidden="true">${esc(cat.icon)}</span>
        <div>
          <h1>${esc(cat.name[lang])}</h1>
          <p>${esc(cat.description[lang])} · ${t("termCount", terms.length)}</p>
        </div>
      </header>
      <div class="term-list">${cards}</div>
    `,
  };
}

// ---------- Not found / errors ----------

export function notFound(message = t("notFoundText")) {
  return {
    title: `${t("notFoundTitle")} | ${t("siteName")}`,
    description: message,
    html: `<div class="empty-state">
      <h1>${esc(t("notFoundTitle"))}</h1>
      <p>${esc(message)}</p>
      <p><a class="link-arrow" href="/">${icon("arrow-left")} ${esc(t("backHome"))}</a></p>
    </div>`,
  };
}

export function loadError() {
  return {
    title: t("siteName"),
    description: t("loadError"),
    html: `<div class="empty-state">
      <h1>${esc(t("loadError"))}</h1>
      <p>${esc(t("loadErrorHint"))}</p>
    </div>`,
  };
}
