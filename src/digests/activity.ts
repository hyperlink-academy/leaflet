import type { PoolClient } from "pg";

export type DigestActivity = {
  subscribers: number;
  likes: number;
  comments: number;
  mentions: number;
  post_questions: number;
  quotes: number;
};

// Use indexing timestamps so a late-arriving interaction belongs to the next
// digest, rather than falling behind an already-sent watermark.
export async function loadDigestActivity(
  db: PoolClient,
  publication: string,
  start: string,
  end: string,
  ownerDid: string,
): Promise<DigestActivity> {
  const { rows } = await db.query<DigestActivity>(
    `WITH docs AS MATERIALIZED (
       SELECT document FROM documents_in_publications WHERE publication = $1
     ), subscribers AS (
       SELECT 'identity:' || i.id::text AS person, s.created_at AS joined_at
       FROM publication_subscriptions s JOIN identities i ON i.atp_did = s.identity
       WHERE s.publication = $1
       UNION ALL
       SELECT COALESCE('identity:' || identity_id::text, 'email:' || id::text),
              COALESCE(confirmed_at, created_at)
       FROM publication_email_subscribers
       WHERE publication = $1 AND state = 'confirmed'
     ), first_subscriptions AS (
       SELECT person, min(joined_at) AS joined_at FROM subscribers GROUP BY person
     ), mentions_and_quotes AS (
       SELECT n.data FROM notifications n
       WHERE n.recipient = $4 AND n.created_at > $2 AND n.created_at <= $3
         AND n.data->>'type' IN ('mention', 'comment_mention', 'quote')
         AND (
           n.data->>'mentioned_uri' = $1
           OR n.data->>'mentioned_uri' IN (SELECT document FROM docs)
           OR n.data->>'document_uri' IN (SELECT document FROM docs)
           OR EXISTS (
             SELECT 1 FROM comments_on_documents c JOIN docs d ON d.document = c.document
             WHERE c.uri = n.data->>'comment_uri'
           )
         )
     )
     SELECT
       (SELECT count(*)::int FROM first_subscriptions WHERE joined_at > $2 AND joined_at <= $3) AS subscribers,
       (SELECT count(*)::int FROM recommends_on_documents r JOIN docs d ON d.document = r.document
        WHERE r.indexed_at > $2 AND r.indexed_at <= $3) AS likes,
       (SELECT count(*)::int FROM comments_on_documents c JOIN docs d ON d.document = c.document
        WHERE c.indexed_at > $2 AND c.indexed_at <= $3) AS comments,
       (SELECT count(*)::int FROM mentions_and_quotes WHERE data->>'type' IN ('mention', 'comment_mention')) AS mentions,
       (SELECT count(*)::int FROM document_questions q JOIN docs d ON d.document = q.subject
        WHERE q.indexed_at > $2 AND q.indexed_at <= $3) AS post_questions,
       (SELECT count(*)::int FROM mentions_and_quotes WHERE data->>'type' = 'quote') AS quotes`,
    [publication, start, end, ownerDid],
  );
  return rows[0];
}
