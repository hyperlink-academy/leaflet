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
      "SELECT status, sent_at FROM notification_digests WHERE identity=$1",
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
