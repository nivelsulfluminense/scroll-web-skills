#!/usr/bin/env node
// Minimal static server for previews and QA. Answers Range requests (video seeking needs them),
// binds to 127.0.0.1 unless --lan is passed, and refuses paths outside the root.
//   node scripts/serve.mjs <root> [--port 4600] [--lan]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const root = path.resolve(args.find((a) => !a.startsWith("--")) ?? ".");
const port = Number(args[args.indexOf("--port") + 1]) || 4600;
const host = args.includes("--lan") ? "0.0.0.0" : "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webp": "image/webp", ".avif": "image/avif", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm", ".woff2": "font/woff2", ".map": "application/json",
};

const server = http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400).end(); return; }
  let file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) { res.writeHead(404).end("not found"); return; }
  const size = fs.statSync(file).size;
  const headers = { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream", "Accept-Ranges": "bytes", "Cache-Control": "no-cache" };
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : size - Number(range[2]);
    const end = range[1] && range[2] ? Number(range[2]) : size - 1;
    if (start > end || end >= size) { res.writeHead(416, { "Content-Range": `bytes */${size}` }).end(); return; }
    res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, "Content-Length": size });
  if (req.method === "HEAD") { res.end(); return; }
  fs.createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
  console.log(`serving ${root} at http://${host === "0.0.0.0" ? "<this-machine-ip>" : host}:${port}`);
  if (host === "0.0.0.0") console.log("warning: --lan exposes every file under the root to your network. Stop the server when done.");
});
