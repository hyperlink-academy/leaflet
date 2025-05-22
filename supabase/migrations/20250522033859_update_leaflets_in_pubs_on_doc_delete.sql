alter table "public"."leaflets_in_publications" drop constraint "leaflets_in_publications_doc_fkey";
alter table "public"."leaflets_in_publications" add constraint "leaflets_in_publications_doc_fkey" FOREIGN KEY (doc) REFERENCES documents(uri) ON DELETE SET NULL not valid;
alter table "public"."leaflets_in_publications" validate constraint "leaflets_in_publications_doc_fkey";
