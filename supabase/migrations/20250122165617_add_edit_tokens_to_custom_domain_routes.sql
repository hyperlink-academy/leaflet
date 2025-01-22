alter table "public"."custom_domain_routes" drop constraint "custom_domain_routes_permission_token_fkey";

alter table "public"."custom_domain_routes" drop column "permission_token";

alter table "public"."custom_domain_routes" add column "edit_permission_token" uuid not null;

alter table "public"."custom_domain_routes" add column "view_permission_token" uuid not null;

alter table "public"."custom_domain_routes" add constraint "custom_domain_routes_edit_permission_token_fkey" FOREIGN KEY (edit_permission_token) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."custom_domain_routes" validate constraint "custom_domain_routes_edit_permission_token_fkey";

alter table "public"."custom_domain_routes" add constraint "custom_domain_routes_view_permission_token_fkey" FOREIGN KEY (view_permission_token) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."custom_domain_routes" validate constraint "custom_domain_routes_view_permission_token_fkey";
