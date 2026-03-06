create table "public"."recommends_on_documents" (
    "uri" text not null,
    "record" jsonb not null,
    "document" text not null,
    "recommender_did" text not null,
    "indexed_at" timestamp with time zone not null default now()
);

alter table "public"."recommends_on_documents" enable row level security;

CREATE UNIQUE INDEX recommends_on_documents_pkey ON public.recommends_on_documents USING btree (uri);

alter table "public"."recommends_on_documents" add constraint "recommends_on_documents_pkey" PRIMARY KEY using index "recommends_on_documents_pkey";

CREATE INDEX recommends_on_documents_document_idx ON public.recommends_on_documents USING btree (document);

CREATE INDEX recommends_on_documents_recommender_did_idx ON public.recommends_on_documents USING btree (recommender_did);

CREATE UNIQUE INDEX recommends_on_documents_recommender_document_idx ON public.recommends_on_documents USING btree (recommender_did, document);

alter table "public"."recommends_on_documents" add constraint "recommends_on_documents_document_fkey" FOREIGN KEY (document) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

alter table "public"."recommends_on_documents" add constraint "recommends_on_documents_recommender_did_fkey" FOREIGN KEY (recommender_did) REFERENCES identities(atp_did) ON UPDATE CASCADE ON DELETE CASCADE;

grant delete on table "public"."recommends_on_documents" to "anon";

grant insert on table "public"."recommends_on_documents" to "anon";

grant references on table "public"."recommends_on_documents" to "anon";

grant select on table "public"."recommends_on_documents" to "anon";

grant trigger on table "public"."recommends_on_documents" to "anon";

grant truncate on table "public"."recommends_on_documents" to "anon";

grant update on table "public"."recommends_on_documents" to "anon";

grant delete on table "public"."recommends_on_documents" to "authenticated";

grant insert on table "public"."recommends_on_documents" to "authenticated";

grant references on table "public"."recommends_on_documents" to "authenticated";

grant select on table "public"."recommends_on_documents" to "authenticated";

grant trigger on table "public"."recommends_on_documents" to "authenticated";

grant truncate on table "public"."recommends_on_documents" to "authenticated";

grant update on table "public"."recommends_on_documents" to "authenticated";

grant delete on table "public"."recommends_on_documents" to "service_role";

grant insert on table "public"."recommends_on_documents" to "service_role";

grant references on table "public"."recommends_on_documents" to "service_role";

grant select on table "public"."recommends_on_documents" to "service_role";

grant trigger on table "public"."recommends_on_documents" to "service_role";

grant truncate on table "public"."recommends_on_documents" to "service_role";

grant update on table "public"."recommends_on_documents" to "service_role";
