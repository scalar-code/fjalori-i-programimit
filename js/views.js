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

const searchIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;

// ---------- Home ----------

let lastQuery = ""; // remembered so the results are still there when you come back

function renderResults(query) {
  const results = searchTerms(allTerms(), query);
  if (results.length === 0) return `<li><p class="empty">${esc(t("noResults", query.trim()))}</p></li>`;

  return results
    .map((term, i) => {
      const category = getCategory(term.category);
      return `<li>
        <a class="result${i === 0 ? " is-first" : ""}" href="${termUrl(term.id)}">
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
              aria-label="${esc(t("searchLabel"))}" aria-controls="results"
              placeholder="${esc(t("searchPlaceholder"))}">
            <kbd aria-hidden="true">/</kbd>
          </label>
          <ul id="results" class="results" aria-live="polite" hidden></ul>
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
          <a class="link-arrow" href="${termUrl(word.id)}">${esc(t("readMore"))}</a>
        </article>

        <a class="cta" href="/flashcards">
          <span class="cta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="3" y="6" width="14" height="15" rx="2.5"/><path d="M7 3h11.5A2.5 2.5 0 0 1 21 5.5V17"/></svg>
          </span>
          <span class="cta-text">
            <strong>${esc(t("flashcardsCta"))}</strong>
            <span>${esc(t("flashcardsCtaText", terms.length))}</span>
          </span>
          <span class="cta-arrow" aria-hidden="true">→</span>
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
        <div class="chips">${terms.map(chip).join("")}</div>
      </section>
    `,
    mount(root) {
      const input = root.querySelector("#search");
      const results = root.querySelector("#results");

      const update = () => {
        lastQuery = input.value;
        const hasQuery = input.value.trim() !== "";
        results.hidden = !hasQuery;
        results.innerHTML = hasQuery ? renderResults(input.value) : "";
      };

      input.value = lastQuery;
      update();
      input.addEventListener("input", update);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          const first = results.querySelector("a.result");
          first?.click(); // the router in main.js turns the click into a page change
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
          <button class="copy-btn" type="button">${esc(t("copy"))}</button>
        </div>
        <pre><code>${esc(item.code.snippet)}</code></pre>
      </section>`
    : "";

  // "Dëgjo": the Albanian explanation read aloud (voice: folsh.ai, see scripts/generate-audio.py)
  const listenButton = hasAudio(item.id)
    ? `<button class="listen-btn" type="button" aria-pressed="false" lang="${lang}">
        <span class="listen-icon" aria-hidden="true">🔊</span><span class="listen-label">${esc(t("listen"))}</span>
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
          <h2>💡 ${esc(t("analogy"))}</h2>
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
        <a href="${termUrl(previous.id)}"><small>${esc(t("previous"))}</small><strong>${esc(previous.en)}</strong></a>
        <a class="next" href="${termUrl(next.id)}"><small>${esc(t("next"))}</small><strong>${esc(next.en)}</strong></a>
      </nav>
    `,
    mount(root) {
      const stopAudio = setupListenButton(root, item.id);
      const button = root.querySelector(".copy-btn");
      if (!button) return stopAudio;
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(item.code.snippet);
          button.textContent = t("copied");
          setTimeout(() => (button.textContent = t("copy")), 1500);
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
  const icon = button.querySelector(".listen-icon");
  let audio = null;

  const show = (playing) => {
    button.setAttribute("aria-pressed", String(playing));
    button.classList.toggle("is-playing", playing);
    icon.textContent = playing ? "⏸" : "🔊";
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
      <p><a class="link-arrow" href="/">${esc(t("backHome"))}</a></p>
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
