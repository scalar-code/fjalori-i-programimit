# Fjalori i Programimit

A bilingual Albanian ↔ English glossary of programming terms for beginners.
Plain HTML, CSS and JavaScript, plus one small build script (Node.js, no packages to install).
No backend, no login.

Live: https://fjalori.dev

## How it works

`npm run build` reads `data/terms.json` and writes a finished website into `dist/`:
a real HTML page for every term (`/term/api`), every category (`/category/web`),
the home page and the flashcards, each with its own title, description and share tags.
It also writes `sitemap.xml` and `robots.txt`.

In the browser, `js/main.js` then takes over: clicks between pages are instant,
and search, flashcards and the language/theme buttons work as before.
Old links like `/#/term/api` are redirected to `/term/api`.

## File structure

```
fjalori-i-programimit/
├── template.html         ← the page skeleton; the build fills in title, tags and content
├── favicon.svg           ← the little "ë" icon in the browser tab
├── og-image.png          ← the picture shown when a link is shared (WhatsApp, Instagram…)
├── vercel.json           ← tells Vercel how to build and serve the site
├── package.json          ← the npm commands below
├── css/
│   └── style.css         ← all styles; colours for light/dark are at the top
├── js/
│   ├── main.js           ← starts the app and picks the page from the URL (/term/api)
│   ├── views.js          ← one function per page: home, term, category, not found
│   ├── flashcards.js     ← the flashcards page (/flashcards)
│   ├── contact.js        ← the contact page (/contact)
│   ├── config.js         ← EmailJS settings for the contact form
│   ├── data.js           ← holds terms.json and offers helpers (getTerm, wordOfTheDay…)
│   ├── search.js         ← the search (works with or without ë and ç)
│   └── i18n.js           ← every interface text (and page title) in Albanian and English
├── data/
│   └── terms.json        ← ALL the content: categories + terms
├── audio/                ← one recording per term + manifest.json
├── scripts/
│   ├── build.mjs         ← builds dist/ (pages, sitemap.xml, robots.txt)
│   ├── serve.mjs         ← local preview server that behaves like Vercel
│   ├── check-terms.mjs   ← checks terms.json for mistakes
│   ├── generate-audio.py ← makes the "Dëgjo" recordings (see Audio below)
│   └── og-image.html     ← the design of og-image.png (see the comment inside to regenerate)
└── dist/                 ← the built site (created by the build, not saved in git)
```

## Run it on your computer

You need Node.js (any recent version). Then, in the project folder:

```bash
npm start
```

This checks the terms, builds the site and opens a preview at http://localhost:8000.
After changing anything, stop it with Ctrl+C and run `npm start` again.

Other commands: `npm run check` (only check terms.json), `npm run build` (only build).

## Add a new term

1. Open `data/terms.json` and copy an existing term block.
2. Change the fields:

```json
{
  "id": "compiler",
  "en": "Compiler",
  "sq": "Përpilues",
  "aliases": ["kompajler"],
  "category": "general",
  "explanation": { "sq": "…", "en": "…" },
  "analogy":     { "sq": "…", "en": "…" },
  "code": { "language": "python", "snippet": "print(\"Hello\")" },
  "related": ["bug", "debug"]
}
```

- `id`: lowercase, no spaces; it becomes the address `/term/compiler`. Don't change an `id` once the site is live, or old links (and Google) will point to a missing page
- `sq`: use `null` when Albanian uses the same word (like Git or HTML)
- `aliases`: optional, extra words people might search for
- `code`: use `null` when a code example doesn't make sense. Inside the snippet, write a new line as `\n` and a `"` as `\"`
- `related`: the `id`s of other terms

3. Check it:

```bash
npm run check
```

It tells you about missing commas, a wrong category, or a related term that doesn't exist.

### Add a category

Add an entry to `"categories"` in the same file. `hue` is a colour from 0 to 360
(0 is red, 120 green, 210 blue, 280 purple). The badges and cards get their colours from it automatically.

## Audio ("Dëgjo" button)

Every term page has a 🔊 **Dëgjo** button that plays the Albanian explanation, read by the
free **Edon** voice from [folsh.ai](https://folsh.ai) by Edon Sekiraqa (CC0, public domain).
The recordings are ready-made files in `audio/` (one `.m4a` per term, ~57 KB each), so they
play instantly. `npm run build` warns if a term has no recording yet.

**After adding or editing terms**, make their audio (only new/changed ones are generated):

1. One-time setup (the voice is ~64 MB, so it lives outside the project):
   ```bash
   python3 -m venv ~/.fjalori-tts
   ~/.fjalori-tts/bin/pip install piper-tts
   ```
   Then download `sq_AL-edon-medium.onnx` and `sq_AL-edon-medium.onnx.json` from
   https://huggingface.co/edonseki/folsh.ai/tree/main/edon into `~/.fjalori-tts/`.
2. Generate:
   ```bash
   ~/.fjalori-tts/bin/python scripts/generate-audio.py --model ~/.fjalori-tts/sq_AL-edon-medium.onnx
   ```
3. Commit the `audio/` folder together with `data/terms.json`.

## Contact form

`/contact` sends messages with [EmailJS](https://www.emailjs.com) (free: 200 emails/month),
straight from the browser — no backend. The recipient address is set in the EmailJS
template, so it never appears in the site's code.

Setup: create an EmailJS account, add an **Outlook** email service, create a template
that uses `{{from_name}}`, `{{reply_to}}`, `{{topic}}`, `{{message}}` and `{{page}}`, then put
the Public Key, Service ID and Template ID in `js/config.js`. Until those are filled in,
the form shows "being set up" instead of sending.

## Deploy

The site is on Vercel and connected to GitHub: every `git push` to `main` builds and
publishes it automatically (Vercel runs `npm run build` and serves `dist/`, see `vercel.json`).

Pushing any other branch gives you a private *preview* address to test first:

```bash
git checkout -b my-change
git push -u origin my-change
```

Vercel then shows the preview link on the GitHub branch/pull request and in your Vercel dashboard.

### Visitor statistics
Vercel Web Analytics is built into every page (see `template.html`). It counts page
views without cookies or personal data. See the numbers in the Vercel dashboard →
the project → **Analytics**.

### Tell Google about the site
1. Go to https://search.google.com/search-console and add the site address.
2. Under **Sitemaps**, submit `sitemap.xml`.

## Extending later

- **New page:** write a function that returns `{ title, description, html, mount }` (see
  `js/flashcards.js` for a full example), add one line to `routes` in `js/main.js`,
  and one `writePage(...)` line in `scripts/build.mjs` so it gets a real HTML file.
  If `mount` returns a function, it runs when the visitor leaves the page (useful for
  removing keyboard listeners).
- **"Suggest a term" form:** with no backend, use a free form service such as
  Formspree, or a Google Form, and add a page the same way.
- **New interface text:** add the same key to both `sq` and `en` in `js/i18n.js`,
  then use `t("yourKey")`.
