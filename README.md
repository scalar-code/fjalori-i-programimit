# Fjalori i Programimit

A bilingual Albanian ↔ English glossary of programming terms for beginners.
Plain HTML, CSS and JavaScript. No build step, no backend, no login.

## File structure

```
fjalori-i-programimit/
├── index.html            ← the single page; header, footer and an empty <main>
├── favicon.svg           ← the little "ë" icon in the browser tab
├── css/
│   └── style.css         ← all styles; colours for light/dark are at the top
├── js/
│   ├── main.js           ← starts the app and picks the page from the URL (#/term/api)
│   ├── views.js          ← one function per page: home, term, category, not found
│   ├── flashcards.js     ← the flashcards page (#/flashcards)
│   ├── data.js           ← loads terms.json and offers helpers (getTerm, wordOfTheDay…)
│   ├── search.js         ← the search (works with or without ë and ç)
│   └── i18n.js           ← every interface text in Albanian and English
├── data/
│   └── terms.json        ← ALL the content: categories + terms
└── scripts/
    └── check-terms.mjs   ← checks terms.json for mistakes
```

## Run it on your computer

The site loads `terms.json` with `fetch`, and browsers block that when you just
double-click `index.html`. So you need a tiny local server. Either works:

```bash
python3 -m http.server 8000
```

```bash
npx serve .
```

Then open http://localhost:8000.

In VS Code you can also use the **Live Server** extension: right-click `index.html` → *Open with Live Server*.

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

- `id`: lowercase, no spaces; it becomes the address `#/term/compiler`
- `sq`: use `null` when Albanian uses the same word (like Git or HTML)
- `aliases`: optional, extra words people might search for
- `code`: use `null` when a code example doesn't make sense. Inside the snippet, write a new line as `\n` and a `"` as `\"`
- `related`: the `id`s of other terms

3. Check it:

```bash
node scripts/check-terms.mjs
```

It tells you about missing commas, a wrong category, or a related term that doesn't exist.

### Add a category

Add an entry to `"categories"` in the same file. `hue` is a colour from 0 to 360
(0 is red, 120 green, 210 blue, 280 purple). The badges and cards get their colours from it automatically.

## Deploy for free

### Option A: GitHub Pages
1. Create a new repository on GitHub and push this folder to it:

```bash
git init
git add .
git commit -m "Version 1"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/fjalori-i-programimit.git
git push -u origin main
```

2. On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. After a minute or so the site is live at `https://YOUR-NAME.github.io/fjalori-i-programimit/`.

### Option B: Vercel
1. Push to GitHub (same as above).
2. Go to vercel.com → **Add New → Project** → import the repository.
3. Framework preset: **Other**. Leave build command and output directory empty → **Deploy**.

After either one, every `git push` updates the live site automatically.

## Extending later

- **New page:** write a function that returns `{ title, html, mount }` (see
  `js/flashcards.js` for a full example), then add one line to `routes` in `js/main.js`.
  If `mount` returns a function, it runs when the visitor leaves the page (useful for
  removing keyboard listeners).
- **"Suggest a term" form:** with no backend, use a free form service such as
  Formspree, or a Google Form, and add a page the same way.
- **New interface text:** add the same key to both `sq` and `en` in `js/i18n.js`,
  then use `t("yourKey")`.
