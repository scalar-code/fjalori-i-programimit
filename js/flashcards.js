// Flashcards page (/flashcards).
// See the English term → think → "I know it" (next card) or "I don't know" (the card flips and shows the answer).
// Every card is shown once per round; the answer is only revealed through "I don't know".

import { t, getLang } from "./i18n.js";
import { allTerms, allCategories, getCategory, getTerm, termsInCategory } from "./data.js";
import { esc, termUrl, hueStyle, icon } from "./views.js";

// Kept outside the page so switching language (which re-draws the page) doesn't lose your place
const state = {
  category: "all",
  queue: [],          // ids still to show; queue[0] is the card on screen
  total: 0,
  known: 0,           // cards answered "I know it"
  missed: new Set(),  // cards answered "I don't know"
  revealed: false,    // the answer of the current card is showing
};

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
  state.known = 0;
  state.missed = new Set();
  state.revealed = false;
}

// ---------- drawing ----------

// The back of the card is only put in the page once you press "I don't know",
// so the answer can't be read before that (not even by a screen reader or the page source).
function backHtml(term) {
  const lang = getLang();
  return `
    <span class="fc-back-term">${esc(term.en)}</span>
    <span class="fc-alt" lang="sq">${esc(term.sq ?? t("sameInAlbanian"))}</span>
    <span class="fc-text" lang="${lang}">${esc(term.explanation[lang])}</span>
    <span class="fc-analogy" lang="${lang}">${icon("lightbulb", "regular")} ${esc(term.analogy[lang])}</span>`;
}

function cardHtml() {
  const lang = getLang();
  const term = getTerm(state.queue[0]);
  const category = getCategory(term.category);
  // The card on screen counts as done once it's answered
  const done = state.total - state.queue.length + (state.revealed ? 1 : 0);
  const percent = Math.round((done / state.total) * 100);

  const actions = state.revealed
    ? `<button class="btn btn-know fc-next" type="button" data-action="next">${esc(t("nextCard"))} ${icon("arrow-right")}</button>`
    : `<button class="btn btn-again" type="button" data-action="dontKnow">${icon("xmark")} ${esc(t("dontKnow"))}</button>
       <button class="btn btn-know" type="button" data-action="know">${icon("check")} ${esc(t("knowIt"))}</button>`;

  const hint = state.revealed
    ? `<span class="fc-keys">${esc(t("keyHintNext"))} · </span><a href="${termUrl(term.id)}">${esc(t("openTerm"))}</a>`
    : `<span class="fc-keys">${esc(t("keyHint"))}</span>`;

  return `
    <div class="fc-progress">
      <div class="fc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${state.total}" aria-valuenow="${done}">
        <span style="width:${percent}%"></span>
      </div>
      <span class="fc-count">${t("knownCount", done, state.total)}</span>
    </div>
    <p class="fc-score">${esc(t("scoreCount", state.known, state.missed.size))}</p>

    <div class="fc-card${state.revealed ? " is-flipped" : ""}" ${hueStyle(category)}>
      <div class="fc-inner">
        <div class="fc-face fc-front" aria-hidden="${state.revealed}">
          <span class="badge">${esc(category?.name[lang])}</span>
          <span class="fc-term" lang="en">${esc(term.en)}</span>
          <span class="fc-tap">${esc(t("thinkFirst"))}</span>
        </div>
        <div class="fc-face fc-back" aria-hidden="${!state.revealed}">${state.revealed ? backHtml(term) : ""}</div>
      </div>
    </div>

    <div class="fc-actions${state.revealed ? " is-single" : ""}">${actions}</div>
    <p class="fc-hint">${hint}</p>`;
}

function doneHtml() {
  const review = state.missed.size
    ? `<button class="btn btn-know" type="button" data-action="review">${icon("rotate-left")} ${esc(t("reviewMissed", state.missed.size))}</button>`
    : "";
  return `
    <div class="fc-done">
      <div class="fc-done-icon">${icon(state.missed.size ? "dumbbell" : "trophy")}</div>
      <h2>${esc(t("doneTitle"))}</h2>
      <p>${esc(t("doneText", state.known, state.total))}</p>
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
        <button class="btn btn-ghost" type="button" data-action="restart">${icon("shuffle")} ${esc(t("shuffle"))}</button>
      </div>

      <div class="fc-stage" aria-live="polite"></div>
    `,
    mount(root) {
      const stage = root.querySelector(".fc-stage");
      const paint = () => (stage.innerHTML = state.queue.length ? cardHtml() : doneHtml());

      const actions = {
        know() {
          if (state.revealed) return;
          state.queue.shift();
          state.known++;
          paint();
        },
        dontKnow() {
          if (state.revealed) return;
          state.missed.add(state.queue[0]);
          state.revealed = true;
          // Draw the card un-flipped with its answer, then flip it on the next frame so the animation plays
          paint();
          const card = stage.querySelector(".fc-card");
          card.classList.remove("is-flipped");
          card.getBoundingClientRect();
          requestAnimationFrame(() => card.classList.add("is-flipped"));
          stage.querySelector(".fc-next")?.focus({ preventScroll: true });
        },
        next() {
          if (!state.revealed) return;
          state.queue.shift();
          state.revealed = false;
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

      // Keyboard: ← I don't know, → I know it; once the answer shows, Enter or → goes to the next card
      const onKey = (event) => {
        if (event.target.closest("input, select, textarea") || !state.queue.length) return;
        if (state.revealed) {
          if (event.key === "ArrowRight" || ((event.key === "Enter" || event.key === " ") && !event.target.closest("button, a"))) {
            event.preventDefault();
            actions.next();
          }
        } else if (event.key === "ArrowLeft") {
          actions.dontKnow();
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
