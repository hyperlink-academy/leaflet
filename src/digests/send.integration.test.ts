import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("supabase/pool", async () => {
  const { Pool } = await import("pg");
  return {
    pool: new Pool({
      connectionString:
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    }),
  };
});
import { pool } from "supabase/pool";
import { sendDigest } from "./send";
import { loadDigestActivity } from "./activity";
import {
  advanceDigestSchedules,
  findDueDigests,
  initializeDigestSchedules,
  type DigestSchedule,
} from "./schedule";

let identity: string;
let reader: string;
let did: string;
let readerDid: string;
let publication: string;
let otherPublication: string;
let document: string;
let otherDocument: string;
const fetchMock = vi.fn();
const args = () => ({
  identity,
  ownerDid: did,
  publication,
  email: "owner@example.com",
  apiKey: "test-key",
});
const body = (index = 0) => JSON.parse(fetchMock.mock.calls[index][1].body);

async function schedule(): Promise<DigestSchedule> {
  await pool.query(
    "SELECT set_notification_preference($1,$2,'digest','daily')",
    [identity, publication],
  );
  await pool.query(
    "UPDATE notification_preferences SET digest_next_at='2025-01-01Z' WHERE identity=$1 AND publication=$2",
    [identity, publication],
  );
  return { identity, publication, due: "2025-01-01T00:00:00.000Z" };
}

beforeEach(async () => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    async () =>
      new Response(JSON.stringify({ ErrorCode: 0, MessageID: randomUUID() })),
  );
  identity = randomUUID();
  reader = randomUUID();
  did = `did:plc:${identity}`;
  readerDid = `did:plc:${reader}`;
  publication = `at://${did}/site.standard.publication/one`;
  otherPublication = `at://${did}/site.standard.publication/two`;
  document = `at://${did}/site.standard.document/one`;
  otherDocument = `at://${did}/site.standard.document/two`;
  await pool.query(
    "INSERT INTO identities (id, atp_did) VALUES ($1,$2), ($3,$4)",
    [identity, did, reader, readerDid],
  );
  for (const [pub, doc] of [
    [publication, document],
    [otherPublication, otherDocument],
  ]) {
    await pool.query(
      "INSERT INTO publications (uri, name, identity_did) VALUES ($1,'My publication',$2)",
      [pub, did],
    );
    await pool.query("INSERT INTO documents (uri, data) VALUES ($1, '{}')", [
      doc,
    ]);
    await pool.query(
      "INSERT INTO documents_in_publications (publication, document) VALUES ($1,$2)",
      [pub, doc],
    );
    await pool.query(
      "INSERT INTO publication_subscriptions (uri, identity, publication, record, created_at) VALUES ($1,$2,$3,'{}','2020-01-01Z')",
      [`${pub}/sub`, readerDid, pub],
    );
    await pool.query(
      "INSERT INTO publication_email_subscribers (publication, email, identity_id, state, confirmed_at) VALUES ($1,'reader@example.com',$2,'confirmed','2020-01-01Z'), ($1,'email-only@example.com',null,'confirmed','2020-01-01Z')",
      [pub, reader],
    );
    await pool.query(
      "INSERT INTO comments_on_documents (uri, document, record, indexed_at) VALUES ($1,$2,'{}','2020-01-01Z')",
      [`${doc}/comment`, doc],
    );
    await pool.query(
      "INSERT INTO recommends_on_documents (uri, document, recommender_did, record, indexed_at) VALUES ($1,$2,$3,'{}','2020-01-01Z')",
      [`${doc}/like`, doc, readerDid],
    );
    await pool.query(
      "INSERT INTO document_questions (uri, subject, asker_did, cid, record, indexed_at) VALUES ($1,$2,$3,'cid','{}','2020-01-01Z')",
      [`${doc}/question`, doc, readerDid],
    );
    for (const data of [
      { type: "quote", document_uri: doc },
      {
        type: "mention",
        document_uri: "external-document",
        mentioned_uri: pub,
      },
      { type: "comment_mention", comment_uri: `${doc}/comment` },
    ]) {
      await pool.query(
        "INSERT INTO notifications (id, recipient, data, created_at) VALUES ($1,$2,$3,'2020-01-01Z')",
        [randomUUID(), did, data],
      );
    }
  }
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await pool.query("DELETE FROM documents WHERE uri IN ($1,$2)", [
    document,
    otherDocument,
  ]);
  await pool.query("DELETE FROM identities WHERE id IN ($1,$2)", [
    identity,
    reader,
  ]);
});
afterAll(() => pool.end());

