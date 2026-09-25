-- Document versioning: explicitly saved snapshots of a leaflet's fact closure,
-- plus deferred blob deletion so snapshots keep rendering images that were
-- later removed from the live document.

-- document_versions -----------------------------------------------------------
-- One row per saved version: the serialized fact array returned by
-- get_facts(root) at cut time, sorted by fact id. Keyed on the permission
-- token (the editor URL is the capability, and deleting a leaflet deletes its
-- token, cascading versions away with it). snapshot_path is an escape hatch
-- for offloading oversized snapshots to a storage bucket later.
create table "public"."document_versions" (
    "id" uuid not null,
    "token" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "kind" text not null default 'named',
    "name" text,
    "author_did" text,
    "closure_hash" text not null,
    "snapshot" jsonb,
    "snapshot_path" text,
    "fact_count" integer not null,
    "byte_size" integer not null
);

alter table "public"."document_versions" enable row level security;

CREATE UNIQUE INDEX document_versions_pkey ON public.document_versions USING btree (id);

alter table "public"."document_versions" add constraint "document_versions_pkey" PRIMARY KEY using index "document_versions_pkey";

CREATE INDEX document_versions_token_created_at_idx ON public.document_versions USING btree (token, created_at desc);

alter table "public"."document_versions" add constraint "document_versions_token_fkey" FOREIGN KEY (token) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- document_version_blob_refs --------------------------------------------------
-- Which storage objects (minilink-user-assets object names) each version's
-- snapshot references, populated at cut time. Indexed both ways: by version so
-- deleting a version cascades its refs away, by path so blob GC can check
-- "does any version still need this?" without scanning snapshots.
create table "public"."document_version_blob_refs" (
    "version" uuid not null,
    "path" text not null
);

alter table "public"."document_version_blob_refs" enable row level security;

CREATE UNIQUE INDEX document_version_blob_refs_pkey ON public.document_version_blob_refs USING btree (version, path);

alter table "public"."document_version_blob_refs" add constraint "document_version_blob_refs_pkey" PRIMARY KEY using index "document_version_blob_refs_pkey";

CREATE INDEX document_version_blob_refs_path_idx ON public.document_version_blob_refs USING btree (path);

alter table "public"."document_version_blob_refs" add constraint "document_version_blob_refs_version_fkey" FOREIGN KEY (version) REFERENCES document_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- blob_cleanup_queue ----------------------------------------------------------
-- Deleting an image block queues its storage object here instead of removing
-- it synchronously; the cleanup_deleted_blobs job deletes a queued object only
-- once nothing (no live fact, no version blob ref) references it.
create table "public"."blob_cleanup_queue" (
    "path" text not null,
    "queued_at" timestamp with time zone not null default now()
);

alter table "public"."blob_cleanup_queue" enable row level security;

CREATE UNIQUE INDEX blob_cleanup_queue_pkey ON public.blob_cleanup_queue USING btree (path);

alter table "public"."blob_cleanup_queue" add constraint "blob_cleanup_queue_pkey" PRIMARY KEY using index "blob_cleanup_queue_pkey";

-- The facts_image_src_object_idx expression index the blob GC depends on is
-- created in the next migration — facts is the hottest table, so it builds
-- CONCURRENTLY, which must be the only statement in its own file.

grant delete on table "public"."document_versions" to "anon";

grant insert on table "public"."document_versions" to "anon";

grant references on table "public"."document_versions" to "anon";

grant select on table "public"."document_versions" to "anon";

grant trigger on table "public"."document_versions" to "anon";

grant truncate on table "public"."document_versions" to "anon";

grant update on table "public"."document_versions" to "anon";

grant delete on table "public"."document_versions" to "authenticated";

grant insert on table "public"."document_versions" to "authenticated";

grant references on table "public"."document_versions" to "authenticated";

grant select on table "public"."document_versions" to "authenticated";

grant trigger on table "public"."document_versions" to "authenticated";

grant truncate on table "public"."document_versions" to "authenticated";

grant update on table "public"."document_versions" to "authenticated";

grant delete on table "public"."document_versions" to "service_role";

grant insert on table "public"."document_versions" to "service_role";

grant references on table "public"."document_versions" to "service_role";

grant select on table "public"."document_versions" to "service_role";

grant trigger on table "public"."document_versions" to "service_role";

grant truncate on table "public"."document_versions" to "service_role";

grant update on table "public"."document_versions" to "service_role";

grant delete on table "public"."document_version_blob_refs" to "anon";

grant insert on table "public"."document_version_blob_refs" to "anon";

grant references on table "public"."document_version_blob_refs" to "anon";

grant select on table "public"."document_version_blob_refs" to "anon";

grant trigger on table "public"."document_version_blob_refs" to "anon";

grant truncate on table "public"."document_version_blob_refs" to "anon";

grant update on table "public"."document_version_blob_refs" to "anon";

grant delete on table "public"."document_version_blob_refs" to "authenticated";

grant insert on table "public"."document_version_blob_refs" to "authenticated";

grant references on table "public"."document_version_blob_refs" to "authenticated";

grant select on table "public"."document_version_blob_refs" to "authenticated";

grant trigger on table "public"."document_version_blob_refs" to "authenticated";

grant truncate on table "public"."document_version_blob_refs" to "authenticated";

grant update on table "public"."document_version_blob_refs" to "authenticated";

grant delete on table "public"."document_version_blob_refs" to "service_role";

grant insert on table "public"."document_version_blob_refs" to "service_role";

grant references on table "public"."document_version_blob_refs" to "service_role";

grant select on table "public"."document_version_blob_refs" to "service_role";

grant trigger on table "public"."document_version_blob_refs" to "service_role";

grant truncate on table "public"."document_version_blob_refs" to "service_role";

grant update on table "public"."document_version_blob_refs" to "service_role";

grant delete on table "public"."blob_cleanup_queue" to "anon";

grant insert on table "public"."blob_cleanup_queue" to "anon";

grant references on table "public"."blob_cleanup_queue" to "anon";

grant select on table "public"."blob_cleanup_queue" to "anon";

grant trigger on table "public"."blob_cleanup_queue" to "anon";

grant truncate on table "public"."blob_cleanup_queue" to "anon";

grant update on table "public"."blob_cleanup_queue" to "anon";

grant delete on table "public"."blob_cleanup_queue" to "authenticated";

grant insert on table "public"."blob_cleanup_queue" to "authenticated";

grant references on table "public"."blob_cleanup_queue" to "authenticated";

grant select on table "public"."blob_cleanup_queue" to "authenticated";

grant trigger on table "public"."blob_cleanup_queue" to "authenticated";

grant truncate on table "public"."blob_cleanup_queue" to "authenticated";

grant update on table "public"."blob_cleanup_queue" to "authenticated";

grant delete on table "public"."blob_cleanup_queue" to "service_role";

grant insert on table "public"."blob_cleanup_queue" to "service_role";

grant references on table "public"."blob_cleanup_queue" to "service_role";

grant select on table "public"."blob_cleanup_queue" to "service_role";

grant trigger on table "public"."blob_cleanup_queue" to "service_role";

grant truncate on table "public"."blob_cleanup_queue" to "service_role";

grant update on table "public"."blob_cleanup_queue" to "service_role";
