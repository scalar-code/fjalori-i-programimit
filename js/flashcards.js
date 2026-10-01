// Flashcards page (/flashcards).
// See the English term → think → flip → "I know it" or "Again".
// Cards you don't know come back a few cards later, until the deck is empty.

import { t, getLang } from "./i18n.js";
import { allTerms, allCategories, getCategory, getTerm, termsInCategory } from "./data.js";
import { esc, termUrl, hueStyle } from "./views.js";

// Kept outside the page so switching language (which re-draws the page) doesn't lose your place
const state = {
  category: "all",
  queue: [],          // ids still to learn; queue[0] is the card on screen
  total: 0,
  missed: new Set(),  // ids you pressed "Again" on at least once
  flipped: false,
};

const AGAIN_GAP = 3; // a missed card comes back after this many other cards

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const idsFor = (category) => (category === "all" ? allTerms() : termsInCategory(category)).map((term) => term.id);

function startDeck(ids) {
  state.queue = shuffled(ids);
  state.total = ids.length;
  state.missed = new Set();
  state.flipped = false;
}

// ---------- drawing ----------

function cardHtml() {
  const lang = getLang();
  const term = getTerm(state.queue[0]);
  const category = getCategory(term.category);
  const done = state.total - state.queue.length;
  const percent = Math.round((done / state.total) * 100);

  return `
    <div class="fc-progress">
      <div class="fc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${state.total}" aria-valuenow="${done}">
        <span style="width:${percent}%"></span>
      </div>
      <span class="fc-count">${t("knownCount", done, state.total)}</span>
    </div>

    <button class="fc-card${state.flipped ? " is-flipped" : ""}" type="button" data-action="flip"
      aria-label="${esc(t("flip"))}" ${hueStyle(category)}>
      <span class="fc-inner">
        <span class="fc-face fc-front" aria-hidden="${state.flipped}">
          <span class="badge">${esc(category?.name[lang])}</span>
          <span class="fc-term" lang="en">${esc(term.en)}</span>
          <span class="fc-tap">${esc(t("tapToFlip"))}</span>
        </span>
        <span class="fc-face fc-back" aria-hidden="${!state.flipped}">
          <span class="fc-back-term">${esc(term.en)}</span>
          <span class="fc-alt" lang="sq">${esc(term.sq ?? t("sameInAlbanian"))}</span>
          <span class="fc-text" lang="${lang}">${esc(term.explanation[lang])}</span>
          <span class="fc-analogy" lang="${lang}">💡 ${esc(term.analogy[lang])}</span>
        </span>
      </span>
    </button>

    <div class="fc-actions">
      <button class="btn btn-again" type="button" data-action="again">↺ ${esc(t("again"))}</button>
      <button class="btn btn-know" type="button" data-action="know">✓ ${esc(t("knowIt"))}</button>
    </div>

    <p class="fc-hint">
      <span class="fc-keys">${esc(t("keyHint"))} · </span>
      <a href="${termUrl(term.id)}">${esc(t("openTerm"))}</a>
    </p>`;
}

function doneHtml() {
  const firstTry = state.total - state.missed.size;
  const review = state.missed.size
    ? `<button class="btn btn-know" type="button" data-action="review">↺ ${esc(t("reviewMissed", state.missed.size))}</button>`
    : "";
  return `
    <div class="fc-done">
      <div class="fc-done-emoji" aria-hidden="true">${state.missed.size ? "💪" : "🏆"}</div>
      <h2>${esc(t("doneTitle"))}</h2>
      <p>${esc(t("doneText", firstTry, state.total))}</p>
      <div class="fc-actions">
        ${review}
        <button class="btn btn-again" type="button" data-action="restart">${esc(t("restart"))}</button>
      </div>
    </div>`;
}

// ---------- the page ----------

export function flashcards() {
  if (!state.total) startDeck(idsFor(state.category));

  const lang = getLang();
  const options = [
    `<option value="all">${esc(t("allCategories"))} (${allTerms().length})</option>`,
    ...allCategories().map((c) =>
      `<option value="${esc(c.id)}"${c.id === state.category ? " selected" : ""}>${esc(c.name[lang])} (${termsInCategory(c.id).length})</option>`),
  ].join("");

  return {
    title: t("flashcardsPageTitle"),
    description: t("flashcardsDescription", allTerms().length),
    html: `
      <nav class="crumbs" aria-label="breadcrumb"><a href="/">${esc(t("home"))}</a></nav>

      <header class="fc-head">
        <h1>${esc(t("flashcardsTitle"))}</h1>
        <p class="lede">${esc(t("flashcardsLede"))}</p>
      </header>

      <div class="fc-controls">
        <label class="fc-select">
          <span>${esc(t("category"))}</span>
          <select id="fc-category">${options}</select>
        </label>
        <button class="btn btn-ghost" type="button" data-action="restart">↻ ${esc(t("shuffle"))}</button>
      </div>

      <div class="fc-stage" aria-live="polite"></div>
    `,
    mount(root) {
      const stage = root.querySelector(".fc-stage");
      const paint = () => (stage.innerHTML = state.queue.length ? cardHtml() : doneHtml());

      const actions = {
        flip() {
          // Only toggle a class (no re-draw) so the flip animation plays
          state.flipped = !state.flipped;
          const card = stage.querySelector(".fc-card");
          if (!card) return;
          card.classList.toggle("is-flipped", state.flipped);
          card.querySelector(".fc-front").setAttribute("aria-hidden", state.flipped);
          card.querySelector(".fc-back").setAttribute("aria-hidden", !state.flipped);
        },
        know() {
          state.queue.shift();
          state.flipped = false;
          paint();
        },
        again() {
          const id = state.queue.shift();
          state.missed.add(id);
          state.queue.splice(Math.min(AGAIN_GAP, state.queue.length), 0, id);
          state.flipped = false;
          paint();
        },
        review() {
          startDeck([...state.missed]);
          paint();
        },
        restart() {
          startDeck(idsFor(state.category));
          paint();
        },
      };

      paint();

      root.querySelector("#fc-category").addEventListener("change", (event) => {
        state.category = event.target.value;
        actions.restart();
      });

      root.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (button) actions[button.dataset.action]?.();
      });

      // Keyboard: Space/Enter flips, ← again, → know it
      const onKey = (event) => {
        if (event.target.closest("input, select, textarea") || !state.queue.length) return;
        if (event.key === " " || event.key === "Enter") {
          if (event.target.closest("button, a")) return; // the browser already "clicks" a focused button
          event.preventDefault();
          actions.flip();
        } else if (event.key === "ArrowLeft") {
          actions.again();
        } else if (event.key === "ArrowRight") {
          actions.know();
        }
      };
      document.addEventListener("keydown", onKey);

      // Returned function runs when you leave the page
      return () => document.removeEventListener("keydown", onKey);
    },
  };
}
