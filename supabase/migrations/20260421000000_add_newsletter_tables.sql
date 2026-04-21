-- Newsletter mode: four new tables and drop the legacy subscribers_to_publications.
-- See specs/2026-04-20-newsletter-mode.md.

-- Legacy table has no live rows; its writers retired with the feature branch.
drop table if exists "public"."subscribers_to_publications";


-- publication_newsletter_settings ---------------------------------------------
-- Per-publication newsletter config. Separate from publications.metadata because
-- reply_to_email has a real verification lifecycle and we want cheap queries for
-- "newsletter-enabled publications".
create table "public"."publication_newsletter_settings" (
    "publication" text not null,
    "enabled" boolean not null default false,
    "reply_to_email" text,
    "reply_to_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."publication_newsletter_settings" enable row level security;

CREATE UNIQUE INDEX publication_newsletter_settings_pkey ON public.publication_newsletter_settings USING btree (publication);
CREATE INDEX publication_newsletter_settings_enabled_idx ON public.publication_newsletter_settings USING btree (publication) WHERE enabled;

alter table "public"."publication_newsletter_settings" add constraint "publication_newsletter_settings_pkey" PRIMARY KEY using index "publication_newsletter_settings_pkey";

alter table "public"."publication_newsletter_settings" add constraint "publication_newsletter_settings_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE not valid;
alter table "public"."publication_newsletter_settings" validate constraint "publication_newsletter_settings_publication_fkey";

grant delete on table "public"."publication_newsletter_settings" to "anon";
grant insert on table "public"."publication_newsletter_settings" to "anon";
grant references on table "public"."publication_newsletter_settings" to "anon";
grant select on table "public"."publication_newsletter_settings" to "anon";
grant trigger on table "public"."publication_newsletter_settings" to "anon";
grant truncate on table "public"."publication_newsletter_settings" to "anon";
grant update on table "public"."publication_newsletter_settings" to "anon";
grant delete on table "public"."publication_newsletter_settings" to "authenticated";
grant insert on table "public"."publication_newsletter_settings" to "authenticated";
grant references on table "public"."publication_newsletter_settings" to "authenticated";
grant select on table "public"."publication_newsletter_settings" to "authenticated";
grant trigger on table "public"."publication_newsletter_settings" to "authenticated";
grant truncate on table "public"."publication_newsletter_settings" to "authenticated";
grant update on table "public"."publication_newsletter_settings" to "authenticated";
grant delete on table "public"."publication_newsletter_settings" to "service_role";
grant insert on table "public"."publication_newsletter_settings" to "service_role";
grant references on table "public"."publication_newsletter_settings" to "service_role";
grant select on table "public"."publication_newsletter_settings" to "service_role";
grant trigger on table "public"."publication_newsletter_settings" to "service_role";
grant truncate on table "public"."publication_newsletter_settings" to "service_role";
grant update on table "public"."publication_newsletter_settings" to "service_role";


-- publication_email_subscribers -----------------------------------------------
-- Per-publication email subscriber list. Handle subscriptions continue to live
-- in publication_subscriptions; cross-flow queries union the two.
create table "public"."publication_email_subscribers" (
    "id" uuid not null default gen_random_uuid(),
    "publication" text not null,
    "email" text not null,
    "identity_id" uuid,
    "state" text not null default 'pending',
    "confirmation_code" text,
    "unsubscribe_token" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "confirmed_at" timestamp with time zone,
    "unsubscribed_at" timestamp with time zone
);

alter table "public"."publication_email_subscribers" enable row level security;

CREATE UNIQUE INDEX publication_email_subscribers_pkey ON public.publication_email_subscribers USING btree (id);
CREATE UNIQUE INDEX publication_email_subscribers_publication_email_key ON public.publication_email_subscribers USING btree (publication, email);
CREATE UNIQUE INDEX publication_email_subscribers_unsubscribe_token_key ON public.publication_email_subscribers USING btree (unsubscribe_token);
CREATE INDEX publication_email_subscribers_confirmed_idx ON public.publication_email_subscribers USING btree (publication) WHERE state = 'confirmed';

alter table "public"."publication_email_subscribers" add constraint "publication_email_subscribers_pkey" PRIMARY KEY using index "publication_email_subscribers_pkey";
alter table "public"."publication_email_subscribers" add constraint "publication_email_subscribers_publication_email_key" UNIQUE using index "publication_email_subscribers_publication_email_key";
alter table "public"."publication_email_subscribers" add constraint "publication_email_subscribers_unsubscribe_token_key" UNIQUE using index "publication_email_subscribers_unsubscribe_token_key";

alter table "public"."publication_email_subscribers" add constraint "publication_email_subscribers_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE not valid;
alter table "public"."publication_email_subscribers" validate constraint "publication_email_subscribers_publication_fkey";

alter table "public"."publication_email_subscribers" add constraint "publication_email_subscribers_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE SET NULL not valid;
alter table "public"."publication_email_subscribers" validate constraint "publication_email_subscribers_identity_id_fkey";

alter table "public"."publication_email_subscribers" add constraint "publication_email_subscribers_state_check" CHECK (state IN ('pending','confirmed','unsubscribed')) not valid;
alter table "public"."publication_email_subscribers" validate constraint "publication_email_subscribers_state_check";

grant delete on table "public"."publication_email_subscribers" to "anon";
grant insert on table "public"."publication_email_subscribers" to "anon";
grant references on table "public"."publication_email_subscribers" to "anon";
grant select on table "public"."publication_email_subscribers" to "anon";
grant trigger on table "public"."publication_email_subscribers" to "anon";
grant truncate on table "public"."publication_email_subscribers" to "anon";
grant update on table "public"."publication_email_subscribers" to "anon";
grant delete on table "public"."publication_email_subscribers" to "authenticated";
grant insert on table "public"."publication_email_subscribers" to "authenticated";
grant references on table "public"."publication_email_subscribers" to "authenticated";
grant select on table "public"."publication_email_subscribers" to "authenticated";
grant trigger on table "public"."publication_email_subscribers" to "authenticated";
grant truncate on table "public"."publication_email_subscribers" to "authenticated";
grant update on table "public"."publication_email_subscribers" to "authenticated";
grant delete on table "public"."publication_email_subscribers" to "service_role";
grant insert on table "public"."publication_email_subscribers" to "service_role";
grant references on table "public"."publication_email_subscribers" to "service_role";
grant select on table "public"."publication_email_subscribers" to "service_role";
grant trigger on table "public"."publication_email_subscribers" to "service_role";
grant truncate on table "public"."publication_email_subscribers" to "service_role";
grant update on table "public"."publication_email_subscribers" to "service_role";


-- publication_email_subscriber_events -----------------------------------------
-- Append-only event log. Timestamp columns on publication_email_subscribers
-- are convenience caches derivable from this.
create table "public"."publication_email_subscriber_events" (
    "id" uuid not null default gen_random_uuid(),
    "subscriber" uuid not null,
    "publication" text not null,
    "event_type" text not null,
    "occurred_at" timestamp with time zone not null default now(),
    "metadata" jsonb
);

alter table "public"."publication_email_subscriber_events" enable row level security;

CREATE UNIQUE INDEX publication_email_subscriber_events_pkey ON public.publication_email_subscriber_events USING btree (id);
CREATE INDEX publication_email_subscriber_events_subscriber_idx ON public.publication_email_subscriber_events USING btree (subscriber, occurred_at DESC);
CREATE INDEX publication_email_subscriber_events_publication_type_idx ON public.publication_email_subscriber_events USING btree (publication, event_type, occurred_at DESC);

alter table "public"."publication_email_subscriber_events" add constraint "publication_email_subscriber_events_pkey" PRIMARY KEY using index "publication_email_subscriber_events_pkey";

alter table "public"."publication_email_subscriber_events" add constraint "publication_email_subscriber_events_subscriber_fkey" FOREIGN KEY (subscriber) REFERENCES publication_email_subscribers(id) ON DELETE CASCADE not valid;
alter table "public"."publication_email_subscriber_events" validate constraint "publication_email_subscriber_events_subscriber_fkey";

alter table "public"."publication_email_subscriber_events" add constraint "publication_email_subscriber_events_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE not valid;
alter table "public"."publication_email_subscriber_events" validate constraint "publication_email_subscriber_events_publication_fkey";

alter table "public"."publication_email_subscriber_events" add constraint "publication_email_subscriber_events_event_type_check" CHECK (event_type IN ('subscribe_requested','confirmation_sent','confirmed','unsubscribe_requested','resubscribed','post_sent','bounce','complaint')) not valid;
alter table "public"."publication_email_subscriber_events" validate constraint "publication_email_subscriber_events_event_type_check";

grant delete on table "public"."publication_email_subscriber_events" to "anon";
grant insert on table "public"."publication_email_subscriber_events" to "anon";
grant references on table "public"."publication_email_subscriber_events" to "anon";
grant select on table "public"."publication_email_subscriber_events" to "anon";
grant trigger on table "public"."publication_email_subscriber_events" to "anon";
grant truncate on table "public"."publication_email_subscriber_events" to "anon";
grant update on table "public"."publication_email_subscriber_events" to "anon";
grant delete on table "public"."publication_email_subscriber_events" to "authenticated";
grant insert on table "public"."publication_email_subscriber_events" to "authenticated";
grant references on table "public"."publication_email_subscriber_events" to "authenticated";
grant select on table "public"."publication_email_subscriber_events" to "authenticated";
grant trigger on table "public"."publication_email_subscriber_events" to "authenticated";
grant truncate on table "public"."publication_email_subscriber_events" to "authenticated";
grant update on table "public"."publication_email_subscriber_events" to "authenticated";
grant delete on table "public"."publication_email_subscriber_events" to "service_role";
grant insert on table "public"."publication_email_subscriber_events" to "service_role";
grant references on table "public"."publication_email_subscriber_events" to "service_role";
grant select on table "public"."publication_email_subscriber_events" to "service_role";
grant trigger on table "public"."publication_email_subscriber_events" to "service_role";
grant truncate on table "public"."publication_email_subscriber_events" to "service_role";
grant update on table "public"."publication_email_subscriber_events" to "service_role";


-- publication_post_sends ------------------------------------------------------
-- One row per (publication, document). Primary job is idempotency: publish
-- inserts with ON CONFLICT DO NOTHING before firing a send.
create table "public"."publication_post_sends" (
    "publication" text not null,
    "document" text not null,
    "status" text not null default 'pending',
    "subscriber_count" integer,
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "error" text
);

alter table "public"."publication_post_sends" enable row level security;

CREATE UNIQUE INDEX publication_post_sends_pkey ON public.publication_post_sends USING btree (publication, document);
CREATE INDEX publication_post_sends_publication_started_idx ON public.publication_post_sends USING btree (publication, started_at DESC);

alter table "public"."publication_post_sends" add constraint "publication_post_sends_pkey" PRIMARY KEY using index "publication_post_sends_pkey";

alter table "public"."publication_post_sends" add constraint "publication_post_sends_publication_fkey" FOREIGN KEY (publication) REFERENCES publications(uri) ON DELETE CASCADE not valid;
alter table "public"."publication_post_sends" validate constraint "publication_post_sends_publication_fkey";

alter table "public"."publication_post_sends" add constraint "publication_post_sends_document_fkey" FOREIGN KEY (document) REFERENCES documents(uri) ON DELETE CASCADE not valid;
alter table "public"."publication_post_sends" validate constraint "publication_post_sends_document_fkey";

alter table "public"."publication_post_sends" add constraint "publication_post_sends_status_check" CHECK (status IN ('pending','sending','sent','failed')) not valid;
alter table "public"."publication_post_sends" validate constraint "publication_post_sends_status_check";

grant delete on table "public"."publication_post_sends" to "anon";
grant insert on table "public"."publication_post_sends" to "anon";
grant references on table "public"."publication_post_sends" to "anon";
grant select on table "public"."publication_post_sends" to "anon";
grant trigger on table "public"."publication_post_sends" to "anon";
grant truncate on table "public"."publication_post_sends" to "anon";
grant update on table "public"."publication_post_sends" to "anon";
grant delete on table "public"."publication_post_sends" to "authenticated";
grant insert on table "public"."publication_post_sends" to "authenticated";
grant references on table "public"."publication_post_sends" to "authenticated";
grant select on table "public"."publication_post_sends" to "authenticated";
grant trigger on table "public"."publication_post_sends" to "authenticated";
grant truncate on table "public"."publication_post_sends" to "authenticated";
grant update on table "public"."publication_post_sends" to "authenticated";
grant delete on table "public"."publication_post_sends" to "service_role";
grant insert on table "public"."publication_post_sends" to "service_role";
grant references on table "public"."publication_post_sends" to "service_role";
grant select on table "public"."publication_post_sends" to "service_role";
grant trigger on table "public"."publication_post_sends" to "service_role";
grant truncate on table "public"."publication_post_sends" to "service_role";
grant update on table "public"."publication_post_sends" to "service_role";
