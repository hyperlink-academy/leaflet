alter table "public"."document_mentions_in_bsky" add column "indexed_at" timestamp with time zone not null default now();
