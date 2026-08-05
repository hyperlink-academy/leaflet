-- One row per recommendation edge, exploded from the pub.leaflet.graph.recommendations
-- record so recommendations are queryable in both directions (what a publication
-- recommends, and who recommends a publication). `uri` is the source record's at-uri;
-- `sort_order` preserves the order the publisher chose.
create table "public"."publication_recommendations" (
    "uri" text not null,
    "publication" text not null,
    "recommendation" text not null,
    "sort_order" integer not null,
    "indexed_at" timestamp with time zone not null default now()
);

alter table "public"."publication_recommendations" enable row level security;

CREATE UNIQUE INDEX publication_recommendations_pkey ON public.publication_recommendations USING btree (publication, recommendation);

alter table "public"."publication_recommendations" add constraint "publication_recommendations_pkey" PRIMARY KEY using index "publication_recommendations_pkey";

CREATE INDEX publication_recommendations_uri_idx ON public.publication_recommendations USING btree (uri);

CREATE INDEX publication_recommendations_recommendation_idx ON public.publication_recommendations USING btree (recommendation);

alter table "public"."publication_recommendations" add constraint "publication_recommendations_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON UPDATE CASCADE ON DELETE CASCADE;

grant delete on table "public"."publication_recommendations" to "anon";

grant insert on table "public"."publication_recommendations" to "anon";

grant references on table "public"."publication_recommendations" to "anon";

grant select on table "public"."publication_recommendations" to "anon";

grant trigger on table "public"."publication_recommendations" to "anon";

grant truncate on table "public"."publication_recommendations" to "anon";

grant update on table "public"."publication_recommendations" to "anon";

grant delete on table "public"."publication_recommendations" to "authenticated";

grant insert on table "public"."publication_recommendations" to "authenticated";

grant references on table "public"."publication_recommendations" to "authenticated";

grant select on table "public"."publication_recommendations" to "authenticated";

grant trigger on table "public"."publication_recommendations" to "authenticated";

grant truncate on table "public"."publication_recommendations" to "authenticated";

grant update on table "public"."publication_recommendations" to "authenticated";

grant delete on table "public"."publication_recommendations" to "service_role";

grant insert on table "public"."publication_recommendations" to "service_role";

grant references on table "public"."publication_recommendations" to "service_role";

grant select on table "public"."publication_recommendations" to "service_role";

grant trigger on table "public"."publication_recommendations" to "service_role";

grant truncate on table "public"."publication_recommendations" to "service_role";

grant update on table "public"."publication_recommendations" to "service_role";
