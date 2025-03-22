create table "public"."documents" (
    "uri" text not null,
    "data" jsonb not null,
    "indexed_at" timestamp with time zone not null default now()
);
alter table "public"."documents" enable row level security;
create table "public"."documents_in_publications" (
    "publication" text not null,
    "document" text not null,
    "indexed_at" timestamp with time zone not null default now()
);
alter table "public"."documents_in_publications" enable row level security;
create table "public"."oauth_session_store" (
    "key" text not null,
    "session" jsonb not null
);
alter table "public"."oauth_session_store" enable row level security;
create table "public"."oauth_state_store" (
    "key" text not null,
    "state" jsonb not null
);
alter table "public"."oauth_state_store" enable row level security;
create table "public"."publications" (
    "uri" text not null,
    "indexed_at" timestamp with time zone not null default now(),
    "name" text not null,
    "identity_did" text not null
);
alter table "public"."publications" enable row level security;
alter table "public"."email_auth_tokens" alter column "email" drop not null;
alter table "public"."identities" add column "atp_did" text;
CREATE UNIQUE INDEX documents_in_publications_pkey ON public.documents_in_publications USING btree (publication, document);
CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (uri);
CREATE UNIQUE INDEX identities_atp_did_key ON public.identities USING btree (atp_did);
CREATE UNIQUE INDEX oauth_session_store_pkey ON public.oauth_session_store USING btree (key);
CREATE UNIQUE INDEX oauth_state_store_pkey ON public.oauth_state_store USING btree (key);
CREATE UNIQUE INDEX publications_pkey ON public.publications USING btree (uri);
alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";
alter table "public"."documents_in_publications" add constraint "documents_in_publications_pkey" PRIMARY KEY using index "documents_in_publications_pkey";
alter table "public"."oauth_session_store" add constraint "oauth_session_store_pkey" PRIMARY KEY using index "oauth_session_store_pkey";
alter table "public"."oauth_state_store" add constraint "oauth_state_store_pkey" PRIMARY KEY using index "oauth_state_store_pkey";
alter table "public"."publications" add constraint "publications_pkey" PRIMARY KEY using index "publications_pkey";
alter table "public"."documents_in_publications" add constraint "documents_in_publications_document_fkey" FOREIGN KEY (document) REFERENCES documents(uri) ON DELETE CASCADE not valid;
alter table "public"."documents_in_publications" validate constraint "documents_in_publications_document_fkey";
alter table "public"."documents_in_publications" add constraint "documents_in_publications_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE not valid;
alter table "public"."documents_in_publications" validate constraint "documents_in_publications_publication_fkey";
alter table "public"."identities" add constraint "identities_atp_did_key" UNIQUE using index "identities_atp_did_key";
grant delete on table "public"."documents" to "anon";
grant insert on table "public"."documents" to "anon";
grant references on table "public"."documents" to "anon";
grant select on table "public"."documents" to "anon";
grant trigger on table "public"."documents" to "anon";
grant truncate on table "public"."documents" to "anon";
grant update on table "public"."documents" to "anon";
grant delete on table "public"."documents" to "authenticated";
grant insert on table "public"."documents" to "authenticated";
grant references on table "public"."documents" to "authenticated";
grant select on table "public"."documents" to "authenticated";
grant trigger on table "public"."documents" to "authenticated";
grant truncate on table "public"."documents" to "authenticated";
grant update on table "public"."documents" to "authenticated";
grant delete on table "public"."documents" to "service_role";
grant insert on table "public"."documents" to "service_role";
grant references on table "public"."documents" to "service_role";
grant select on table "public"."documents" to "service_role";
grant trigger on table "public"."documents" to "service_role";
grant truncate on table "public"."documents" to "service_role";
grant update on table "public"."documents" to "service_role";
grant delete on table "public"."documents_in_publications" to "anon";
grant insert on table "public"."documents_in_publications" to "anon";
grant references on table "public"."documents_in_publications" to "anon";
grant select on table "public"."documents_in_publications" to "anon";
grant trigger on table "public"."documents_in_publications" to "anon";
grant truncate on table "public"."documents_in_publications" to "anon";
grant update on table "public"."documents_in_publications" to "anon";
grant delete on table "public"."documents_in_publications" to "authenticated";
grant insert on table "public"."documents_in_publications" to "authenticated";
grant references on table "public"."documents_in_publications" to "authenticated";
grant select on table "public"."documents_in_publications" to "authenticated";
grant trigger on table "public"."documents_in_publications" to "authenticated";
grant truncate on table "public"."documents_in_publications" to "authenticated";
grant update on table "public"."documents_in_publications" to "authenticated";
grant delete on table "public"."documents_in_publications" to "service_role";
grant insert on table "public"."documents_in_publications" to "service_role";
grant references on table "public"."documents_in_publications" to "service_role";
grant select on table "public"."documents_in_publications" to "service_role";
grant trigger on table "public"."documents_in_publications" to "service_role";
grant truncate on table "public"."documents_in_publications" to "service_role";
grant update on table "public"."documents_in_publications" to "service_role";
grant delete on table "public"."oauth_session_store" to "anon";
grant insert on table "public"."oauth_session_store" to "anon";
grant references on table "public"."oauth_session_store" to "anon";
grant select on table "public"."oauth_session_store" to "anon";
grant trigger on table "public"."oauth_session_store" to "anon";
grant truncate on table "public"."oauth_session_store" to "anon";
grant update on table "public"."oauth_session_store" to "anon";
grant delete on table "public"."oauth_session_store" to "authenticated";
grant insert on table "public"."oauth_session_store" to "authenticated";
grant references on table "public"."oauth_session_store" to "authenticated";
grant select on table "public"."oauth_session_store" to "authenticated";
grant trigger on table "public"."oauth_session_store" to "authenticated";
grant truncate on table "public"."oauth_session_store" to "authenticated";
grant update on table "public"."oauth_session_store" to "authenticated";
grant delete on table "public"."oauth_session_store" to "service_role";
grant insert on table "public"."oauth_session_store" to "service_role";
grant references on table "public"."oauth_session_store" to "service_role";
grant select on table "public"."oauth_session_store" to "service_role";
grant trigger on table "public"."oauth_session_store" to "service_role";
grant truncate on table "public"."oauth_session_store" to "service_role";
grant update on table "public"."oauth_session_store" to "service_role";
grant delete on table "public"."oauth_state_store" to "anon";
grant insert on table "public"."oauth_state_store" to "anon";
grant references on table "public"."oauth_state_store" to "anon";
grant select on table "public"."oauth_state_store" to "anon";
grant trigger on table "public"."oauth_state_store" to "anon";
grant truncate on table "public"."oauth_state_store" to "anon";
grant update on table "public"."oauth_state_store" to "anon";
grant delete on table "public"."oauth_state_store" to "authenticated";
grant insert on table "public"."oauth_state_store" to "authenticated";
grant references on table "public"."oauth_state_store" to "authenticated";
grant select on table "public"."oauth_state_store" to "authenticated";
grant trigger on table "public"."oauth_state_store" to "authenticated";
grant truncate on table "public"."oauth_state_store" to "authenticated";
grant update on table "public"."oauth_state_store" to "authenticated";
grant delete on table "public"."oauth_state_store" to "service_role";
grant insert on table "public"."oauth_state_store" to "service_role";
grant references on table "public"."oauth_state_store" to "service_role";
grant select on table "public"."oauth_state_store" to "service_role";
grant trigger on table "public"."oauth_state_store" to "service_role";
grant truncate on table "public"."oauth_state_store" to "service_role";
grant update on table "public"."oauth_state_store" to "service_role";
grant delete on table "public"."publications" to "anon";
grant insert on table "public"."publications" to "anon";
grant references on table "public"."publications" to "anon";
grant select on table "public"."publications" to "anon";
grant trigger on table "public"."publications" to "anon";
grant truncate on table "public"."publications" to "anon";
grant update on table "public"."publications" to "anon";
grant delete on table "public"."publications" to "authenticated";
grant insert on table "public"."publications" to "authenticated";
grant references on table "public"."publications" to "authenticated";
grant select on table "public"."publications" to "authenticated";
grant trigger on table "public"."publications" to "authenticated";
grant truncate on table "public"."publications" to "authenticated";
grant update on table "public"."publications" to "authenticated";
grant delete on table "public"."publications" to "service_role";
grant insert on table "public"."publications" to "service_role";
grant references on table "public"."publications" to "service_role";
grant select on table "public"."publications" to "service_role";
grant trigger on table "public"."publications" to "service_role";
grant truncate on table "public"."publications" to "service_role";
grant update on table "public"."publications" to "service_role";
create schema if not exists "publications";
