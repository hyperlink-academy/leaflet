create table "public"."custom_domain_routes" (
    "id" uuid not null default gen_random_uuid(),
    "domain" text not null,
    "route" text not null
);


create table "public"."custom_domains" (
    "domain" text not null,
    "identity" text not null default ''::text,
    "confirmed" boolean not null
);


alter table "public"."custom_domains" enable row level security;

CREATE UNIQUE INDEX custom_domain_routes_domain_route_key ON public.custom_domain_routes USING btree (domain, route);

CREATE UNIQUE INDEX custom_domain_routes_pkey ON public.custom_domain_routes USING btree (id);

CREATE UNIQUE INDEX custom_domains_pkey ON public.custom_domains USING btree (domain);

CREATE UNIQUE INDEX identities_email_key ON public.identities USING btree (email);

alter table "public"."custom_domain_routes" add constraint "custom_domain_routes_pkey" PRIMARY KEY using index "custom_domain_routes_pkey";

alter table "public"."custom_domains" add constraint "custom_domains_pkey" PRIMARY KEY using index "custom_domains_pkey";

alter table "public"."custom_domain_routes" add constraint "custom_domain_routes_domain_fkey" FOREIGN KEY (domain) REFERENCES custom_domains(domain) not valid;

alter table "public"."custom_domain_routes" validate constraint "custom_domain_routes_domain_fkey";

alter table "public"."custom_domain_routes" add constraint "custom_domain_routes_domain_route_key" UNIQUE using index "custom_domain_routes_domain_route_key";

alter table "public"."custom_domains" add constraint "custom_domains_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(email) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."custom_domains" validate constraint "custom_domains_identity_fkey";

alter table "public"."identities" add constraint "identities_email_key" UNIQUE using index "identities_email_key";

grant delete on table "public"."custom_domain_routes" to "anon";

grant insert on table "public"."custom_domain_routes" to "anon";

grant references on table "public"."custom_domain_routes" to "anon";

grant select on table "public"."custom_domain_routes" to "anon";

grant trigger on table "public"."custom_domain_routes" to "anon";

grant truncate on table "public"."custom_domain_routes" to "anon";

grant update on table "public"."custom_domain_routes" to "anon";

grant delete on table "public"."custom_domain_routes" to "authenticated";

grant insert on table "public"."custom_domain_routes" to "authenticated";

grant references on table "public"."custom_domain_routes" to "authenticated";

grant select on table "public"."custom_domain_routes" to "authenticated";

grant trigger on table "public"."custom_domain_routes" to "authenticated";

grant truncate on table "public"."custom_domain_routes" to "authenticated";

grant update on table "public"."custom_domain_routes" to "authenticated";

grant delete on table "public"."custom_domain_routes" to "service_role";

grant insert on table "public"."custom_domain_routes" to "service_role";

grant references on table "public"."custom_domain_routes" to "service_role";

grant select on table "public"."custom_domain_routes" to "service_role";

grant trigger on table "public"."custom_domain_routes" to "service_role";

grant truncate on table "public"."custom_domain_routes" to "service_role";

grant update on table "public"."custom_domain_routes" to "service_role";

grant delete on table "public"."custom_domains" to "anon";

grant insert on table "public"."custom_domains" to "anon";

grant references on table "public"."custom_domains" to "anon";

grant select on table "public"."custom_domains" to "anon";

grant trigger on table "public"."custom_domains" to "anon";

grant truncate on table "public"."custom_domains" to "anon";

grant update on table "public"."custom_domains" to "anon";

grant delete on table "public"."custom_domains" to "authenticated";

grant insert on table "public"."custom_domains" to "authenticated";

grant references on table "public"."custom_domains" to "authenticated";

grant select on table "public"."custom_domains" to "authenticated";

grant trigger on table "public"."custom_domains" to "authenticated";

grant truncate on table "public"."custom_domains" to "authenticated";

grant update on table "public"."custom_domains" to "authenticated";

grant delete on table "public"."custom_domains" to "service_role";

grant insert on table "public"."custom_domains" to "service_role";

grant references on table "public"."custom_domains" to "service_role";

grant select on table "public"."custom_domains" to "service_role";

grant trigger on table "public"."custom_domains" to "service_role";

grant truncate on table "public"."custom_domains" to "service_role";

grant update on table "public"."custom_domains" to "service_role";
