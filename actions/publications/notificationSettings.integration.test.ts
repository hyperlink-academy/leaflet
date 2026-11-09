import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import { randomUUID } from "node:crypto";

// Deliberately local: never load application credentials or production URLs.
const db = new Client({
  connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
});
await db.connect();
afterAll(() => db.end());
let identity: string;
let publication: string;
beforeEach(async () => {
  await db.query("BEGIN");
  identity = randomUUID();
  publication = `at://did:plc:test/site.standard.publication/${randomUUID()}`;
  const did = `did:plc:${identity}`;
  await db.query("INSERT INTO identities (id, atp_did) VALUES ($1, $2)", [
    identity,
    did,
  ]);
  await db.query(
    "INSERT INTO publications (uri, name, identity_did) VALUES ($1, 'Notification test', $2)",
    [publication, did],
  );
});
afterEach(() => db.query("ROLLBACK"));

describe("notification tables", () => {
  it("creates preferences disabled by default", async () => {
    const { rows } = await db.query(
      "INSERT INTO notification_preferences (identity, publication) VALUES ($1, $2) RETURNING *",
      [identity, publication],
    );
    expect(rows[0].enabled_types).toEqual([]);
    expect(rows[0].digest_frequency).toBeNull();
  });

  it("requires a frequency for an enabled digest", async () => {
    await expect(
      db.query(
        "INSERT INTO notification_preferences (identity, publication, enabled_types) VALUES ($1, $2, ARRAY['digest'])",
        [identity, publication],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects duplicate digest claims for the same period", async () => {
    const sql =
      "INSERT INTO notification_history (identity, publication, channel, notification_type, delivery_key, period_start, period_end) VALUES ($1, $2, 'email', 'digest', 'digest:test:period', '2026-11-01Z', '2026-11-02Z')";
    await db.query(sql, [identity, publication]);
    await expect(db.query(sql, [identity, publication])).rejects.toMatchObject({
      code: "23505",
    });
  });

  it.each(["anon", "authenticated"])(
    "denies direct access for %s",
    async (role) => {
      await db.query(`SET LOCAL ROLE ${role}`);
      await expect(
        db.query("SELECT * FROM notification_preferences"),
      ).rejects.toMatchObject({ code: "42501" });
    },
  );

  it("has RLS enabled on both tables", async () => {
    const { rows } = await db.query(
      "SELECT relrowsecurity FROM pg_class WHERE oid IN ('notification_preferences'::regclass, 'notification_history'::regclass)",
    );
    expect(rows).toEqual([{ relrowsecurity: true }, { relrowsecurity: true }]);
  });

  it("keeps delivery keys independent across channels", async () => {
    const sql =
      "INSERT INTO notification_history (identity, publication, channel, notification_type, delivery_key) VALUES ($1,$2,$3,'comments','same-delivery')";
    await db.query(sql, [identity, publication, "email"]);
    await db.query(sql, [identity, publication, "push"]);
    await expect(
      db.query(sql, [identity, publication, "email"]),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it.each(["anon", "authenticated"])(
    "denies history access for %s",
    async (role) => {
      await db.query(`SET LOCAL ROLE ${role}`);
      await expect(
        db.query("SELECT * FROM notification_history"),
      ).rejects.toMatchObject({ code: "42501" });
    },
  );
});
