create table "public"."leaflets_in_publications" (
    "publication" text not null,
    "doc" text default ''::text,
    "leaflet" uuid not null
);
alter table "public"."leaflets_in_publications" enable row level security;
CREATE UNIQUE INDEX leaflets_in_publications_pkey ON public.leaflets_in_publications USING btree (publication, leaflet);
alter table "public"."leaflets_in_publications" add constraint "leaflets_in_publications_pkey" PRIMARY KEY using index "leaflets_in_publications_pkey";
alter table "public"."leaflets_in_publications" add constraint "leaflets_in_publications_doc_fkey" FOREIGN KEY (doc) REFERENCES documents(uri) not valid;
alter table "public"."leaflets_in_publications" validate constraint "leaflets_in_publications_doc_fkey";
alter table "public"."leaflets_in_publications" add constraint "leaflets_in_publications_leaflet_fkey" FOREIGN KEY (leaflet) REFERENCES permission_tokens(id) not valid;
alter table "public"."leaflets_in_publications" validate constraint "leaflets_in_publications_leaflet_fkey";
alter table "public"."leaflets_in_publications" add constraint "leaflets_in_publications_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) not valid;
alter table "public"."leaflets_in_publications" validate constraint "leaflets_in_publications_publication_fkey";
grant delete on table "public"."leaflets_in_publications" to "anon";
grant insert on table "public"."leaflets_in_publications" to "anon";
grant references on table "public"."leaflets_in_publications" to "anon";
grant select on table "public"."leaflets_in_publications" to "anon";
grant trigger on table "public"."leaflets_in_publications" to "anon";
grant truncate on table "public"."leaflets_in_publications" to "anon";
grant update on table "public"."leaflets_in_publications" to "anon";
grant delete on table "public"."leaflets_in_publications" to "authenticated";
grant insert on table "public"."leaflets_in_publications" to "authenticated";
grant references on table "public"."leaflets_in_publications" to "authenticated";
grant select on table "public"."leaflets_in_publications" to "authenticated";
grant trigger on table "public"."leaflets_in_publications" to "authenticated";
grant truncate on table "public"."leaflets_in_publications" to "authenticated";
grant update on table "public"."leaflets_in_publications" to "authenticated";
grant delete on table "public"."leaflets_in_publications" to "service_role";
grant insert on table "public"."leaflets_in_publications" to "service_role";
grant references on table "public"."leaflets_in_publications" to "service_role";
grant select on table "public"."leaflets_in_publications" to "service_role";
grant trigger on table "public"."leaflets_in_publications" to "service_role";
grant truncate on table "public"."leaflets_in_publications" to "service_role";
grant update on table "public"."leaflets_in_publications" to "service_role";
