-- site_standard_publications table (modeled off publications)
create table "public"."site_standard_publications" (
    "uri" text not null,
    "data" jsonb not null,
    "indexed_at" timestamp with time zone not null default now(),
    "identity_did" text not null
);
alter table "public"."site_standard_publications" enable row level security;

-- site_standard_documents table (modeled off documents)
create table "public"."site_standard_documents" (
    "uri" text not null,
    "data" jsonb not null,
    "indexed_at" timestamp with time zone not null default now(),
    "identity_did" text not null
);
alter table "public"."site_standard_documents" enable row level security;

-- site_standard_documents_in_publications relation table (modeled off documents_in_publications)
create table "public"."site_standard_documents_in_publications" (
    "publication" text not null,
    "document" text not null,
    "indexed_at" timestamp with time zone not null default now()
);
alter table "public"."site_standard_documents_in_publications" enable row level security;

-- Primary key indexes
CREATE UNIQUE INDEX site_standard_publications_pkey ON public.site_standard_publications USING btree (uri);
CREATE UNIQUE INDEX site_standard_documents_pkey ON public.site_standard_documents USING btree (uri);
CREATE UNIQUE INDEX site_standard_documents_in_publications_pkey ON public.site_standard_documents_in_publications USING btree (publication, document);

-- Add primary key constraints
alter table "public"."site_standard_publications" add constraint "site_standard_publications_pkey" PRIMARY KEY using index "site_standard_publications_pkey";
alter table "public"."site_standard_documents" add constraint "site_standard_documents_pkey" PRIMARY KEY using index "site_standard_documents_pkey";
alter table "public"."site_standard_documents_in_publications" add constraint "site_standard_documents_in_publications_pkey" PRIMARY KEY using index "site_standard_documents_in_publications_pkey";

-- Foreign key constraints for identity relations
alter table "public"."site_standard_publications" add constraint "site_standard_publications_identity_did_fkey" FOREIGN KEY (identity_did) REFERENCES identities(atp_did) ON DELETE CASCADE not valid;
alter table "public"."site_standard_publications" validate constraint "site_standard_publications_identity_did_fkey";
alter table "public"."site_standard_documents" add constraint "site_standard_documents_identity_did_fkey" FOREIGN KEY (identity_did) REFERENCES identities(atp_did) ON DELETE CASCADE not valid;
alter table "public"."site_standard_documents" validate constraint "site_standard_documents_identity_did_fkey";

-- Foreign key constraints for relation table
alter table "public"."site_standard_documents_in_publications" add constraint "site_standard_documents_in_publications_document_fkey" FOREIGN KEY (document) REFERENCES site_standard_documents(uri) ON DELETE CASCADE not valid;
alter table "public"."site_standard_documents_in_publications" validate constraint "site_standard_documents_in_publications_document_fkey";
alter table "public"."site_standard_documents_in_publications" add constraint "site_standard_documents_in_publications_publication_fkey" FOREIGN KEY (publication) REFERENCES site_standard_publications(uri) ON DELETE CASCADE not valid;
alter table "public"."site_standard_documents_in_publications" validate constraint "site_standard_documents_in_publications_publication_fkey";

-- Grants for site_standard_publications
grant delete on table "public"."site_standard_publications" to "anon";
grant insert on table "public"."site_standard_publications" to "anon";
grant references on table "public"."site_standard_publications" to "anon";
grant select on table "public"."site_standard_publications" to "anon";
grant trigger on table "public"."site_standard_publications" to "anon";
grant truncate on table "public"."site_standard_publications" to "anon";
grant update on table "public"."site_standard_publications" to "anon";
grant delete on table "public"."site_standard_publications" to "authenticated";
grant insert on table "public"."site_standard_publications" to "authenticated";
grant references on table "public"."site_standard_publications" to "authenticated";
grant select on table "public"."site_standard_publications" to "authenticated";
grant trigger on table "public"."site_standard_publications" to "authenticated";
grant truncate on table "public"."site_standard_publications" to "authenticated";
grant update on table "public"."site_standard_publications" to "authenticated";
grant delete on table "public"."site_standard_publications" to "service_role";
grant insert on table "public"."site_standard_publications" to "service_role";
grant references on table "public"."site_standard_publications" to "service_role";
grant select on table "public"."site_standard_publications" to "service_role";
grant trigger on table "public"."site_standard_publications" to "service_role";
grant truncate on table "public"."site_standard_publications" to "service_role";
grant update on table "public"."site_standard_publications" to "service_role";

-- Grants for site_standard_documents
grant delete on table "public"."site_standard_documents" to "anon";
grant insert on table "public"."site_standard_documents" to "anon";
grant references on table "public"."site_standard_documents" to "anon";
grant select on table "public"."site_standard_documents" to "anon";
grant trigger on table "public"."site_standard_documents" to "anon";
grant truncate on table "public"."site_standard_documents" to "anon";
grant update on table "public"."site_standard_documents" to "anon";
grant delete on table "public"."site_standard_documents" to "authenticated";
grant insert on table "public"."site_standard_documents" to "authenticated";
grant references on table "public"."site_standard_documents" to "authenticated";
grant select on table "public"."site_standard_documents" to "authenticated";
grant trigger on table "public"."site_standard_documents" to "authenticated";
grant truncate on table "public"."site_standard_documents" to "authenticated";
grant update on table "public"."site_standard_documents" to "authenticated";
grant delete on table "public"."site_standard_documents" to "service_role";
grant insert on table "public"."site_standard_documents" to "service_role";
grant references on table "public"."site_standard_documents" to "service_role";
grant select on table "public"."site_standard_documents" to "service_role";
grant trigger on table "public"."site_standard_documents" to "service_role";
grant truncate on table "public"."site_standard_documents" to "service_role";
grant update on table "public"."site_standard_documents" to "service_role";

