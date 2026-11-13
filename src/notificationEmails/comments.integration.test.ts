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
import { sendCommentEmails } from "./comments";

let identity: string;
let reader: string;
let did: string;
let readerDid: string;
let publication: string;
let document: string;
let comment: string;
const fetchMock = vi.fn();
const set = (type: string, frequency: string) =>
  pool.query("SELECT set_notification_preference($1,$2,$3,$4)", [
    identity,
    publication,
    type,
    frequency,
  ]);
const preference = async () =>
  (
    await pool.query(
      "SELECT * FROM notification_preferences WHERE identity=$1 AND publication=$2",
      [identity, publication],
    )
  ).rows[0];

beforeEach(async () => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("POSTMARK_API_KEY", "test-key");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://127.0.0.1:3000");
  fetchMock
    .mockReset()
    .mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ ErrorCode: 0, MessageID: "provider-id" }),
        ),
    );
  identity = randomUUID();
  reader = randomUUID();
  did = `did:plc:${identity}`;
  readerDid = `did:plc:${reader}`;
  publication = `at://${did}/site.standard.publication/pub`;
  document = `at://${did}/site.standard.document/post`;
  comment = `at://${readerDid}/pub.leaflet.comment/comment`;
  await pool.query(
    "INSERT INTO identities (id, atp_did, email) VALUES ($1,$2,$3), ($4,$5,null)",
    [identity, did, `${identity}@example.com`, reader, readerDid],
  );
  await pool.query(
    "INSERT INTO user_entitlements (identity_id, entitlement_key) VALUES ($1, 'email_notification_enabled')",
    [identity],
  );
  await pool.query(
    "INSERT INTO publications (uri, name, identity_did) VALUES ($1,'Test publication',$2)",
    [publication, did],
  );
  await pool.query("INSERT INTO documents (uri, data) VALUES ($1,$2)", [
    document,
    {
      $type: "site.standard.document",
      title: "My writing",
      site: "https://example.com",
      path: "/post",
      publishedAt: "2026-11-01T00:00:00Z",
    },
  ]);
  await pool.query(
    "INSERT INTO documents_in_publications (publication, document) VALUES ($1,$2)",
    [publication, document],
  );
  await pool.query(
    "INSERT INTO comments_on_documents (uri, document, profile, record, indexed_at) VALUES ($1,$2,$3,$4,'2030-01-01Z')",
    [
      comment,
      document,
      readerDid,
      { plaintext: "Hello, author!", subject: document },
    ],
  );
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await pool.query("DELETE FROM documents WHERE uri=$1", [document]);
  await pool.query("DELETE FROM identities WHERE id IN ($1,$2)", [
    identity,
    reader,
  ]);
});
afterAll(() => pool.end());

