-- One row per question the subject's author accepted or hid, exploded from
-- their pub.leaflet.interactions.questionVisibility record (`uri`). A question
-- with no row is pending. `question` carries no foreign key so an entry
-- survives the question being indexed after it.
create table "public"."document_question_visibility" (
    "uri" text not null,
    "subject" text not null,
    "question" text not null,
    "state" text not null,
    "indexed_at" timestamp with time zone not null default now()
);

alter table "public"."document_question_visibility" enable row level security;

alter table "public"."document_question_visibility" add constraint "document_question_visibility_state_check" CHECK (state in ('accepted', 'hidden'));

CREATE UNIQUE INDEX document_question_visibility_pkey ON public.document_question_visibility USING btree (subject, question);

alter table "public"."document_question_visibility" add constraint "document_question_visibility_pkey" PRIMARY KEY using index "document_question_visibility_pkey";

CREATE INDEX document_question_visibility_uri_idx ON public.document_question_visibility USING btree (uri);

alter table "public"."document_question_visibility" add constraint "document_question_visibility_subject_fkey" FOREIGN KEY (subject) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

grant all on table "public"."document_question_visibility" to "anon";
grant all on table "public"."document_question_visibility" to "authenticated";
grant all on table "public"."document_question_visibility" to "service_role";

-- The key of the reply block a reply draft was started from
alter table "public"."leaflets_in_publications"
  add column "reply_to_block" text;
