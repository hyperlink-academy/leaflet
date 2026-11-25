import { Pool } from "pg";
import { fetchProfiles, listAccounts, loadAccounts } from "src/review/load";
import {
  applyAutoBlock,
  decideFrom,
  reviewAccount,
  saveLinks,
  saveReview,
  saveSubject,
} from "src/review/run";
import { AUTO_BLOCK, POLICY_VERSION, REVIEW_MODE } from "src/review/policy";
import {
  describeAccount,
  LLM_MODEL,
  LLM_SYSTEM_PROMPT,
} from "src/review/signals/contentLlm";
import type { AccountBundle, Queryable } from "src/review/types";

/**
 * Runs the review system over every account with Leaflet-made documents and
 * records what its policy would decide. Reads documents from one database and
 * writes review_subjects / review_events / document_links to another, so a
 * production snapshot can be judged into a local database.
 *
 *   npm run review-backfill -- --sink=LOCAL_DB_URL [--source=DB_URL] [--llm]
 *       [--limit=N] [--dids=did:plc:a,did:plc:b] [--no-profiles]
 *   npm run review-backfill -- --sink=LOCAL_DB_URL --replay
 *
 * --source / --sink name environment variables holding connection strings.
 * The source is only ever read, inside read-only transactions. Without --llm
 * the costly content.llm signal is not called: accounts that need it stay
 * unjudged under the content-check rule and the run prints what calling it
 * would cost.
 *
 * --replay reads nothing from the source and calls no signal: it re-decides
 * every account in the sink from the signal values already logged there, so
 * a change to the rules or the reasons can be seen without paying for the
 * signals again.
 *
 * While AUTO_BLOCK is on in src/review/policy.ts, either mode blocks the
 * accounts whose rule allows it, in the sink.
 */

const arg = (name: string) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
const flag = (name: string) => process.argv.includes(`--${name}`);

const sourceVar = arg("source") ?? "DB_URL";
const sinkVar = arg("sink");
if (!sinkVar) {
  console.error("--sink=<ENV_VAR> is required (e.g. --sink=LOCAL_DB_URL).");
  process.exit(1);
}
for (let v of flag("replay") ? [sinkVar] : [sourceVar, sinkVar])
  if (!process.env[v]) {
    console.error(`${v} is not set.`);
    process.exit(1);
  }
const LLM = flag("llm");
const BATCH = 50;
const TEXT_DOCS_KEPT = 5;
const CONCURRENCY = 6;

// Dollars per million tokens (input, output), standard API rates.
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};
const CHARS_PER_TOKEN = 3.5;
const OUTPUT_TOKENS_PER_REVIEW = 600;

const sourcePool = new Pool({
  connectionString: process.env[sourceVar],
  max: 4,
});
const sink = new Pool({ connectionString: process.env[sinkVar], max: 4 });
const source: Queryable = {
  async query(text, params) {
    let client = await sourcePool.connect();
    try {
      await client.query("begin read only");
      return await client.query(text, params as any[]);
    } finally {
      await client.query("rollback").catch(() => {});
      client.release();
    }
  },
};

// A script can't clear the app's page cache, so pages of accounts blocked
// here go on serving until they expire.
function blockSummary(wouldBlock: number, blocked: number) {
  return AUTO_BLOCK
    ? `\nAuto-block is ON: ${blocked} accounts newly blocked (${wouldBlock} matched an auto-block rule). Their cached pages expire within the hour.`
    : `\nAuto-block is off: ${wouldBlock} accounts matched an auto-block rule and would be blocked with AUTO_BLOCK on in src/review/policy.ts.`;
}

function pct(n: number, d: number) {
  return d === 0 ? "-" : `${((100 * n) / d).toFixed(1)}%`;
}

