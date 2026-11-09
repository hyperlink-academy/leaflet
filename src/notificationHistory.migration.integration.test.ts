import { afterAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { digestDeliveryKey, commentDeliveryKey } from "./notificationHistory";

const db = new Client({
  connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
});
await db.connect();
afterAll(() => db.end());

describe("notification history migration", () => {
  it("preserves both histories and their keys without touching existing application data", async () => {
    const schema = `notification_history_test_${randomUUID().replaceAll("-", "")}`;
    const identity = randomUUID();
    await db.query("BEGIN");
    try {
      await db.query(`CREATE SCHEMA ${schema}`);
      await db.query(`SET LOCAL search_path TO ${schema}, public`);
      await db.query(`
        CREATE TABLE identities (id uuid PRIMARY KEY);
        CREATE TABLE publications (uri text PRIMARY KEY);
        CREATE TABLE notification_digests (identity uuid, publication text, mode text, period_start timestamptz, period_end timestamptz, status text, sent_at timestamptz);
        CREATE TABLE notification_email_deliveries (identity uuid, publication text, notification_type text, subject_uri text, status text, created_at timestamptz, sent_at timestamptz, provider_message_id text);
      `);
      await db.query("INSERT INTO identities VALUES ($1)", [identity]);
      await db.query("INSERT INTO publications VALUES ('pub')");
      for (const mode of ["test", "scheduled"]) {
        for (const [index, status] of [
          "sent",
          "failed",
          "pending",
          "skipped",
        ].entries()) {
          await db.query(
            "INSERT INTO notification_digests VALUES ($1,'pub',$2,'2026-01-01Z',$3,$4,$5)",
            [
              identity,
              mode,
              `2026-01-0${index + 2}T00:00:00Z`,
              status,
              status === "sent" ? "2026-01-02T00:01:00Z" : null,
            ],
          );
        }
      }
      for (const status of ["sending", "sent", "failed", "uncertain"]) {
        await db.query(
          "INSERT INTO notification_email_deliveries VALUES ($1,'pub','comments',$2,$3,'2026-01-01Z',$4,$5)",
          [
            identity,
            `at://comment/${status}`,
            status,
            status === "sent" ? "2026-01-01T00:01:00Z" : null,
            status === "sent" ? "provider-id" : null,
          ],
        );
      }
      // Sub-millisecond timestamps must remain distinct during backfill.
      await db.query(
        "INSERT INTO notification_digests VALUES ($1,'pub','test','2026-01-01Z','2026-01-02T00:00:00.123456Z','failed',null),($1,'pub','test','2026-01-01Z','2026-01-02T00:00:00.123457Z','failed',null)",
        [identity],
      );
      const sql = readFileSync(
        "supabase/migrations/20261109020000_notification_history.sql",
        "utf8",
      )
        .replace(/^BEGIN;\s*/, "")
        .replace(/COMMIT;\s*$/, "")
        .replaceAll("public.", `${schema}.`);
      await db.query(sql);

      const { rows } = await db.query("SELECT * FROM notification_history");
      expect(rows).toHaveLength(14);
      expect(rows.every((row) => row.channel === "email")).toBe(true);
      expect(
        rows.filter(
          (row) => row.notification_type === "digest" && row.mode === "live",
        ),
      ).toHaveLength(4);
      const comment = rows.find(
        (row) => row.subject_uri === "at://comment/sending",
      );
      expect(comment.status).toBe("pending");
      expect(comment.delivery_key).toBe(
        commentDeliveryKey("at://comment/sending"),
      );
      const sent = rows.find((row) => row.subject_uri === "at://comment/sent");
      expect(sent.provider_message_id).toBe("provider-id");
      expect(sent.sent_at.toISOString()).toBe("2026-01-01T00:01:00.000Z");
      const digest = rows.find(
        (row) =>
          row.notification_type === "digest" &&
          row.mode === "live" &&
          row.status === "sent",
      );
      expect(digest.delivery_key).toBe(
        digestDeliveryKey(
          "live",
          "2026-01-01T00:00:00.000Z",
          "2026-01-02T00:00:00.000Z",
        ),
      );
      expect(rows.some((row) => row.delivery_key.includes(".123456Z"))).toBe(
        true,
      );
      expect(rows.some((row) => row.delivery_key.includes(".123457Z"))).toBe(
        true,
      );
      const { rows: old } = await db.query(
        "SELECT to_regclass($1) AS digests, to_regclass($2) AS deliveries",
        [
          `${schema}.notification_digests`,
          `${schema}.notification_email_deliveries`,
        ],
      );
      expect(old).toEqual([{ digests: null, deliveries: null }]);
    } finally {
      await db.query("ROLLBACK");
    }
  });
});
