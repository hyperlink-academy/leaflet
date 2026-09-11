// First Load JS per route, from Turbopack's client-reference manifests
// (entryJSFiles) plus the framework runtime in build-manifest rootMainFiles.
// Run after `next build`. Sizes are the emitted chunks, raw and gzip -9.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(process.cwd(), ".next");
const routes = {
  "/": "server/app/page_client-reference-manifest.js",
  "/home":
    "server/app/(app)/(identity)/(home-pages)/(writer)/home/page_client-reference-manifest.js",
  "/notifications":
    "server/app/(app)/(identity)/(home-pages)/(writer)/notifications/page_client-reference-manifest.js",
  "/reader":
    "server/app/(app)/(identity)/(home-pages)/reader/page_client-reference-manifest.js",
  "/reader/trending":
    "server/app/(app)/(identity)/(home-pages)/reader/trending/page_client-reference-manifest.js",
  "/p/[didOrHandle]":
    "server/app/(app)/(identity)/(home-pages)/p/[didOrHandle]/page_client-reference-manifest.js",
  "/[leaflet_id]":
    "server/app/(app)/(editor)/[leaflet_id]/page_client-reference-manifest.js",
  "/lish/[did]/[publication]":
    "server/app/(app)/(published)/lish/[did]/[publication]/page_client-reference-manifest.js",
  "/lish/[did]/[publication]/[rkey]":
    "server/app/(app)/(published)/lish/[did]/[publication]/[rkey]/page_client-reference-manifest.js",
};

const kb = (n) => (n / 1024).toFixed(0).padStart(6) + " KB";
const sizes = new Map();
function size(f) {
  if (!sizes.has(f)) {
    const p = path.join(ROOT, f.replace(/^\/?_next\//, ""));
    try {
      const b = fs.readFileSync(p);
      sizes.set(f, {
        raw: b.length,
        gz: zlib.gzipSync(b, { level: 9 }).length,
      });
    } catch {
      sizes.set(f, { raw: 0, gz: 0 });
    }
  }
  return sizes.get(f);
}
const sum = (files) =>
  files.reduce(
    (a, f) => ({ raw: a.raw + size(f).raw, gz: a.gz + size(f).gz }),
    { raw: 0, gz: 0 },
  );

const bm = JSON.parse(
  fs.readFileSync(path.join(ROOT, "build-manifest.json"), "utf8"),
);
const runtime = sum(bm.rootMainFiles);
console.log(
  `framework runtime (every route): ${bm.rootMainFiles.length} files raw=${kb(runtime.raw)} gz=${kb(runtime.gz)}\n`,
);
console.log("route".padEnd(36), "files", "      raw", "     gzip", "  css gz");

const all = {};
for (const [route, rel] of Object.entries(routes)) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.log(route.padEnd(36), "manifest missing");
    continue;
  }
  const src = fs.readFileSync(file, "utf8");
  let json;
  const m = src.match(
    /globalThis\.__RSC_MANIFEST\[("[^"]+")\]\s*=\s*(\{[\s\S]*\})\s*;?\s*$/,
  );
  try {
    json = JSON.parse(m[2]);
  } catch {
    const m2 = src.match(/=\s*JSON\.parse\((".*")\)/s);
    json = JSON.parse(JSON.parse(m2[1]));
  }
  const js = new Set();
  const css = new Set();
  for (const files of Object.values(json.entryJSFiles || {}))
    files.forEach((f) => js.add(f));
  for (const files of Object.values(json.entryCSSFiles || {}))
    files.forEach((f) => css.add(typeof f === "string" ? f : f.path));
  const t = sum([...js]);
  const c = sum([...css]);
  all[route] = { js: [...js], raw: t.raw + runtime.raw, gz: t.gz + runtime.gz };
  console.log(
    route.padEnd(36),
    String(js.size).padStart(5),
    kb(t.raw + runtime.raw),
    kb(t.gz + runtime.gz),
    kb(c.gz),
  );
}

if (process.argv.includes("--chunks")) {
  for (const [route, r] of Object.entries(all)) {
    console.log(`\n${route}`);
    [...r.js]
      .map((f) => ({ f, ...size(f) }))
      .sort((a, b) => b.raw - a.raw)
      .slice(0, 10)
      .forEach((s) => console.log("  ", kb(s.raw), kb(s.gz), s.f));
  }
}
