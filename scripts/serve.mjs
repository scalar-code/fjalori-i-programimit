// A tiny local web server for testing the built site (the dist/ folder) before deploying.
// Run with:  npm start   (builds first, then serves at http://localhost:8000)
//
// It follows the same rules as Vercel, so what works here works there:
//   /term/api  → dist/term/api.html
//   /          → dist/index.html
//   unknown    → dist/404.html with status 404

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const PORT = Number(process.env.PORT) || 8000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

async function findFile(path) {
  for (const candidate of [path, `${path.replace(/[\\/]$/, "")}.html`, join(path, "index.html")]) {
    if (!candidate.startsWith(DIST)) continue; // never serve files outside dist/
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");

  // Vercel Analytics only exists on Vercel; locally, answer with an empty script
  if (pathname.startsWith("/_vercel/")) {
    response.writeHead(200, { "Content-Type": TYPES[".js"] });
    response.end("");
    return;
  }

  const file = await findFile(join(DIST, normalize(decodeURIComponent(pathname)).replace(/^[\\/]+/, "")));

  if (!file) {
    response.writeHead(404, { "Content-Type": TYPES[".html"] });
    response.end(await readFile(join(DIST, "404.html")));
  } else {
    response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    response.end(await readFile(file));
  }
  console.log(`${file ? 200 : 404}  ${pathname}`);
}).listen(PORT, () => {
  console.log(`Preview: http://localhost:${PORT}   (Ctrl+C to stop)`);
});