describe("instant comment emails", () => {
  it.each(["revoked", "expired"])(
    "does not deliver queued comments when the feature flag is %s",
    async (state) => {
      await set("comments", "instant");
      if (state === "revoked")
        await pool.query(
          "DELETE FROM user_entitlements WHERE identity_id=$1 AND entitlement_key='email_notification_enabled'",
          [identity],
        );
      else
        await pool.query(
          "UPDATE user_entitlements SET expires_at=now()-interval '1 second' WHERE identity_id=$1",
          [identity],
        );
      expect(await sendCommentEmails(comment)).toEqual({ sent: 0 });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("defaults off for existing publications", async () => {
    expect(await sendCommentEmails(comment)).toEqual({ sent: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the opted-in owner the comment and a response link exactly once", async () => {
    await set("comments", "instant");
    expect(await sendCommentEmails(comment)).toEqual({ sent: 1 });
    expect(await sendCommentEmails(comment)).toEqual({ sent: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.To).toBe(`${identity}@example.com`);
    expect(body.Subject).toBe("New comment on My writing");
    expect(body.TextBody).toContain("Hello, author!");
    expect(body.TextBody).toContain(
      `http://127.0.0.1:3000/lish/${did}/pub/post?interactionDrawer=comments#commentsDrawer`,
    );
    const { rows } = await pool.query(
      "SELECT status, provider_message_id FROM notification_history WHERE identity=$1",
      [identity],
    );
    expect(rows).toEqual([
      { status: "sent", provider_message_id: "provider-id" },
    ]);
  });

  it("keeps digest and comment preferences independent", async () => {
    await set("digest", "weekly");
    await set("comments", "instant");
    expect((await preference()).enabled_types.sort()).toEqual([
      "comments",
      "digest",
    ]);
    await set("digest", "off");
    expect((await preference()).enabled_types).toEqual(["comments"]);
    await set("digest", "daily");
    await set("comments", "off");
    expect((await preference()).enabled_types).toEqual(["digest"]);
    expect((await preference()).digest_frequency).toBe("daily");
    expect((await preference()).comments_enabled_at).toBeNull();
  });

  it("preserves both settings under concurrent saves", async () => {
    await Promise.all([set("digest", "daily"), set("comments", "instant")]);
    expect((await preference()).enabled_types.sort()).toEqual([
      "comments",
      "digest",
    ]);
  });

  it("rechecks opt-in when a queued job runs", async () => {
    await set("comments", "instant");
    await set("comments", "off");
    expect(await sendCommentEmails(comment)).toEqual({ sent: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not send historical comments when opting in", async () => {
    await set("comments", "instant");
    await pool.query(
      "UPDATE comments_on_documents SET indexed_at='2020-01-01Z' WHERE uri=$1",
      [comment],
    );
    expect(await sendCommentEmails(comment)).toEqual({ sent: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips deleted comments", async () => {
    await set("comments", "instant");
    await pool.query("DELETE FROM comments_on_documents WHERE uri=$1", [
      comment,
    ]);
    expect(await sendCommentEmails(comment)).toEqual({ sent: 0 });
  });

  it("does not email the author about their own comment", async () => {
    await set("comments", "instant");
    const ownComment = `at://${did}/pub.leaflet.comment/own`;
    await pool.query(
      "INSERT INTO comments_on_documents (uri, document, record, indexed_at) VALUES ($1,$2,'{}','2030-01-01Z')",
      [ownComment, document],
    );
    expect(await sendCommentEmails(ownComment)).toEqual({ sent: 0 });
  });

  it("allows a retry after explicit provider rejection", async () => {
    await set("comments", "instant");
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ErrorCode: 422 }), { status: 422 }),
    );
    await expect(sendCommentEmails(comment)).rejects.toThrow(
      "Postmark rejected",
    );
    expect(await sendCommentEmails(comment)).toEqual({ sent: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not resend when delivery is uncertain", async () => {
    await set("comments", "instant");
    fetchMock.mockRejectedValueOnce(new Error("Lost connection"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await sendCommentEmails(comment);
      expect(await sendCommentEmails(comment)).toEqual({ sent: 0 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
    }
  });

  it("claims a comment atomically when workers run concurrently", async () => {
    await set("comments", "instant");
    await Promise.all([sendCommentEmails(comment), sendCommentEmails(comment)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("has_comment_email_recipients", () => {
  const anyRecipients = async (uri = comment) =>
    (
      await pool.query("SELECT has_comment_email_recipients($1) AS wanted", [
        uri,
      ])
    ).rows[0].wanted;

  it("is false until the publication has opted into comment emails", async () => {
    expect(await anyRecipients()).toBe(false);
    await set("comments", "instant");
    expect(await anyRecipients()).toBe(true);
    await set("comments", "off");
    expect(await anyRecipients()).toBe(false);
  });

  it("ignores a digest-only opt-in and unknown comments", async () => {
    await set("digest", "daily");
    expect(await anyRecipients()).toBe(false);
    await set("comments", "instant");
    expect(
      await anyRecipients("at://did:plc:nobody/pub.leaflet.comment/x"),
    ).toBe(false);
  });
});
