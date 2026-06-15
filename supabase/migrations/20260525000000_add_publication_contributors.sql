-- publication_contributors: who has been invited / accepted as a contributor to a publication
create table "public"."publication_contributors" (
    "publication_uri" text not null,
    "contributor_did" text not null,
    "confirmed" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
);

alter table "public"."publication_contributors" enable row level security;

CREATE UNIQUE INDEX publication_contributors_pkey ON public.publication_contributors USING btree (publication_uri, contributor_did);

alter table "public"."publication_contributors" add constraint "publication_contributors_pkey" PRIMARY KEY using index "publication_contributors_pkey";

CREATE INDEX publication_contributors_contributor_did_idx ON public.publication_contributors USING btree (contributor_did);

alter table "public"."publication_contributors" add constraint "publication_contributors_publication_uri_fkey" FOREIGN KEY (publication_uri) REFERENCES publications(uri) ON DELETE CASCADE not valid;
alter table "public"."publication_contributors" validate constraint "publication_contributors_publication_uri_fkey";

alter table "public"."publication_contributors" add constraint "publication_contributors_contributor_did_fkey" FOREIGN KEY (contributor_did) REFERENCES identities(atp_did) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."publication_contributors" validate constraint "publication_contributors_contributor_did_fkey";

grant delete on table "public"."publication_contributors" to "anon";
grant insert on table "public"."publication_contributors" to "anon";
grant references on table "public"."publication_contributors" to "anon";
grant select on table "public"."publication_contributors" to "anon";
grant trigger on table "public"."publication_contributors" to "anon";
grant truncate on table "public"."publication_contributors" to "anon";
grant update on table "public"."publication_contributors" to "anon";

grant delete on table "public"."publication_contributors" to "authenticated";
grant insert on table "public"."publication_contributors" to "authenticated";
grant references on table "public"."publication_contributors" to "authenticated";
grant select on table "public"."publication_contributors" to "authenticated";
grant trigger on table "public"."publication_contributors" to "authenticated";
grant truncate on table "public"."publication_contributors" to "authenticated";
grant update on table "public"."publication_contributors" to "authenticated";

grant delete on table "public"."publication_contributors" to "service_role";
grant insert on table "public"."publication_contributors" to "service_role";
grant references on table "public"."publication_contributors" to "service_role";
grant select on table "public"."publication_contributors" to "service_role";
grant trigger on table "public"."publication_contributors" to "service_role";
grant truncate on table "public"."publication_contributors" to "service_role";
grant update on table "public"."publication_contributors" to "service_role";

-- leaflet_contributors: who is a contributor on a specific draft.
-- Each draft belongs to one publication, so we reference the draft (permission_token id) directly.
create table "public"."leaflet_contributors" (
    "leaflet" uuid not null,
    "contributor_did" text not null,
    "created_at" timestamp with time zone not null default now()
);

alter table "public"."leaflet_contributors" enable row level security;

CREATE UNIQUE INDEX leaflet_contributors_pkey ON public.leaflet_contributors USING btree (leaflet, contributor_did);

alter table "public"."leaflet_contributors" add constraint "leaflet_contributors_pkey" PRIMARY KEY using index "leaflet_contributors_pkey";

CREATE INDEX leaflet_contributors_contributor_did_idx ON public.leaflet_contributors USING btree (contributor_did);

alter table "public"."leaflet_contributors" add constraint "leaflet_contributors_leaflet_fkey" FOREIGN KEY (leaflet) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."leaflet_contributors" validate constraint "leaflet_contributors_leaflet_fkey";

alter table "public"."leaflet_contributors" add constraint "leaflet_contributors_contributor_did_fkey" FOREIGN KEY (contributor_did) REFERENCES identities(atp_did) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."leaflet_contributors" validate constraint "leaflet_contributors_contributor_did_fkey";

grant delete on table "public"."leaflet_contributors" to "anon";
grant insert on table "public"."leaflet_contributors" to "anon";
grant references on table "public"."leaflet_contributors" to "anon";
grant select on table "public"."leaflet_contributors" to "anon";
grant trigger on table "public"."leaflet_contributors" to "anon";
grant truncate on table "public"."leaflet_contributors" to "anon";
grant update on table "public"."leaflet_contributors" to "anon";

grant delete on table "public"."leaflet_contributors" to "authenticated";
grant insert on table "public"."leaflet_contributors" to "authenticated";
grant references on table "public"."leaflet_contributors" to "authenticated";
grant select on table "public"."leaflet_contributors" to "authenticated";
grant trigger on table "public"."leaflet_contributors" to "authenticated";
grant truncate on table "public"."leaflet_contributors" to "authenticated";
grant update on table "public"."leaflet_contributors" to "authenticated";

grant delete on table "public"."leaflet_contributors" to "service_role";
grant insert on table "public"."leaflet_contributors" to "service_role";
grant references on table "public"."leaflet_contributors" to "service_role";
grant select on table "public"."leaflet_contributors" to "service_role";
grant trigger on table "public"."leaflet_contributors" to "service_role";
grant truncate on table "public"."leaflet_contributors" to "service_role";
grant update on table "public"."leaflet_contributors" to "service_role";
