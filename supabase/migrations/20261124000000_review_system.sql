-- The review system (plans/review-system.md). Its policy runs in dry-run: it
-- records what it would decide and those proposals enforce nothing. The only
-- thing read for enforcement is review_subjects.enforced_status, set by an
-- admin's block (src/review/blocked.ts). Subjects are (kind, id) with no
-- foreign keys, so an account that owns no publication is as reviewable as
-- one that does.

-- Outbound links of every reviewed document, so signals can compare accounts.
create table "public"."document_links" (
    "document" text not null,
    "author_did" text not null,
    "domain" text not null,
    "url" text not null,
    primary key ("document", "url")
);
create index document_links_domain_idx on public.document_links using btree (domain, author_did);
create index document_links_author_idx on public.document_links using btree (author_did);

-- The current proposal for each subject: a projection of review_events.
create table "public"."review_subjects" (
    "kind" text not null,
    "id" text not null,
    "label" jsonb not null default '{}'::jsonb,
    "stats" jsonb not null default '{}'::jsonb,
    "first_seen" timestamp with time zone,
    "proposed_status" text not null default 'pending',
    "proposed_by" text,
    "policy_version" integer,
    "needs_human" boolean not null default false,
    "human_label" text,
    "evaluated_at" timestamp with time zone not null default now(),
    -- The one part that is enforced: an admin's block. Null for everything
    -- the policy has only proposed.
    "enforced_status" text,
    "enforced_at" timestamp with time zone,
    "enforced_by" uuid references identities(id) on delete set null,
    primary key ("kind", "id"),
    constraint review_subjects_enforced_status_check
        check (enforced_status in ('spam')),
    constraint review_subjects_status_check
        check (proposed_status in ('pending', 'cleared', 'held', 'spam')),
    constraint review_subjects_human_label_check
        check (human_label in ('spam', 'legit'))
);
create index review_subjects_status_idx on public.review_subjects using btree (proposed_status, evaluated_at desc);
create index review_subjects_enforced_idx on public.review_subjects using btree (id) where (enforced_status is not null);

-- Append-only: every signal value and every decision, with the versions that
-- produced them, so a later policy can be replayed against the same history.
create table "public"."review_events" (
    "id" bigint generated always as identity primary key,
    "at" timestamp with time zone not null default now(),
    "run" text not null,
    "mode" text not null default 'dry-run',
    "kind" text not null,
    "subject_id" text not null,
    "type" text not null,
    "name" text not null,
    "version" integer not null,
    "value" jsonb,
    "evidence" jsonb,
    constraint review_events_type_check check (type in ('signal', 'decision', 'human')),
    constraint review_events_mode_check check (mode in ('dry-run', 'live'))
);
create index review_events_subject_idx on public.review_events using btree (kind, subject_id, at desc);
create index review_events_name_idx on public.review_events using btree (type, name, at desc);

alter table "public"."document_links" enable row level security;
alter table "public"."review_subjects" enable row level security;
alter table "public"."review_events" enable row level security;

revoke all on table "public"."document_links" from "anon", "authenticated";
revoke all on table "public"."review_subjects" from "anon", "authenticated";
revoke all on table "public"."review_events" from "anon", "authenticated";
grant all on table "public"."document_links" to "service_role";
grant all on table "public"."review_subjects" to "service_role";
grant all on table "public"."review_events" to "service_role";