// Re-decides every account from its newest logged value of each signal.
// Names with a colon are one-off comparison runs, not signals of the policy.
async function replay() {
  let run = `replay-${new Date().toISOString()}`;
  let { rows } = await sink.query(
    `select s.id, s.proposed_status as before,
       (select jsonb_object_agg(l.name, jsonb_build_object('value', l.value, 'evidence', l.evidence))
        from (select distinct on (name) name, value, evidence from review_events
              where kind = 'account' and subject_id = s.id and type = 'signal'
                and name not like '%:%'
              order by name, at desc) l) as signals
     from review_subjects s where s.kind = 'account' order by s.id`,
  );
  console.log(
    `[${run}] mode=${REVIEW_MODE} policy=v${POLICY_VERSION} accounts=${rows.length} sink=${sinkVar}`,
  );
  let moved = new Map<string, number>();
  let reasons = new Map<string, number>();
  let wouldBlock = 0;
  let blocked = 0;
  for (let row of rows) {
    let decision = decideFrom(row.signals ?? {});
    await sink.query(
      `insert into review_events (run, mode, kind, subject_id, type, name, version, value, evidence)
       values ($1, $2, 'account', $3, 'decision', $4, $5, $6::jsonb, $7::jsonb)`,
      [
        run,
        REVIEW_MODE,
        row.id,
        decision.rule,
        POLICY_VERSION,
        JSON.stringify(decision.status),
        JSON.stringify({ reasons: decision.reasons }),
      ],
    );
    await sink.query(
      `update review_subjects set proposed_status = $2, proposed_by = $3,
         policy_version = $4, reasons = $5::jsonb, evaluated_at = now()
       where kind = 'account' and id = $1`,
      [
        row.id,
        decision.status,
        decision.rule,
        POLICY_VERSION,
        JSON.stringify(decision.reasons),
      ],
    );
    if (decision.block) wouldBlock++;
    if (await applyAutoBlock(sink, row.id, decision, run)) blocked++;
    let key = `${row.before} -> ${decision.status} (${decision.rule})`;
    moved.set(key, (moved.get(key) ?? 0) + 1);
    if (decision.status !== "cleared")
      for (let r of decision.reasons)
        reasons.set(r.code, (reasons.get(r.code) ?? 0) + 1);
  }
  console.log("\nbefore -> after (rule)");
  for (let [k, n] of [...moved.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(5)}  ${k}`);
  console.log(blockSummary(wouldBlock, blocked));
  console.log("\nreasons on accounts that are not cleared");
  for (let [k, n] of [...reasons.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(5)}  ${k}`);
}

