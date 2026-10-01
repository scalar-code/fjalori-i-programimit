# Fjalori i Programimit

A bilingual Albanian ↔ English glossary of programming terms for beginners.
Plain HTML, CSS and JavaScript, plus one small build script (Node.js, no packages to install).
No backend, no login.

Live: https://fjalor-programimi.vercel.app

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
│   ├── data.js           ← holds terms.json and offers helpers (getTerm, wordOfTheDay…)
│   ├── search.js         ← the search (works with or without ë and ç)
│   └── i18n.js           ← every interface text (and page title) in Albanian and English
├── data/
│   └── terms.json        ← ALL the content: categories + terms
├── scripts/
│   ├── build.mjs         ← builds dist/ (pages, sitemap.xml, robots.txt)
│   ├── serve.mjs         ← local preview server that behaves like Vercel
│   ├── check-terms.mjs   ← checks terms.json for mistakes
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
