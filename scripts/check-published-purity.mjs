// Guards the app/(app)/(published) route group's cacheability invariant:
// nothing in it may read request state (cookies/headers/identity) except the
// explicitly identity-gated surfaces, which in turn must declare
// `dynamic = "force-dynamic"` so a future revalidate/generateStaticParams on a
// shared segment can't accidentally try to prerender them.
//
// This is a tripwire over the route tree, not a full transitive-import
// analysis — helpers under src/ or actions/ that read cookies still show up
// here at their route-file import sites in practice, because the route file
// names them. There are no known exceptions: members-only posts render their
// gated variant for every viewer and entitled readers unlock the tail through
// the getUnlockedPost action (a POST, not a render).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PUBLISHED = join(ROOT, "app/(app)/(published)");
const PUB_DIR = "lish/[did]/[publication]";

// Route files allowed to read request state. Directories cover their subtree.
const IDENTITY_GATED = [
  `${PUB_DIR}/dashboard`,
  `${PUB_DIR}/edit`,
  `${PUB_DIR}/theme-settings`,
  `${PUB_DIR}/join`,
  `${PUB_DIR}/contributor_accept`,
  "lish/createPub",
  "lish/sorry-boris",
];
// Entry files of those surfaces, which must declare force-dynamic themselves.
const MUST_FORCE_DYNAMIC = [
  `${PUB_DIR}/dashboard/layout.tsx`,
  `${PUB_DIR}/edit/page.tsx`,
  `${PUB_DIR}/theme-settings/page.tsx`,
  `${PUB_DIR}/join/page.tsx`,
  `${PUB_DIR}/contributor_accept/page.tsx`,
  "lish/createPub/page.tsx",
  "lish/sorry-boris/page.tsx",
];

const DYNAMIC_READS =
  /\bcookies\(|\bheaders\(|\bdraftMode\(|\bgetIdentityData\b/;
const CACHING_CONFIG =
  /export (const (revalidate|dynamicParams)\b|(async )?function generateStaticParams\b|const generateStaticParams\b)/;

let failures = [];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(entry)) yield p;
  }
}

for (const file of walk(PUBLISHED)) {
  const rel = relative(PUBLISHED, file);
  const gated = IDENTITY_GATED.some(
    (d) => rel === d || rel.startsWith(d + "/"),
  );
  const src = readFileSync(file, "utf8");

  // Server-action modules run on POST, not during page render — identity
  // reads there don't affect cacheability.
  if (/^\s*["']use server["']/.test(src)) continue;

  if (!gated && DYNAMIC_READS.test(src)) {
    for (const [i, line] of src.split("\n").entries()) {
      if (DYNAMIC_READS.test(line) && !line.trim().startsWith("//"))
        failures.push(
          `${rel}:${i + 1} reads request state in the (published) group: ${line.trim()}`,
        );
    }
  }

  // useSearchParams in a client component strips everything up to the nearest
  // Suspense boundary from statically-rendered HTML (and 500s without one).
  // Published-tree components read the query string via
  // src/hooks/useClientSearchParams instead, which keeps SSR param-free.
  if (!gated && /\buseSearchParams\b/.test(src)) {
    for (const [i, line] of src.split("\n").entries()) {
      if (/\buseSearchParams\b/.test(line) && !line.trim().startsWith("//"))
        failures.push(
          `${rel}:${i + 1} uses useSearchParams in the (published) group (use useClientSearchParams): ${line.trim()}`,
        );
    }
  }

  if (gated && CACHING_CONFIG.test(src))
    failures.push(
      `${rel} declares caching config on an identity-gated surface`,
    );
}

for (const rel of MUST_FORCE_DYNAMIC) {
  const src = readFileSync(join(PUBLISHED, rel), "utf8");
  if (!/export const dynamic = "force-dynamic"/.test(src))
    failures.push(`${rel} must declare dynamic = "force-dynamic"`);
}

// The shared publication layout wraps identity-gated children; caching config
// there would propagate to them.
const sharedLayout = readFileSync(
  join(PUBLISHED, `${PUB_DIR}/layout.tsx`),
  "utf8",
);
if (CACHING_CONFIG.test(sharedLayout) || /export const dynamic\b/.test(sharedLayout))
  failures.push(
    `${PUB_DIR}/layout.tsx must not declare caching config (it propagates to identity-gated children); put revalidate/generateStaticParams on individual public pages`,
  );

if (failures.length) {
  console.error("published-purity check failed:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("published-purity check passed");
