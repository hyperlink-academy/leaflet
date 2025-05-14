alter table "public"."leaflets_in_publications" add column "description" text not null default ''::text;
alter table "public"."leaflets_in_publications" add column "title" text not null default ''::text;
