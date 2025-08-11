create table "public"."comments_on_documents" (
    "uri" text not null,
    "record" jsonb not null,
    "document" text,
    "indexed_at" timestamp with time zone not null default now(),
    "profile" text
);


alter table "public"."comments_on_documents" enable row level security;

CREATE UNIQUE INDEX comments_on_documents_pkey ON public.comments_on_documents USING btree (uri);

alter table "public"."comments_on_documents" add constraint "comments_on_documents_pkey" PRIMARY KEY using index "comments_on_documents_pkey";

alter table "public"."comments_on_documents" add constraint "comments_on_documents_document_fkey" FOREIGN KEY (document) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comments_on_documents" validate constraint "comments_on_documents_document_fkey";

alter table "public"."comments_on_documents" add constraint "comments_on_documents_profile_fkey" FOREIGN KEY (profile) REFERENCES bsky_profiles(did) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."comments_on_documents" validate constraint "comments_on_documents_profile_fkey";

alter table "public"."publications" add constraint "publications_identity_did_fkey" FOREIGN KEY (identity_did) REFERENCES identities(atp_did) ON DELETE CASCADE not valid;

alter table "public"."publications" validate constraint "publications_identity_did_fkey";

grant delete on table "public"."comments_on_documents" to "anon";

grant insert on table "public"."comments_on_documents" to "anon";

grant references on table "public"."comments_on_documents" to "anon";

grant select on table "public"."comments_on_documents" to "anon";

grant trigger on table "public"."comments_on_documents" to "anon";

grant truncate on table "public"."comments_on_documents" to "anon";

grant update on table "public"."comments_on_documents" to "anon";

grant delete on table "public"."comments_on_documents" to "authenticated";

grant insert on table "public"."comments_on_documents" to "authenticated";

grant references on table "public"."comments_on_documents" to "authenticated";

grant select on table "public"."comments_on_documents" to "authenticated";

grant trigger on table "public"."comments_on_documents" to "authenticated";

grant truncate on table "public"."comments_on_documents" to "authenticated";

grant update on table "public"."comments_on_documents" to "authenticated";

grant delete on table "public"."comments_on_documents" to "service_role";

grant insert on table "public"."comments_on_documents" to "service_role";

grant references on table "public"."comments_on_documents" to "service_role";

grant select on table "public"."comments_on_documents" to "service_role";

grant trigger on table "public"."comments_on_documents" to "service_role";

grant truncate on table "public"."comments_on_documents" to "service_role";

grant update on table "public"."comments_on_documents" to "service_role";
