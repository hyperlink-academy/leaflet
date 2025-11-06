create table "public"."atp_poll_votes" (
    "uri" text not null,
    "record" jsonb not null,
    "voter_did" text not null,
    "poll_uri" text not null,
    "poll_cid" text not null,
    "option" text not null,
    "indexed_at" timestamp with time zone not null default now()
);

alter table "public"."atp_poll_votes" enable row level security;

CREATE UNIQUE INDEX atp_poll_votes_pkey ON public.atp_poll_votes USING btree (uri);

alter table "public"."atp_poll_votes" add constraint "atp_poll_votes_pkey" PRIMARY KEY using index "atp_poll_votes_pkey";

CREATE INDEX atp_poll_votes_poll_uri_idx ON public.atp_poll_votes USING btree (poll_uri);

CREATE INDEX atp_poll_votes_voter_did_idx ON public.atp_poll_votes USING btree (voter_did);

grant delete on table "public"."atp_poll_votes" to "anon";

grant insert on table "public"."atp_poll_votes" to "anon";

grant references on table "public"."atp_poll_votes" to "anon";

grant select on table "public"."atp_poll_votes" to "anon";

grant trigger on table "public"."atp_poll_votes" to "anon";

grant truncate on table "public"."atp_poll_votes" to "anon";

grant update on table "public"."atp_poll_votes" to "anon";

grant delete on table "public"."atp_poll_votes" to "authenticated";

grant insert on table "public"."atp_poll_votes" to "authenticated";

grant references on table "public"."atp_poll_votes" to "authenticated";

grant select on table "public"."atp_poll_votes" to "authenticated";

grant trigger on table "public"."atp_poll_votes" to "authenticated";

grant truncate on table "public"."atp_poll_votes" to "authenticated";

grant update on table "public"."atp_poll_votes" to "authenticated";

grant delete on table "public"."atp_poll_votes" to "service_role";

grant insert on table "public"."atp_poll_votes" to "service_role";

grant references on table "public"."atp_poll_votes" to "service_role";

grant select on table "public"."atp_poll_votes" to "service_role";

grant trigger on table "public"."atp_poll_votes" to "service_role";

grant truncate on table "public"."atp_poll_votes" to "service_role";

grant update on table "public"."atp_poll_votes" to "service_role";

create table "public"."atp_poll_records" (
    "uri" text not null,
    "cid" text not null,
    "record" jsonb not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."atp_poll_records" enable row level security;

alter table "public"."bsky_follows" alter column "identity" set default ''::text;

CREATE UNIQUE INDEX atp_poll_records_pkey ON public.atp_poll_records USING btree (uri);

alter table "public"."atp_poll_records" add constraint "atp_poll_records_pkey" PRIMARY KEY using index "atp_poll_records_pkey";

alter table "public"."atp_poll_votes" add constraint "atp_poll_votes_poll_uri_fkey" FOREIGN KEY (poll_uri) REFERENCES atp_poll_records(uri) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."atp_poll_votes" validate constraint "atp_poll_votes_poll_uri_fkey";

grant delete on table "public"."atp_poll_records" to "anon";

grant insert on table "public"."atp_poll_records" to "anon";

grant references on table "public"."atp_poll_records" to "anon";

grant select on table "public"."atp_poll_records" to "anon";

grant trigger on table "public"."atp_poll_records" to "anon";

grant truncate on table "public"."atp_poll_records" to "anon";

grant update on table "public"."atp_poll_records" to "anon";

grant delete on table "public"."atp_poll_records" to "authenticated";

grant insert on table "public"."atp_poll_records" to "authenticated";

grant references on table "public"."atp_poll_records" to "authenticated";

grant select on table "public"."atp_poll_records" to "authenticated";

grant trigger on table "public"."atp_poll_records" to "authenticated";

grant truncate on table "public"."atp_poll_records" to "authenticated";

grant update on table "public"."atp_poll_records" to "authenticated";

grant delete on table "public"."atp_poll_records" to "service_role";

grant insert on table "public"."atp_poll_records" to "service_role";

grant references on table "public"."atp_poll_records" to "service_role";

grant select on table "public"."atp_poll_records" to "service_role";

grant trigger on table "public"."atp_poll_records" to "service_role";

grant truncate on table "public"."atp_poll_records" to "service_role";

grant update on table "public"."atp_poll_records" to "service_role";
