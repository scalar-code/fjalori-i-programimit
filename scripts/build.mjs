// Builds the finished website into the dist/ folder.
// Run with:  npm run build   (Vercel runs this automatically on every push)
//
// For every page (home, flashcards, each category, each term) it writes a real HTML file,
// with the content already inside, plus its own <title>, description and share tags.
// That way Google and WhatsApp see the full page without running any JavaScript.
// It reuses the same page functions the browser uses (js/views.js), so both always match.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { setData, allTerms, allCategories } from "../js/data.js";
import * as views from "../js/views.js";
import { flashcards } from "../js/flashcards.js";
import { contact } from "../js/contact.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "dist");

// The public address of the site, used in the sitemap, canonical links and share tags.
// If you buy your own domain later, change it here.
const SITE_URL = (process.env.SITE_URL || "https://fjalori.dev").replace(/\/$/, "");

const SITE_NAME = "Fjalori i Programimit";
const OG_IMAGE = { path: "/og-image.png", width: 1200, height: 630, alt: "Fjalori i Programimit – termat e programimit të shpjeguar thjesht në shqip" };

const esc = views.esc;
const template = readFileSync(join(ROOT, "template.html"), "utf8");
// audio/manifest.json lists the terms that have a "Dëgjo" recording (made by scripts/generate-audio.py)
const audioManifestFile = join(ROOT, "audio/manifest.json");
const audioManifest = existsSync(audioManifestFile) ? JSON.parse(readFileSync(audioManifestFile, "utf8")) : {};
setData(JSON.parse(readFileSync(join(ROOT, "data/terms.json"), "utf8")), audioManifest);

// ---------- start from an empty dist/ and copy the static files ----------

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const folder of ["css", "js", "data", "audio"]) {
  if (existsSync(join(ROOT, folder))) cpSync(join(ROOT, folder), join(OUT, folder), { recursive: true });
}
for (const file of ["favicon.svg", "og-image.png"]) cpSync(join(ROOT, file), join(OUT, file));
// Google Search Console verification file(s), e.g. googlecc116d85b47bda09.html — keep them forever
for (const file of readdirSync(ROOT).filter((f) => /^google[0-9a-f]+\.html$/.test(f))) cpSync(join(ROOT, file), join(OUT, file));

// ---------- pages ----------

const sitemap = [];

function writePage(path, view, { type = "website", jsonLd = null, noindex = false } = {}) {
  const url = SITE_URL + path;
  const image = SITE_URL + OG_IMAGE.path;

  const meta = [
    `<meta name="description" content="${esc(view.description)}">`,
    `<meta name="author" content="ScalarCode">`,
    noindex ? `<meta name="robots" content="noindex">` : `<link rel="canonical" href="${url}">`,
    // Open Graph: what WhatsApp, Instagram, Facebook, Telegram… show when the link is shared
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:locale" content="sq_AL">`,
    `<meta property="og:title" content="${esc(view.title)}">`,
    `<meta property="og:description" content="${esc(view.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}">`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}">`,
    `<meta property="og:image:alt" content="${esc(OG_IMAGE.alt)}">`,
    // Same idea for X/Twitter
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(view.title)}">`,
    `<meta name="twitter:description" content="${esc(view.description)}">`,
    `<meta name="twitter:image" content="${image}">`,
    jsonLd && `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`,
  ].filter(Boolean).join("\n  ");

  // Functions as replacements, so a "$" inside the content can't confuse .replace()
  const html = template
    .replace("{{title}}", () => esc(view.title))
    .replace("{{meta}}", () => meta)
    .replace("{{main}}", () => view.html);

  // /term/api → dist/term/api.html  (vercel.json "rewrites" serve it at /term/api)
  const file = join(OUT, path === "/" ? "index.html" : `${path.slice(1)}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  if (!noindex) sitemap.push(url);
}

writePage("/", views.home(), {
  // Tells Google the site's name and who made it
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: ["sq", "en"],
    publisher: { "@type": "Organization", name: "ScalarCode", url: "https://github.com/scalar-code" },
  },
});
writePage("/contact", contact());
writePage("/flashcards", flashcards());

for (const category of allCategories()) {
  writePage(`/category/${category.id}`, views.category(category.id));
}

for (const term of allTerms()) {
  writePage(`/term/${term.id}`, views.term(term.id), {
    type: "article",
    // Tells Google "this page defines a term" (structured data)
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: term.en,
      ...(term.sq && { alternateName: term.sq }),
      description: term.explanation.sq,
      inLanguage: "sq",
      url: `${SITE_URL}/term/${term.id}`,
      inDefinedTermSet: { "@type": "DefinedTermSet", name: SITE_NAME, url: `${SITE_URL}/` },
    },
  });
}

// Vercel shows dist/404.html for any address that doesn't exist
writePage("/404", views.notFound(), { noindex: true });

// ---------- sitemap.xml + robots.txt ----------

writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((url) => `  <url><loc>${esc(url)}</loc></url>`).join("\n")}
</urlset>
`);

writeFileSync(join(OUT, "robots.txt"), `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`);

console.log(`✓ Built ${sitemap.length} pages + 404 into dist/ for ${SITE_URL} (${Object.keys(audioManifest).length} with audio)`);
const withoutAudio = allTerms().filter((term) => !audioManifest[term.id]).map((term) => term.id);
if (withoutAudio.length) {
  console.log(`  ⚠ ${withoutAudio.length} term(s) have no "Dëgjo" audio yet: ${withoutAudio.join(", ")}`);
  console.log("    Run scripts/generate-audio.py (see README → Audio) and commit the audio/ folder.");
}
