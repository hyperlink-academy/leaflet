alter table "public"."permission_token_on_homepage" add column "created_at" timestamp with time zone not null default now();
