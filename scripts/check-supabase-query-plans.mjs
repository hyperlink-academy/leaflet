// Flags supabase-js queries whose PostgREST-generated SQL is structurally
// prone to full-table scans: selecting from a table ordered by one of its own
// columns with a LIMIT while an `!inner` embed filters the rows. PostgREST
// compiles the embed into a LATERAL join referencing the outer table, which
// pins the join direction — the only way to satisfy the order + limit is to
// walk the order column's index across the ENTIRE table, probing the embed
// per row until enough rows match. When the filter is selective (a small
// publication, a user with few follows) the limit never short-circuits and
// every request scans the whole table. No index or ANALYZE can fix this —
// the query shape must change:
//
//   1. Filter on the from-table's own indexed columns, or
//   2. start the query from the join/membership table and embed the rest, or
//   3. for newest-N-across-a-join, use a SQL function whose plan is fenced
//      with a MATERIALIZED CTE over the join table plus SET enable_seqscan =
//      off (copy get_publication_feed_docs, get_tag_page_document_uris, or
//      get_reader_feed; hand-add the signature to supabase/database.types.ts).
//
// Dev-sized tables hide the trap — verify a suspect shape with EXPLAIN
// ANALYZE against a few hundred thousand skewed synthetic rows, testing the
// worst key (a tiny or inactive publication, a key with zero matches), not
// the average one.
//
// A finding is suppressed by a comment containing `plan-checked:` within the
// ten lines above the `.from(` call. The reason must be a data-distribution
// argument ("global feed — the filters exclude a tiny minority of recent
// rows, so the limit short-circuits"), not "seems fast". `plan-checked:
// KNOWN DEBT — ...` marks pre-existing offenders awaiting a fenced rewrite;
// don't add new debt.
import ts from "typescript";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "drizzle",
  "lexicons",
]);

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) yield* sourceFiles(path);
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith(".d.ts")) {
      yield path;
    }
  }
}

// Walks a call chain like x.from("t").select("...").order(...) from its
// outermost call down to its root, returning [{name, args}] in source order
// plus the root expression node.
function unrollChain(call) {
  const links = [];
  let node = call;
  while (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  ) {
    links.unshift({ name: node.expression.name.text, args: node.arguments });
    node = node.expression.expression;
  }
  return { links, root: node };
}

const scopedOpt = /\b(referencedTable|foreignTable)\s*:/;

// Extracts plan-relevant facts from one chain's links.
function chainFacts(links, sourceFile) {
  const facts = {
    fromLine: null,
    innerEmbed: false,
    topOrder: false,
    topLimit: false,
  };
  for (const { name, args } of links) {
    const argText = (i) => args[i]?.getText(sourceFile) ?? "";
    if (name === "from" && args.length) {
      facts.fromLine =
        sourceFile.getLineAndCharacterOfPosition(args[0].getStart(sourceFile))
          .line + 1;
    } else if (name === "select") {
      if (argText(0).includes("!inner")) facts.innerEmbed = true;
    } else if (name === "order") {
      // Ordering the top level by an embedded column ("documents(sort_date)")
      // or ordering rows inside an embed ({ referencedTable }) are different
      // shapes; only a plain top-level order feeds the trap.
      if (!argText(0).includes("(") && !scopedOpt.test(argText(1)))
        facts.topOrder = true;
    } else if (name === "limit") {
      if (!scopedOpt.test(argText(1))) facts.topLimit = true;
    }
  }
  return facts;
}

function mergeFacts(target, source) {
  target.innerEmbed ||= source.innerEmbed;
  target.topOrder ||= source.topOrder;
  target.topLimit ||= source.topLimit;
  target.fromLine ??= source.fromLine;
}

function checkFile(path) {
  const text = readFileSync(path, "utf8");
  if (!text.includes(".from(")) return [];
  const sourceFile = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const lines = text.split("\n");

  // Origin entries for every query the file builds, keyed by the variable
  // they live in (or a unique symbol for chains consumed inline). A variable
  // assigned in several branches keeps one origin per branch, and chains
  // applied to the variable later (`query = query.order(...)`) merge their
  // facts into every branch's origin.
  const queries = new Map();
  const allOrigins = new Set();
  let anon = 0;

  function handleChain(call, assignedTo) {
    const { links, root } = unrollChain(call);
    if (!links.length) return;
    const facts = chainFacts(links, sourceFile);
    const rootName = ts.isIdentifier(root) ? root.text : null;
    const rootOrigins = rootName ? queries.get(rootName) : null;

    let origins;
    if (facts.fromLine !== null) {
      origins = [facts];
      allOrigins.add(facts);
      if (assignedTo && queries.has(assignedTo)) {
        // Another conditional branch assigning the same variable.
        queries.get(assignedTo).push(facts);
        return;
      }
    } else if (rootOrigins) {
      for (const origin of rootOrigins) mergeFacts(origin, facts);
      origins = rootOrigins;
    } else {
      return;
    }
    queries.set(assignedTo ?? rootName ?? `#${anon++}`, origins);
  }

  function visit(node) {
    // Only process maximal chains: a call whose result is immediately
    // .method()'d again is handled when the outer call is visited.
    if (
      ts.isCallExpression(node) &&
      !(
        ts.isPropertyAccessExpression(node.parent) &&
        ts.isCallExpression(node.parent.parent) &&
        node.parent.parent.expression === node.parent
      )
    ) {
      let assignedTo = null;
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        assignedTo = parent.name.text;
      } else if (
        ts.isBinaryExpression(parent) &&
        parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(parent.left)
      ) {
        assignedTo = parent.left.text;
      }
      handleChain(node, assignedTo);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  const findings = [];
  for (const origin of allOrigins) {
    if (!(origin.innerEmbed && origin.topOrder && origin.topLimit)) continue;
    const start = Math.max(0, origin.fromLine - 11);
    const context = lines.slice(start, origin.fromLine).join("\n");
    if (context.includes("plan-checked:")) continue;
    findings.push(origin.fromLine);
  }
  return findings.sort((a, b) => a - b);
}

let failed = false;
for (const path of sourceFiles(ROOT)) {
  for (const line of checkFile(path)) {
    failed = true;
    console.error(
      `${relative(ROOT, path)}:${line} — .from() query combines an !inner embed ` +
        `with a top-level .order() + .limit(); PostgREST's LATERAL join makes ` +
        `this walk the order column's index across the whole table when the ` +
        `embed filter is selective. Start the query from the join table, use a ` +
        `fenced SQL function (see get_publication_feed_docs), or add a ` +
        `\`// plan-checked: <why this shape is safe>\` comment above .from().`,
    );
  }
}
if (failed) process.exit(1);
console.log("supabase query plan check passed");
