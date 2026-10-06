-- One row per pub.leaflet.interactions.reply record: a reader submitting one
-- of their own documents (`document`) as a reply to another (`subject`).
create table "public"."document_replies" (
    "uri" text not null,
    "subject" text not null,
    "document" text not null,
    "replier_did" text not null,
    "record" jsonb not null,
    "indexed_at" timestamp with time zone not null default now()
);

alter table "public"."document_replies" enable row level security;

CREATE UNIQUE INDEX document_replies_pkey ON public.document_replies USING btree (uri);

alter table "public"."document_replies" add constraint "document_replies_pkey" PRIMARY KEY using index "document_replies_pkey";

CREATE UNIQUE INDEX document_replies_subject_document_key ON public.document_replies USING btree (subject, document);

alter table "public"."document_replies" add constraint "document_replies_subject_document_key" UNIQUE using index "document_replies_subject_document_key";

CREATE INDEX document_replies_document_idx ON public.document_replies USING btree (document);

alter table "public"."document_replies" add constraint "document_replies_subject_fkey" FOREIGN KEY (subject) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

alter table "public"."document_replies" add constraint "document_replies_document_fkey" FOREIGN KEY (document) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

-- One row per allowed reply, exploded from the subject author's
-- pub.leaflet.interactions.replyVisibility record (`uri`). `reply` is the
-- at-uri of a pub.leaflet.interactions.reply record; it carries no foreign
-- key so an allow-list entry survives the reply being indexed after it.
create table "public"."document_reply_visibility" (
    "uri" text not null,
    "subject" text not null,
    "reply" text not null,
    "indexed_at" timestamp with time zone not null default now()
);

alter table "public"."document_reply_visibility" enable row level security;

CREATE UNIQUE INDEX document_reply_visibility_pkey ON public.document_reply_visibility USING btree (subject, reply);

alter table "public"."document_reply_visibility" add constraint "document_reply_visibility_pkey" PRIMARY KEY using index "document_reply_visibility_pkey";

CREATE INDEX document_reply_visibility_uri_idx ON public.document_reply_visibility USING btree (uri);

alter table "public"."document_reply_visibility" add constraint "document_reply_visibility_subject_fkey" FOREIGN KEY (subject) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

grant all on table "public"."document_replies" to "anon";
grant all on table "public"."document_replies" to "authenticated";
grant all on table "public"."document_replies" to "service_role";

grant all on table "public"."document_reply_visibility" to "anon";
grant all on table "public"."document_reply_visibility" to "authenticated";
grant all on table "public"."document_reply_visibility" to "service_role";
