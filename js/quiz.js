// Quiz page (/quiz).
// 10 questions: see a term, pick which of 4 explanations is the right one.
// The wrong answers come from the same category, so they look believable.
// Right answers mark the term as known, wrong ones as not known (progress.js) — flashcards use the same list.

import { t, getLang } from "./i18n.js";
import { allTerms, allCategories, getCategory, getTerm, termsInCategory } from "./data.js";
import { esc, termUrl, hueStyle, icon } from "./views.js";
import { markKnown, markUnknown } from "./progress.js";

const QUESTIONS = 10;
const LETTERS = ["A", "B", "C", "D"];

// Kept outside the page so switching language doesn't lose your place
const state = {
  category: "all",
  questions: [], // [{ id, options: [ids] }]
  index: 0,
  chosen: null,  // option index picked for the current question, null = not answered yet
  score: 0,
  wrong: [],     // ids answered wrong
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

function newQuiz() {
  const pool = idsFor(state.category);
  state.questions = shuffled(pool).slice(0, QUESTIONS).map((id) => {
    const others = termsInCategory(getTerm(id).category).map((term) => term.id).filter((x) => x !== id);
    return { id, options: shuffled([id, ...shuffled(others).slice(0, 3)]) };
  });
  state.index = 0;
  state.chosen = null;
  state.score = 0;
  state.wrong = [];
}

// ---------- the answer texts ----------

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The term's names, so they can be hidden inside its explanation (otherwise the answer gives itself away)
function namesOf(term) {
  const names = [term.en, term.en.replace(/\s*\(.*\)\s*/g, " ").trim(), term.sq, ...(term.aliases ?? [])];
  return [...new Set(names.filter((n) => n && n.length >= 3))].sort((a, b) => b.length - a.length);
}

// First sentence or two of the explanation, with the term's own name replaced by "___"
function clue(id) {
  const term = getTerm(id);
  const sentences = term.explanation[getLang()].split(/(?<=[.!?])\s+/);
  let text = sentences[0];
  if (text.length < 60 && sentences[1]) text += " " + sentences[1];
  for (const name of namesOf(term)) {
    text = text.replace(new RegExp(`(?<![\\p{L}\\d])${escapeRegExp(name)}(?![\\p{L}\\d])`, "giu"), "___");
  }
  return text.length > 240 ? text.slice(0, 237).trimEnd() + "…" : text;
}

// ---------- drawing ----------

function questionHtml() {
  const lang = getLang();
  const question = state.questions[state.index];
  const term = getTerm(question.id);
  const category = getCategory(term.category);
  const answered = state.chosen !== null;
  const done = state.index + (answered ? 1 : 0);
  const percent = Math.round((done / state.questions.length) * 100);

  const options = question.options.map((id, i) => {
    let status = "";
    if (answered && id === question.id) status = " is-correct";
    else if (answered && i === state.chosen) status = " is-wrong";
    return `
      <button class="quiz-option${status}" type="button" data-choice="${i}"${answered ? " disabled" : ""}>
        <span class="quiz-letter">${LETTERS[i]}</span>
        <span class="quiz-text" lang="${lang}">${esc(clue(id))}</span>
      </button>`;
  }).join("");

  const right = answered && question.options[state.chosen] === question.id;
  const feedback = answered
    ? `<p class="quiz-feedback ${right ? "is-right" : "is-bad"}" role="status">
         ${icon(right ? "circle-check" : "circle-xmark")} ${esc(t(right ? "quizRight" : "quizWrong"))}
         <a href="${termUrl(term.id)}">${esc(t("openTerm"))}</a>
       </p>
       <div class="fc-actions is-single">
         <button class="btn btn-know quiz-next" type="button" data-action="next">${esc(t(state.index + 1 < state.questions.length ? "nextCard" : "quizSeeResult"))} ${icon("arrow-right")}</button>
       </div>`
    : `<p class="fc-hint">${esc(t("quizKeyHint"))}</p>`;

  return `
    <div class="fc-progress">
      <div class="fc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${state.questions.length}" aria-valuenow="${done}">
        <span style="width:${percent}%"></span>
      </div>
      <span class="fc-count">${esc(t("quizCount", state.index + 1, state.questions.length))}</span>
    </div>

    <div class="quiz-question" ${hueStyle(category)}>
      <span class="badge">${esc(category?.name[lang])}</span>
      <p class="quiz-ask">${esc(t("quizAsk"))}</p>
      <h2 class="quiz-term" lang="en">${esc(term.en)}</h2>
    </div>

    <div class="quiz-options">${options}</div>
    ${feedback}`;
}

function resultHtml() {
  const total = state.questions.length;
  const missed = state.wrong.length
    ? `<h3>${esc(t("quizMissed"))}</h3>
       <div class="chips quiz-missed">${state.wrong.map((id) => `<a class="chip" href="${termUrl(id)}" ${hueStyle(getCategory(getTerm(id).category))}>${esc(getTerm(id).en)}</a>`).join("")}</div>`
    : "";
  return `
    <div class="fc-done">
      <div class="fc-done-icon">${icon(state.score === total ? "trophy" : state.score >= total / 2 ? "star" : "dumbbell")}</div>
      <h2>${esc(t("quizScore", state.score, total))}</h2>
      <p>${esc(t(state.score === total ? "quizPerfect" : state.score >= total / 2 ? "quizGood" : "quizKeepGoing"))}</p>
      ${missed}
      <div class="fc-actions is-single">
        <button class="btn btn-know" type="button" data-action="restart">${icon("shuffle")} ${esc(t("quizNew"))}</button>
      </div>
    </div>`;
}

// ---------- the page ----------

export function quiz() {
  if (!state.questions.length && typeof window !== "undefined") newQuiz();

  const lang = getLang();
  const options = [
    `<option value="all">${esc(t("allCategories"))} (${allTerms().length})</option>`,
    ...allCategories().map((c) =>
      `<option value="${esc(c.id)}"${c.id === state.category ? " selected" : ""}>${esc(c.name[lang])} (${termsInCategory(c.id).length})</option>`),
  ].join("");

  return {
    title: t("quizPageTitle"),
    description: t("quizDescription", allTerms().length),
    html: `
      <nav class="crumbs" aria-label="breadcrumb"><a href="/">${esc(t("home"))}</a></nav>

      <header class="fc-head">
        <h1>${esc(t("quizTitle"))}</h1>
        <p class="lede">${esc(t("quizLede"))}</p>
      </header>

      <div class="fc-controls">
        <label class="fc-select">
          <span>${esc(t("category"))}</span>
          <select id="quiz-category">${options}</select>
        </label>
        <button class="btn btn-ghost" type="button" data-action="restart">${icon("shuffle")} ${esc(t("quizNew"))}</button>
      </div>

      <div class="fc-stage quiz-stage" aria-live="polite"></div>
    `,
    mount(root) {
      const stage = root.querySelector(".quiz-stage");
      const finished = () => state.index >= state.questions.length;
      const paint = () => (stage.innerHTML = finished() ? resultHtml() : questionHtml());

      function choose(i) {
        if (finished() || state.chosen !== null) return;
        const question = state.questions[state.index];
        if (!question.options[i]) return;
        state.chosen = i;
        if (question.options[i] === question.id) {
          state.score++;
          markKnown(question.id);
        } else {
          state.wrong.push(question.id);
          markUnknown(question.id);
        }
        paint();
        stage.querySelector(".quiz-next")?.focus({ preventScroll: true });
      }

      const actions = {
        next() {
          if (state.chosen === null) return;
          state.index++;
          state.chosen = null;
          paint();
          stage.scrollIntoView({ block: "nearest" });
        },
        restart() {
          newQuiz();
          paint();
        },
      };

      paint();

      root.querySelector("#quiz-category").addEventListener("change", (event) => {
        state.category = event.target.value;
        actions.restart();
      });

      root.addEventListener("click", (event) => {
        const option = event.target.closest("[data-choice]");
        if (option) return choose(Number(option.dataset.choice));
        const button = event.target.closest("[data-action]");
        if (button) actions[button.dataset.action]?.();
      });

      // Keyboard: 1–4 or A–D pick an answer, Enter / → goes on
      const onKey = (event) => {
        if (event.target.closest?.("input, select, textarea") || finished()) return;
        const key = event.key.toUpperCase();
        const pick = "1234".indexOf(key) >= 0 ? "1234".indexOf(key) : LETTERS.indexOf(key);
        if (state.chosen === null && pick >= 0 && !event.metaKey && !event.ctrlKey) {
          choose(pick);
        } else if (state.chosen !== null && (event.key === "ArrowRight" || (event.key === "Enter" && !event.target.closest?.("button, a")))) {
          event.preventDefault();
          actions.next();
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    },
  };
}
