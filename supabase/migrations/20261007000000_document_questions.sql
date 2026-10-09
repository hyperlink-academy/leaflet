-- One row per pub.leaflet.interactions.question record: a reader asking the
-- author of `subject` a public question.
create table "public"."document_questions" (
    "uri" text not null,
    "subject" text not null,
    "asker_did" text not null,
    "cid" text not null,
    "record" jsonb not null,
    "indexed_at" timestamp with time zone not null default now()
);

alter table "public"."document_questions" enable row level security;

CREATE UNIQUE INDEX document_questions_pkey ON public.document_questions USING btree (uri);

alter table "public"."document_questions" add constraint "document_questions_pkey" PRIMARY KEY using index "document_questions_pkey";

CREATE INDEX document_questions_subject_idx ON public.document_questions USING btree (subject);

alter table "public"."document_questions" add constraint "document_questions_subject_fkey" FOREIGN KEY (subject) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

-- One row per pub.leaflet.interactions.answer record: the subject's author
-- answering a question (`question`) inline; `record` carries the answer's
-- blocks. A question has at most one answer.
create table "public"."document_question_answers" (
    "uri" text not null,
    "question" text not null,
    "subject" text not null,
    "record" jsonb not null,
    "indexed_at" timestamp with time zone not null default now()
);

alter table "public"."document_question_answers" enable row level security;

CREATE UNIQUE INDEX document_question_answers_pkey ON public.document_question_answers USING btree (uri);

alter table "public"."document_question_answers" add constraint "document_question_answers_pkey" PRIMARY KEY using index "document_question_answers_pkey";

CREATE UNIQUE INDEX document_question_answers_question_key ON public.document_question_answers USING btree (question);

alter table "public"."document_question_answers" add constraint "document_question_answers_question_key" UNIQUE using index "document_question_answers_question_key";

CREATE INDEX document_question_answers_subject_idx ON public.document_question_answers USING btree (subject);

alter table "public"."document_question_answers" add constraint "document_question_answers_question_fkey" FOREIGN KEY (question) REFERENCES document_questions(uri) ON UPDATE CASCADE ON DELETE CASCADE;

alter table "public"."document_question_answers" add constraint "document_question_answers_subject_fkey" FOREIGN KEY (subject) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

grant all on table "public"."document_questions" to "anon";
grant all on table "public"."document_questions" to "authenticated";
grant all on table "public"."document_questions" to "service_role";

grant all on table "public"."document_question_answers" to "anon";
grant all on table "public"."document_question_answers" to "authenticated";
grant all on table "public"."document_question_answers" to "service_role";

