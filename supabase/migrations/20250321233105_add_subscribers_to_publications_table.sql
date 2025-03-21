create table "public"."subscribers_to_publications" (
    "identity" text not null,
    "publication" text not null,
    "created_at" timestamp with time zone not null default now()
);
alter table "public"."subscribers_to_publications" enable row level security;
CREATE UNIQUE INDEX subscribers_to_publications_pkey ON public.subscribers_to_publications USING btree (identity, publication);
alter table "public"."subscribers_to_publications" add constraint "subscribers_to_publications_pkey" PRIMARY KEY using index "subscribers_to_publications_pkey";
alter table "public"."subscribers_to_publications" add constraint "subscribers_to_publications_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(email) ON UPDATE CASCADE not valid;
alter table "public"."subscribers_to_publications" validate constraint "subscribers_to_publications_identity_fkey";
alter table "public"."subscribers_to_publications" add constraint "subscribers_to_publications_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) not valid;
alter table "public"."subscribers_to_publications" validate constraint "subscribers_to_publications_publication_fkey";
grant delete on table "public"."subscribers_to_publications" to "anon";
grant insert on table "public"."subscribers_to_publications" to "anon";
grant references on table "public"."subscribers_to_publications" to "anon";
grant select on table "public"."subscribers_to_publications" to "anon";
grant trigger on table "public"."subscribers_to_publications" to "anon";
grant truncate on table "public"."subscribers_to_publications" to "anon";
grant update on table "public"."subscribers_to_publications" to "anon";
grant delete on table "public"."subscribers_to_publications" to "authenticated";
grant insert on table "public"."subscribers_to_publications" to "authenticated";
grant references on table "public"."subscribers_to_publications" to "authenticated";
grant select on table "public"."subscribers_to_publications" to "authenticated";
grant trigger on table "public"."subscribers_to_publications" to "authenticated";
grant truncate on table "public"."subscribers_to_publications" to "authenticated";
grant update on table "public"."subscribers_to_publications" to "authenticated";
grant delete on table "public"."subscribers_to_publications" to "service_role";
grant insert on table "public"."subscribers_to_publications" to "service_role";
grant references on table "public"."subscribers_to_publications" to "service_role";
grant select on table "public"."subscribers_to_publications" to "service_role";
grant trigger on table "public"."subscribers_to_publications" to "service_role";
grant truncate on table "public"."subscribers_to_publications" to "service_role";
grant update on table "public"."subscribers_to_publications" to "service_role";
