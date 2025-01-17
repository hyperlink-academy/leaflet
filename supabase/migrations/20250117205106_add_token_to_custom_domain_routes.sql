alter table "public"."custom_domain_routes" add column "permission_token" uuid not null;

alter table "public"."custom_domain_routes" enable row level security;

alter table "public"."custom_domain_routes" add constraint "custom_domain_routes_permission_token_fkey" FOREIGN KEY (permission_token) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."custom_domain_routes" validate constraint "custom_domain_routes_permission_token_fkey";
