-- Create the link_posts table for storing batched link posts
CREATE TABLE IF NOT EXISTS "public"."link_posts" (
    "uri" text NOT NULL PRIMARY KEY,
    "author_did" text NOT NULL,
    "title" text,
    "description" text,
    "link_count" integer NOT NULL DEFAULT 1,
    "record" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "indexed_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "link_posts_author_did_fkey" FOREIGN KEY ("author_did")
        REFERENCES "public"."identities"("atp_did") ON DELETE CASCADE
);

-- Create the link_items table for individual links within batches
-- This enables efficient querying of individual links across all posts
CREATE TABLE IF NOT EXISTS "public"."link_items" (
    "id" serial PRIMARY KEY,
    "post_uri" text NOT NULL REFERENCES "public"."link_posts"("uri") ON DELETE CASCADE,
    "author_did" text NOT NULL,
    "url" text NOT NULL,
    "title" text,
    "description" text,
    "site_name" text,
    "created_at" timestamp with time zone NOT NULL,
    "link_index" integer NOT NULL DEFAULT 0
);

-- Indexes for link_posts
CREATE INDEX IF NOT EXISTS idx_link_posts_author_did
    ON "public"."link_posts" ("author_did");

CREATE INDEX IF NOT EXISTS idx_link_posts_created_at
    ON "public"."link_posts" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS idx_link_posts_tags
    ON "public"."link_posts" USING gin ((record->'tags'));

-- Indexes for link_items
CREATE INDEX IF NOT EXISTS idx_link_items_author_did
    ON "public"."link_items" ("author_did");

CREATE INDEX IF NOT EXISTS idx_link_items_url
    ON "public"."link_items" ("url");

CREATE INDEX IF NOT EXISTS idx_link_items_created_at
    ON "public"."link_items" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS idx_link_items_post_uri
    ON "public"."link_items" ("post_uri");

-- Function to get link posts from users you follow
CREATE OR REPLACE FUNCTION get_followed_link_posts(
    viewer_did text,
    page_limit integer DEFAULT 50,
    cursor_timestamp timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
    uri text,
    author_did text,
    title text,
    description text,
    link_count integer,
    record jsonb,
    created_at timestamp with time zone,
    indexed_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lp.uri,
        lp.author_did,
        lp.title,
        lp.description,
        lp.link_count,
        lp.record,
        lp.created_at,
        lp.indexed_at
    FROM "public"."link_posts" lp
    INNER JOIN "public"."bsky_follows" bf ON bf.follows = lp.author_did
    WHERE bf.identity = viewer_did
        AND (cursor_timestamp IS NULL OR lp.created_at < cursor_timestamp)
    ORDER BY lp.created_at DESC
    LIMIT page_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get random individual links (stumbleupon style)
CREATE OR REPLACE FUNCTION get_random_links(
    page_limit integer DEFAULT 10,
    tag_filter text DEFAULT NULL
)
RETURNS TABLE (
    id integer,
    post_uri text,
    author_did text,
    url text,
    title text,
    description text,
    site_name text,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        li.id,
        li.post_uri,
        li.author_did,
        li.url,
        li.title,
        li.description,
        li.site_name,
        li.created_at
    FROM "public"."link_items" li
    INNER JOIN "public"."link_posts" lp ON lp.uri = li.post_uri
    WHERE
        CASE
            WHEN tag_filter IS NULL THEN true
            ELSE lp.record->'tags' ? tag_filter
        END
    ORDER BY RANDOM()
    LIMIT page_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to search and aggregate tags from link posts
CREATE OR REPLACE FUNCTION search_link_tags(search_query text)
RETURNS TABLE (name text, post_count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LOWER(tag::text) as name,
        COUNT(DISTINCT lp.uri) as post_count
    FROM
        "public"."link_posts" lp,
        jsonb_array_elements_text(lp.record->'tags') as tag
    WHERE
        CASE
            WHEN search_query = '' THEN true
            ELSE LOWER(tag::text) LIKE '%' || LOWER(search_query) || '%'
        END
    GROUP BY
        LOWER(tag::text)
    ORDER BY
        COUNT(DISTINCT lp.uri) DESC,
        LOWER(tag::text) ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get link posts by tag
CREATE OR REPLACE FUNCTION get_link_posts_by_tag(
    tag_name text,
    page_limit integer DEFAULT 50,
    cursor_timestamp timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
    uri text,
    author_did text,
    title text,
    description text,
    link_count integer,
    record jsonb,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lp.uri,
        lp.author_did,
        lp.title,
        lp.description,
        lp.link_count,
        lp.record,
        lp.created_at
    FROM "public"."link_posts" lp
    WHERE lp.record->'tags' ? tag_name
        AND (cursor_timestamp IS NULL OR lp.created_at < cursor_timestamp)
    ORDER BY lp.created_at DESC
    LIMIT page_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS
ALTER TABLE "public"."link_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."link_items" ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON "public"."link_posts"
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON "public"."link_items"
    FOR SELECT USING (true);
