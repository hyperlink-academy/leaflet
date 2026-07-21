## Ranked Feed Query

### Query

```sql
SELECT d.*
FROM (
  SELECT uri
  FROM documents
  WHERE indexed = true
    AND sort_date > now() - interval '7 days'
  ORDER BY
    (bsky_like_count + recommend_count * 5)::numeric
    / power(extract(epoch from (now() - sort_date)) / 3600 + 2, 1.5) DESC
  LIMIT 50
) top
JOIN documents d ON d.uri = top.uri
ORDER BY
  (d.bsky_like_count + d.recommend_count * 5)::numeric
  / power(extract(epoch from (now() - d.sort_date)) / 3600 + 2, 1.5) DESC;
```

### Why the subquery

The inner query computes the ranking score and picks the top 50 URIs. The outer query fetches full rows only for those 50. Without this, Postgres fetches the full row (including the heavy `data` jsonb) for every document in the time window just to sort them.

### Index

```sql
CREATE INDEX idx_documents_ranking
ON documents (sort_date DESC)
INCLUDE (uri, bsky_like_count, recommend_count)
WHERE indexed = true;
```

The inner subquery only needs `uri`, `bsky_like_count`, `recommend_count`, and `sort_date`. All of these are in the covering index, so Postgres can do an index-only scan — no heap fetches for the scan/sort phase. The 50 final rows are the only ones that hit the heap.

### Tuning

- **Time window**: `7 days` bounds the scan. Tighten to reduce rows scanned. At `gravity=1.5`, a 3-day-old post needs ~225x the engagement of a fresh post to rank equally.
- **Gravity** (the `1.5` exponent): higher = faster decay. HN uses 1.8. Lower values favor established posts longer.
- **Recommend weight** (the `* 5` multiplier): controls how much a recommend is worth relative to a like.
- **Cache this query** at the application layer (e.g. Redis with 5min TTL) since the result is identical for all users.
