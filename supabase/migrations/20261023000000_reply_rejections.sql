-- One row per reply the subject's author rejected. Unlike acceptance this
-- lives only here, not in the author's repo. A rejected reply is shown to no
-- one, and the row goes with the reply when it's withdrawn.
create table "public"."document_reply_rejections" (
    "reply" text not null,
    "subject" text not null,
    "rejected_at" timestamp with time zone not null default now()
);

alter table "public"."document_reply_rejections" enable row level security;

CREATE UNIQUE INDEX document_reply_rejections_pkey ON public.document_reply_rejections USING btree (reply);

alter table "public"."document_reply_rejections" add constraint "document_reply_rejections_pkey" PRIMARY KEY using index "document_reply_rejections_pkey";

CREATE INDEX document_reply_rejections_subject_idx ON public.document_reply_rejections USING btree (subject);

alter table "public"."document_reply_rejections" add constraint "document_reply_rejections_reply_fkey" FOREIGN KEY (reply) REFERENCES document_replies(uri) ON UPDATE CASCADE ON DELETE CASCADE;

alter table "public"."document_reply_rejections" add constraint "document_reply_rejections_subject_fkey" FOREIGN KEY (subject) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

grant all on table "public"."document_reply_rejections" to "anon";
grant all on table "public"."document_reply_rejections" to "authenticated";
grant all on table "public"."document_reply_rejections" to "service_role";
