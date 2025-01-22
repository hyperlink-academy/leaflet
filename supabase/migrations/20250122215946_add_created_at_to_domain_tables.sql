alter table "public"."custom_domain_routes" add column "created_at" timestamp with time zone not null default now();

alter table "public"."custom_domains" add column "created_at" timestamp with time zone not null default now();