describe("test digest delivery", () => {
  it("sends all six counts, deduplicates subscribers, and scopes activity to one publication", async () => {
    expect(await sendDigest(args())).toEqual({ ok: true, value: null });
    expect(body().To).toBe("owner@example.com");
    expect(body().Subject).toBe("Quick digest on My publication");
    expect(body().TextBody).toContain("Subscribers: +2 since starting");
    expect(body().TextBody).toContain("Likes: +1 since starting");
    expect(body().TextBody).toContain("Comments: +1 since starting");
    expect(body().TextBody).toContain("Mentions: +2 since starting");
    expect(body().TextBody).toContain("Post questions: +1 since starting");
    expect(body().TextBody).toContain("Quotes: +1 since starting");
    const { rows } = await pool.query(
      "SELECT status, sent_at FROM notification_history WHERE identity=$1",
      [identity],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("sent");
    expect(rows[0].sent_at).toBeTruthy();
  });

  it("uses the previous successful digest and permits zero-activity manual tests", async () => {
    await sendDigest(args());
    expect(await sendDigest(args())).toEqual({ ok: true, value: null });
    expect(body(1).TextBody).toContain(
      "Subscribers: +0 since your last digest",
    );
    expect(body(1).TextBody).toContain("Comments: +0 since your last digest");
  });

  it("does not advance the successful cutoff on provider rejection", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ErrorCode: 422 }), { status: 422 }),
    );
    expect(await sendDigest(args())).toEqual({
      ok: false,
      error: "email_send_failed",
    });
    expect(await sendDigest(args())).toEqual({ ok: true, value: null });
    expect(body(1).TextBody).toContain("Subscribers: +2 since starting");
  });

  it("keeps ambiguous deliveries pending and blocks a duplicate send", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Connection lost"));
    expect(await sendDigest(args())).toEqual({
      ok: false,
      error: "delivery_uncertain",
    });
    expect(await sendDigest(args())).toEqual({
      ok: false,
      error: "delivery_pending",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prevents concurrent sends", async () => {
    let finish!: (value: Response) => void;
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    fetchMock.mockImplementationOnce(() => {
      started();
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    });
    const first = sendDigest(args());
    await ready;
    const second = await sendDigest(args());
    finish(new Response(JSON.stringify({ ErrorCode: 0 })));
    expect(second).toEqual({ ok: false, error: "delivery_pending" });
    expect((await first).ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("checks publication ownership before any email is sent", async () => {
    expect(await sendDigest({ ...args(), ownerDid: readerDid })).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses an exclusive lower bound and inclusive upper bound", async () => {
    const db = await pool.connect();
    try {
      const activity = await loadDigestActivity(
        db,
        publication,
        "2020-01-01T00:00:00Z",
        "2021-01-01T00:00:00Z",
        did,
      );
      expect(Object.values(activity)).toEqual([0, 0, 0, 0, 0, 0]);
    } finally {
      db.release();
    }
  });
});

describe("scheduled digest delivery", () => {
  it("ignores comment delivery state and other channels when finding the digest cutoff", async () => {
    const current = await schedule();
    await pool.query(
      "INSERT INTO notification_history (identity, publication, channel, notification_type, delivery_key) VALUES ($1,$2,'email','comments','comment:pending')",
      [identity, publication],
    );
    await pool.query(
      "INSERT INTO notification_history (identity, publication, channel, notification_type, delivery_key, period_start, period_end, status, sent_at) VALUES ($1,$2,'push','digest','push:future','2020-01-01Z','2099-01-01Z','sent',now())",
      [identity, publication],
    );
    expect(await sendDigest({ ...args(), schedule: current })).toEqual({
      ok: true,
      value: null,
    });
    expect(body().TextBody).toContain("Subscribers: +2 since starting");
  });

  it("keeps test history and automatic history separate", async () => {
    const current = await schedule();
    await sendDigest(args());
    await sendDigest({ ...args(), schedule: current });
    expect(body(1).Tag).toBe("publication-digest");
    expect(body(1).TextBody).toContain("Subscribers: +2 since starting");
    expect(body(1).TextBody).not.toContain("test digest");
    const { rows } = await pool.query(
      "SELECT mode FROM notification_history WHERE identity=$1 ORDER BY mode",
      [identity],
    );
    expect(rows).toEqual([{ mode: "live" }, { mode: "test" }]);
  });

  it("skips an empty period and records a checkpoint without sending", async () => {
    const current = await schedule();
    await sendDigest({ ...args(), schedule: current });
    await sendDigest({
      ...args(),
      schedule: { ...current, due: "2025-01-02T00:00:00.000Z" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { rows } = await pool.query(
      "SELECT status FROM notification_history WHERE identity=$1 ORDER BY period_end",
      [identity],
    );
    expect(rows).toEqual([{ status: "sent" }, { status: "skipped" }]);
  });

  it("does not send the same automatic period twice", async () => {
    const current = await schedule();
    await sendDigest({ ...args(), schedule: current });
    await sendDigest({ ...args(), schedule: current });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send a queued digest after the writer turns it off", async () => {
    const current = await schedule();
    await pool.query(
      "SELECT set_notification_preference($1,$2,'digest','off')",
      [identity, publication],
    );
    await sendDigest({ ...args(), schedule: current });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restarts the schedule when the frequency changes, and keeps it when only comments change", async () => {
    await schedule();
    await pool.query(
      "SELECT set_notification_preference($1,$2,'comments','instant')",
      [identity, publication],
    );
    await pool.query(
      "SELECT set_notification_preference($1,$2,'digest','daily')",
      [identity, publication],
    );
    const nextAt = async () =>
      (
        await pool.query(
          "SELECT digest_next_at FROM notification_preferences WHERE identity=$1 AND publication=$2",
          [identity, publication],
        )
      ).rows[0].digest_next_at;
    expect(await nextAt()).not.toBeNull();
    await pool.query(
      "SELECT set_notification_preference($1,$2,'digest','weekly')",
      [identity, publication],
    );
    expect(await nextAt()).toBeNull();
  });

  it("starts a new opt-in at its next boundary and leaves a running schedule alone", async () => {
    await pool.query(
      "SELECT set_notification_preference($1,$2,'digest','daily')",
      [identity, publication],
    );
    await initializeDigestSchedules();
    const { rows } = await pool.query(
      "SELECT digest_next_at FROM notification_preferences WHERE identity=$1 AND publication=$2",
      [identity, publication],
    );
    expect(rows[0].digest_next_at.toISOString()).toMatch(/T00:00:00.000Z$/);
    expect(rows[0].digest_next_at.getTime()).toBeGreaterThan(Date.now());
    await initializeDigestSchedules();
    const { rows: again } = await pool.query(
      "SELECT digest_next_at FROM notification_preferences WHERE identity=$1 AND publication=$2",
      [identity, publication],
    );
    expect(again[0].digest_next_at).toEqual(rows[0].digest_next_at);
  });

  it("finds a due digest only while the writer is opted in", async () => {
    const current = await schedule();
    const due = (await findDueDigests(10_000)).filter(
      (d) => d.identity === identity,
    );
    expect(due).toEqual([{ ...current, frequency: "daily" }]);
    await pool.query(
      "SELECT set_notification_preference($1,$2,'digest','off')",
      [identity, publication],
    );
    expect(
      (await findDueDigests(10_000)).filter((d) => d.identity === identity),
    ).toEqual([]);
  });

  it("advances to the next boundary after now, once, even when run twice", async () => {
    await schedule();
    const [due] = (await findDueDigests(10_000)).filter(
      (d) => d.identity === identity,
    );
    await Promise.all([
      advanceDigestSchedules([due]),
      advanceDigestSchedules([due]),
    ]);
    const { rows } = await pool.query(
      "SELECT digest_next_at FROM notification_preferences WHERE identity=$1 AND publication=$2",
      [identity, publication],
    );
    expect(rows[0].digest_next_at.toISOString()).toMatch(/T00:00:00.000Z$/);
    expect(rows[0].digest_next_at.getTime()).toBeGreaterThan(Date.now());
  });

  it("does not overwrite a schedule that was reset after the due digests were found", async () => {
    await schedule();
    const [due] = (await findDueDigests(10_000)).filter(
      (d) => d.identity === identity,
    );
    await pool.query(
      "SELECT set_notification_preference($1,$2,'digest','weekly')",
      [identity, publication],
    );
    await advanceDigestSchedules([due]);
    const { rows } = await pool.query(
      "SELECT digest_next_at FROM notification_preferences WHERE identity=$1 AND publication=$2",
      [identity, publication],
    );
    expect(rows[0].digest_next_at).toBeNull();
  });

  it("can retry the same automatic period after explicit provider rejection", async () => {
    const current = await schedule();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ErrorCode: 422 }), { status: 422 }),
    );
    expect(await sendDigest({ ...args(), schedule: current })).toEqual({
      ok: false,
      error: "email_send_failed",
    });
    expect(await sendDigest({ ...args(), schedule: current })).toEqual({
      ok: true,
      value: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const { rows } = await pool.query(
      "SELECT status FROM notification_history WHERE identity=$1",
      [identity],
    );
    expect(rows).toEqual([{ status: "sent" }]);
  });

  it("does not send before the due time", async () => {
    const current = await schedule();
    await sendDigest({
      ...args(),
      schedule: { ...current, due: "2099-01-01T00:00:00.000Z" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
