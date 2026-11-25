// Local preview + screenshot server for Wok & Wonder.
// Usage: node serve.ts [--port 8124]. Serves game/ at / and screenshots/ at /screenshots/.

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const portArg = process.argv.indexOf("--port");
const port = portArg === -1 ? 8124 : Number(process.argv[portArg + 1]);

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".json": "application/json",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let path = url.pathname === "/" ? "/index.html" : url.pathname;
    const base = path.startsWith("/screenshots/") ? root : join(root, "game");
    if (path.startsWith("/screenshots/")) path = path.slice("/screenshots".length);
    const file = normalize(join(base, path));
    if (!file.startsWith(base)) throw new Error("bad path");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
});

server.listen(port, () => {
  console.log(`Wok & Wonder preview at http://localhost:${port}/`);
});
