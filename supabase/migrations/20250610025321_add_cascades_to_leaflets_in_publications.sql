alter table "public"."publication_subscriptions" alter column "uri" set not null;

alter table "public"."leaflets_in_publications" drop constraint "leaflets_in_publications_leaflet_fkey";

alter table "public"."leaflets_in_publications" drop constraint "leaflets_in_publications_publication_fkey";

alter table "public"."leaflets_in_publications" add constraint "leaflets_in_publications_leaflet_fkey" FOREIGN KEY (leaflet) REFERENCES permission_tokens(id) ON DELETE CASCADE not valid;

alter table "public"."leaflets_in_publications" validate constraint "leaflets_in_publications_leaflet_fkey";

alter table "public"."leaflets_in_publications" add constraint "leaflets_in_publications_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE not valid;

alter table "public"."leaflets_in_publications" validate constraint "leaflets_in_publications_publication_fkey";