async function main() {
  if (flag("replay")) return replay();
  let run = `backfill-${new Date().toISOString()}`;
  let now = new Date();
  let today = now.toISOString().slice(0, 10);
  let dids = arg("dids")?.split(",") ?? (await listAccounts(source));
  let limit = Number(arg("limit") ?? 0);
  if (limit > 0) dids = dids.slice(0, limit);
  console.log(
    `[${run}] mode=${REVIEW_MODE} policy=v${POLICY_VERSION} accounts=${dids.length} llm=${LLM ? "on" : "off"} source=${sourceVar} sink=${sinkVar}`,
  );

  // Pass 1: load everything and write links and labels, so the signals that
  // compare accounts see the whole population in pass 2.
  let accounts: AccountBundle[] = [];
  for (let i = 0; i < dids.length; i += BATCH) {
    let batch = dids.slice(i, i + BATCH);
    let [loaded, profiles] = await Promise.all([
      loadAccounts(source, batch),
      flag("no-profiles") ? new Map() : fetchProfiles(batch),
    ]);
    for (let account of loaded) {
      if (account.documents.length === 0) continue;
      account.profile = profiles.get(account.did) ?? null;
      await saveLinks(sink, account);
      await saveSubject(sink, account);
      // Only the newest documents are ever read as prose.
      let newest = new Set(
        [...account.documents]
          .sort((a, b) =>
            (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
          )
          .slice(0, TEXT_DOCS_KEPT),
      );
      for (let doc of account.documents) if (!newest.has(doc)) doc.text = "";
      accounts.push(account);
    }
    process.stdout.write(
      `\rloaded ${Math.min(i + BATCH, dids.length)}/${dids.length}`,
    );
  }
  console.log();

  // Pass 2: judge.
  let byRule = new Map<
    string,
    { accounts: number; documents: number; publications: number }
  >();
  let labelled = new Map<string, number>();
  let llmAccounts = 0;
  let llmInputChars = 0;
  let wouldBlock = 0;
  let blocked = 0;
  let actualInput = 0;
  let actualOutput = 0;
  let failed = 0;
  let done = 0;
  async function judge(account: AccountBundle) {
    let review;
    try {
      review = await reviewAccount(account, { db: sink, now }, { costly: LLM });
    } catch (e) {
      // One account the costly signal couldn't read must not end the run; it
      // keeps whatever proposal it had.
      failed++;
      console.error(`\n[review] ${account.did} failed:`, e);
      return;
    }
    let saved = await saveReview(sink, account, review, run);
    if (review.decision.block) wouldBlock++;
    if (saved.blocked) blocked++;

    let key = `${review.decision.status} <- ${review.decision.rule}`;
    let row = byRule.get(key) ?? { accounts: 0, documents: 0, publications: 0 };
    row.accounts++;
    row.documents += account.documents.length;
    row.publications += account.publications.length;
    byRule.set(key, row);

    if (account.humanLabel) {
      let k = `${account.humanLabel} -> ${review.decision.status} (${review.decision.rule})`;
      labelled.set(k, (labelled.get(k) ?? 0) + 1);
    }
    let llm = review.signals["content.llm"]?.evidence as
      | { inputTokens?: number; outputTokens?: number }
      | undefined;
    if (llm) {
      llmAccounts++;
      actualInput += llm.inputTokens ?? 0;
      actualOutput += llm.outputTokens ?? 0;
    } else if (review.decision.rule === "content-check") {
      llmAccounts++;
      llmInputChars +=
        LLM_SYSTEM_PROMPT.length +
        describeAccount(account, review.signals, today).length;
    }
    if (++done % 25 === 0)
      process.stdout.write(`\rreviewed ${done}/${accounts.length}`);
  }
  let queue = [...accounts];
  await Promise.all(
    Array.from({ length: LLM ? CONCURRENCY : 1 }, async () => {
      for (let account; (account = queue.shift()); ) await judge(account);
    }),
  );
  console.log(`\rreviewed ${done}/${accounts.length}\n`);
  if (failed)
    console.log(`${failed} accounts failed and were left as they were.\n`);

  let totals = { accounts: accounts.length, documents: 0, publications: 0 };
  for (let a of accounts) {
    totals.documents += a.documents.length;
    totals.publications += a.publications.length;
  }
  console.log(
    `Accounts ${totals.accounts}, documents ${totals.documents}, publications ${totals.publications}\n`,
  );
  console.log(
    "proposed status <- rule".padEnd(38),
    "accounts".padStart(9),
    "share".padStart(7),
    "docs".padStart(7),
    "pubs".padStart(6),
  );
  for (let [key, r] of [...byRule.entries()].sort(
    (a, b) => b[1].accounts - a[1].accounts,
  ))
    console.log(
      key.padEnd(38),
      String(r.accounts).padStart(9),
      pct(r.accounts, totals.accounts).padStart(7),
      String(r.documents).padStart(7),
      String(r.publications).padStart(6),
    );

  console.log(blockSummary(wouldBlock, blocked));
  console.log("\nAgainst admin decisions (label -> proposal):");
  if (labelled.size === 0) console.log("  no labelled accounts in this run");
  for (let [k, n] of [...labelled.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(4)}  ${k}`);

  if (LLM) {
    let [inPrice, outPrice] = PRICES[LLM_MODEL];
    let cost = (actualInput * inPrice + actualOutput * outPrice) / 1e6;
    console.log(
      `\ncontent.llm ran for ${llmAccounts} accounts: ${actualInput} input tokens, ${actualOutput} output tokens, $${cost.toFixed(2)} at ${LLM_MODEL} list prices (a fallback model bills at its own rate).`,
    );
    return;
  }
  let inputTokens = llmInputChars / CHARS_PER_TOKEN;
  let outputTokens = llmAccounts * OUTPUT_TOKENS_PER_REVIEW;
  console.log(
    `\ncontent.llm would run for ${llmAccounts} accounts (${pct(llmAccounts, totals.accounts)}): ~${Math.round(inputTokens / 1000)}k input tokens (${Math.round(inputTokens / Math.max(llmAccounts, 1))} per account, estimated at ${CHARS_PER_TOKEN} chars/token), ~${Math.round(outputTokens / 1000)}k output tokens (assuming ${OUTPUT_TOKENS_PER_REVIEW} per review).`,
  );
  for (let [model, [inPrice, outPrice]] of Object.entries(PRICES)) {
    let cost = (inputTokens * inPrice + outputTokens * outPrice) / 1e6;
    console.log(
      `  ${model.padEnd(20)} $${cost.toFixed(2).padStart(7)}   batch API $${(cost / 2).toFixed(2)}${model === LLM_MODEL ? "   <- configured" : ""}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([sourcePool.end(), sink.end()]));
