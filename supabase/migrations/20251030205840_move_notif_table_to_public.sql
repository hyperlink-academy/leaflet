create table "public"."notif_comments" (
    "comment" text not null,
    "created_at" timestamp with time zone not null default now(),
    "identity" uuid not null,
    "reason" text not null,
    "read" boolean not null default false
);


alter table "public"."notif_comments" enable row level security;

CREATE UNIQUE INDEX notif_comments_pkey ON public.notif_comments USING btree (comment, identity);

alter table "public"."notif_comments" add constraint "notif_comments_pkey" PRIMARY KEY using index "notif_comments_pkey";

alter table "public"."notif_comments" add constraint "notif_comments_comment_fkey" FOREIGN KEY (comment) REFERENCES comments_on_documents(uri) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."notif_comments" validate constraint "notif_comments_comment_fkey";

alter table "public"."notif_comments" add constraint "notif_comments_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."notif_comments" validate constraint "notif_comments_identity_fkey";

grant delete on table "public"."notif_comments" to "anon";

grant insert on table "public"."notif_comments" to "anon";

grant references on table "public"."notif_comments" to "anon";

grant select on table "public"."notif_comments" to "anon";

grant trigger on table "public"."notif_comments" to "anon";

grant truncate on table "public"."notif_comments" to "anon";

grant update on table "public"."notif_comments" to "anon";

grant delete on table "public"."notif_comments" to "authenticated";

grant insert on table "public"."notif_comments" to "authenticated";

grant references on table "public"."notif_comments" to "authenticated";

grant select on table "public"."notif_comments" to "authenticated";

grant trigger on table "public"."notif_comments" to "authenticated";

grant truncate on table "public"."notif_comments" to "authenticated";

grant update on table "public"."notif_comments" to "authenticated";

grant delete on table "public"."notif_comments" to "service_role";

grant insert on table "public"."notif_comments" to "service_role";

grant references on table "public"."notif_comments" to "service_role";

grant select on table "public"."notif_comments" to "service_role";

grant trigger on table "public"."notif_comments" to "service_role";

grant truncate on table "public"."notif_comments" to "service_role";

grant update on table "public"."notif_comments" to "service_role";

drop table "notifications"."comment_notifications";
drop schema if exists "notifications";
