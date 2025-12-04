create table "public"."leaflets_to_documents" (
    "leaflet" uuid not null,
    "document" text not null,
    "created_at" timestamp with time zone not null default now(),
    "title" text not null default ''::text,
    "description" text not null default ''::text
);

alter table "public"."leaflets_to_documents" enable row level security;

CREATE UNIQUE INDEX leaflets_to_documents_pkey ON public.leaflets_to_documents USING btree (leaflet, document);

alter table "public"."leaflets_to_documents" add constraint "leaflets_to_documents_pkey" PRIMARY KEY using index "leaflets_to_documents_pkey";

alter table "public"."leaflets_to_documents" add constraint "leaflets_to_documents_document_fkey" FOREIGN KEY (document) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."leaflets_to_documents" validate constraint "leaflets_to_documents_document_fkey";

alter table "public"."leaflets_to_documents" add constraint "leaflets_to_documents_leaflet_fkey" FOREIGN KEY (leaflet) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."leaflets_to_documents" validate constraint "leaflets_to_documents_leaflet_fkey";

grant delete on table "public"."leaflets_to_documents" to "anon";

grant insert on table "public"."leaflets_to_documents" to "anon";

grant references on table "public"."leaflets_to_documents" to "anon";

grant select on table "public"."leaflets_to_documents" to "anon";

grant trigger on table "public"."leaflets_to_documents" to "anon";

grant truncate on table "public"."leaflets_to_documents" to "anon";

grant update on table "public"."leaflets_to_documents" to "anon";

grant delete on table "public"."leaflets_to_documents" to "authenticated";

grant insert on table "public"."leaflets_to_documents" to "authenticated";

grant references on table "public"."leaflets_to_documents" to "authenticated";

grant select on table "public"."leaflets_to_documents" to "authenticated";

grant trigger on table "public"."leaflets_to_documents" to "authenticated";

grant truncate on table "public"."leaflets_to_documents" to "authenticated";

grant update on table "public"."leaflets_to_documents" to "authenticated";

grant delete on table "public"."leaflets_to_documents" to "service_role";

grant insert on table "public"."leaflets_to_documents" to "service_role";

grant references on table "public"."leaflets_to_documents" to "service_role";

grant select on table "public"."leaflets_to_documents" to "service_role";

grant trigger on table "public"."leaflets_to_documents" to "service_role";

grant truncate on table "public"."leaflets_to_documents" to "service_role";

grant update on table "public"."leaflets_to_documents" to "service_role";