-- Grants for site_standard_documents_in_publications
grant delete on table "public"."site_standard_documents_in_publications" to "anon";
grant insert on table "public"."site_standard_documents_in_publications" to "anon";
grant references on table "public"."site_standard_documents_in_publications" to "anon";
grant select on table "public"."site_standard_documents_in_publications" to "anon";
grant trigger on table "public"."site_standard_documents_in_publications" to "anon";
grant truncate on table "public"."site_standard_documents_in_publications" to "anon";
grant update on table "public"."site_standard_documents_in_publications" to "anon";
grant delete on table "public"."site_standard_documents_in_publications" to "authenticated";
grant insert on table "public"."site_standard_documents_in_publications" to "authenticated";
grant references on table "public"."site_standard_documents_in_publications" to "authenticated";
grant select on table "public"."site_standard_documents_in_publications" to "authenticated";
grant trigger on table "public"."site_standard_documents_in_publications" to "authenticated";
grant truncate on table "public"."site_standard_documents_in_publications" to "authenticated";
grant update on table "public"."site_standard_documents_in_publications" to "authenticated";
grant delete on table "public"."site_standard_documents_in_publications" to "service_role";
grant insert on table "public"."site_standard_documents_in_publications" to "service_role";
grant references on table "public"."site_standard_documents_in_publications" to "service_role";
grant select on table "public"."site_standard_documents_in_publications" to "service_role";
grant trigger on table "public"."site_standard_documents_in_publications" to "service_role";
grant truncate on table "public"."site_standard_documents_in_publications" to "service_role";
grant update on table "public"."site_standard_documents_in_publications" to "service_role";

-- site_standard_subscriptions table (modeled off publication_subscriptions)
create table "public"."site_standard_subscriptions" (
    "publication" text not null,
    "identity" text not null,
    "created_at" timestamp with time zone not null default now(),
    "record" jsonb not null,
    "uri" text not null
);
alter table "public"."site_standard_subscriptions" enable row level security;

-- Primary key and unique indexes
CREATE UNIQUE INDEX site_standard_subscriptions_pkey ON public.site_standard_subscriptions USING btree (publication, identity);
CREATE UNIQUE INDEX site_standard_subscriptions_uri_key ON public.site_standard_subscriptions USING btree (uri);

-- Add constraints
alter table "public"."site_standard_subscriptions" add constraint "site_standard_subscriptions_pkey" PRIMARY KEY using index "site_standard_subscriptions_pkey";
alter table "public"."site_standard_subscriptions" add constraint "site_standard_subscriptions_uri_key" UNIQUE using index "site_standard_subscriptions_uri_key";
alter table "public"."site_standard_subscriptions" add constraint "site_standard_subscriptions_publication_fkey" FOREIGN KEY (publication) REFERENCES site_standard_publications(uri) ON DELETE CASCADE not valid;
alter table "public"."site_standard_subscriptions" validate constraint "site_standard_subscriptions_publication_fkey";
alter table "public"."site_standard_subscriptions" add constraint "site_standard_subscriptions_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(atp_did) ON DELETE CASCADE not valid;
alter table "public"."site_standard_subscriptions" validate constraint "site_standard_subscriptions_identity_fkey";

-- Grants for site_standard_subscriptions
grant delete on table "public"."site_standard_subscriptions" to "anon";
grant insert on table "public"."site_standard_subscriptions" to "anon";
grant references on table "public"."site_standard_subscriptions" to "anon";
grant select on table "public"."site_standard_subscriptions" to "anon";
grant trigger on table "public"."site_standard_subscriptions" to "anon";
grant truncate on table "public"."site_standard_subscriptions" to "anon";
grant update on table "public"."site_standard_subscriptions" to "anon";
grant delete on table "public"."site_standard_subscriptions" to "authenticated";
grant insert on table "public"."site_standard_subscriptions" to "authenticated";
grant references on table "public"."site_standard_subscriptions" to "authenticated";
grant select on table "public"."site_standard_subscriptions" to "authenticated";
grant trigger on table "public"."site_standard_subscriptions" to "authenticated";
grant truncate on table "public"."site_standard_subscriptions" to "authenticated";
grant update on table "public"."site_standard_subscriptions" to "authenticated";
grant delete on table "public"."site_standard_subscriptions" to "service_role";
grant insert on table "public"."site_standard_subscriptions" to "service_role";
grant references on table "public"."site_standard_subscriptions" to "service_role";
grant select on table "public"."site_standard_subscriptions" to "service_role";
grant trigger on table "public"."site_standard_subscriptions" to "service_role";
grant truncate on table "public"."site_standard_subscriptions" to "service_role";
grant update on table "public"."site_standard_subscriptions" to "service_role";
