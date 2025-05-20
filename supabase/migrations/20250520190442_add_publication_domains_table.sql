create table "public"."publication_domains" (
    "publication" text not null,
    "domain" text not null,
    "created_at" timestamp with time zone not null default now()
);
alter table "public"."publication_domains" enable row level security;
CREATE UNIQUE INDEX publication_domains_pkey ON public.publication_domains USING btree (publication, domain);
alter table "public"."publication_domains" add constraint "publication_domains_pkey" PRIMARY KEY using index "publication_domains_pkey";
alter table "public"."publication_domains" add constraint "publication_domains_domain_fkey" FOREIGN KEY (domain) REFERENCES custom_domains(domain) ON DELETE CASCADE not valid;
alter table "public"."publication_domains" validate constraint "publication_domains_domain_fkey";
alter table "public"."publication_domains" add constraint "publication_domains_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE not valid;
alter table "public"."publication_domains" validate constraint "publication_domains_publication_fkey";
grant delete on table "public"."publication_domains" to "anon";
grant insert on table "public"."publication_domains" to "anon";
grant references on table "public"."publication_domains" to "anon";
grant select on table "public"."publication_domains" to "anon";
grant trigger on table "public"."publication_domains" to "anon";
grant truncate on table "public"."publication_domains" to "anon";
grant update on table "public"."publication_domains" to "anon";
grant delete on table "public"."publication_domains" to "authenticated";
grant insert on table "public"."publication_domains" to "authenticated";
grant references on table "public"."publication_domains" to "authenticated";
grant select on table "public"."publication_domains" to "authenticated";
grant trigger on table "public"."publication_domains" to "authenticated";
grant truncate on table "public"."publication_domains" to "authenticated";
grant update on table "public"."publication_domains" to "authenticated";
grant delete on table "public"."publication_domains" to "service_role";
grant insert on table "public"."publication_domains" to "service_role";
grant references on table "public"."publication_domains" to "service_role";
grant select on table "public"."publication_domains" to "service_role";
grant trigger on table "public"."publication_domains" to "service_role";
grant truncate on table "public"."publication_domains" to "service_role";
grant update on table "public"."publication_domains" to "service_role";
