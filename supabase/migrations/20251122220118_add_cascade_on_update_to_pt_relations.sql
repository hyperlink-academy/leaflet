alter table "public"."permission_token_on_homepage" drop constraint "permission_token_creator_token_fkey";

alter table "public"."leaflets_in_publications" drop constraint "leaflets_in_publications_leaflet_fkey";

alter table "public"."leaflets_in_publications" drop column "archived";

alter table "public"."permission_token_on_homepage" drop column "archived";

alter table "public"."permission_token_on_homepage" add constraint "permission_token_on_homepage_token_fkey" FOREIGN KEY (token) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."permission_token_on_homepage" validate constraint "permission_token_on_homepage_token_fkey";

alter table "public"."leaflets_in_publications" add constraint "leaflets_in_publications_leaflet_fkey" FOREIGN KEY (leaflet) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."leaflets_in_publications" validate constraint "leaflets_in_publications_leaflet_fkey";
