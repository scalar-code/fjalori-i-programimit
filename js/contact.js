// Contact page (/contact). Messages are sent through EmailJS's REST API straight to the
// ScalarCode inbox — no backend needed. The recipient address lives in the EmailJS template,
// so it never appears in the site's code.

import { t } from "./i18n.js";
import { esc, icon } from "./views.js";
import { EMAILJS, isContactFormReady } from "./config.js";

const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";
const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

export function contact() {
  const topics = ["topicSuggest", "topicMistake", "topicQuestion", "topicOther"];

  return {
    title: t("contactPageTitle"),
    description: t("contactDescription"),
    html: `
      <nav class="crumbs" aria-label="breadcrumb"><a href="/">${esc(t("home"))}</a></nav>

      <header class="contact-head">
        <h1>${esc(t("contactTitle"))}</h1>
        <p class="lede">${esc(t("contactLede"))}</p>
      </header>

      <div class="contact-layout">
        <form class="contact-form block" novalidate>
          <label class="field">
            <span>${esc(t("formName"))}</span>
            <input name="from_name" type="text" autocomplete="name" maxlength="80" required
              placeholder="${esc(t("namePlaceholder"))}">
          </label>
          <label class="field">
            <span>${esc(t("formEmail"))}</span>
            <input name="reply_to" type="email" autocomplete="email" maxlength="120" required
              placeholder="emri@shembull.com">
          </label>
          <label class="field">
            <span>${esc(t("formTopic"))}</span>
            <select name="topic">
              ${topics.map((key) => `<option>${esc(t(key))}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span>${esc(t("formMessage"))}</span>
            <textarea name="message" rows="6" maxlength="2000" required
              placeholder="${esc(t("messagePlaceholder"))}"></textarea>
          </label>

          <!-- Spam trap: hidden from people, bots fill it in -->
          <label class="hp" aria-hidden="true">Website <input name="website" tabindex="-1" autocomplete="off"></label>

          <button class="btn btn-know contact-send" type="submit">${icon("paper-plane")} <span>${esc(t("formSend"))}</span></button>
          <p class="form-status" role="status" aria-live="polite"></p>
        </form>

        <aside class="about-card block">
          <h2>${esc(t("aboutTitle"))}</h2>
          <p>${esc(t("aboutText"))}</p>
          <p class="about-by">${icon("code")} <span>${esc(t("madeBy"))}</span> <strong>ScalarCode</strong></p>
          <a class="link-arrow" href="https://github.com/scalar-code/fjalori-i-programimit" target="_blank" rel="noopener">
            ${icon("github", "brands")} ${esc(t("aboutGithub"))}
          </a>
        </aside>
      </div>
    `,
    mount(root) {
      const form = root.querySelector(".contact-form");
      const status = form.querySelector(".form-status");
      const button = form.querySelector(".contact-send");

      const show = (message, kind) => {
        status.textContent = message;
        status.className = `form-status ${kind}`;
      };

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));

        if (data.website) return; // a bot filled in the hidden field — silently ignore
        if (!data.from_name.trim() || !looksLikeEmail(data.reply_to.trim()) || !data.message.trim()) {
          show(t("formInvalid"), "is-error");
          return;
        }
        if (!isContactFormReady()) {
          show(t("formNotReady"), "is-error");
          return;
        }

        button.disabled = true;
        button.querySelector("span").textContent = t("formSending");
        show("", "");
        try {
          const response = await fetch(EMAILJS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service_id: EMAILJS.serviceId,
              template_id: EMAILJS.templateId,
              user_id: EMAILJS.publicKey,
              template_params: {
                from_name: data.from_name.trim(),
                reply_to: data.reply_to.trim(),
                topic: data.topic,
                message: data.message.trim(),
                page: location.href,
              },
            }),
          });
          if (!response.ok) throw new Error(await response.text());
          form.reset();
          show(t("formSuccess"), "is-success");
        } catch (error) {
          console.error("Contact form:", error);
          show(t("formError"), "is-error");
        } finally {
          button.disabled = false;
          button.querySelector("span").textContent = t("formSend");
        }
      });
    },
  };
}
