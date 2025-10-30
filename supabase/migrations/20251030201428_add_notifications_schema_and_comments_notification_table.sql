create schema if not exists "notifications";

create table "notifications"."comment_notifications" (
    "comment" text not null,
    "created_at" timestamp with time zone not null default now(),
    "identity" uuid not null,
    "reason" text not null,
    "read" boolean not null default false
);


alter table "notifications"."comment_notifications" enable row level security;

CREATE UNIQUE INDEX comment_notifications_pkey ON notifications.comment_notifications USING btree (comment, identity);

alter table "notifications"."comment_notifications" add constraint "comment_notifications_pkey" PRIMARY KEY using index "comment_notifications_pkey";

alter table "notifications"."comment_notifications" add constraint "comment_notifications_comment_fkey" FOREIGN KEY (comment) REFERENCES comments_on_documents(uri) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "notifications"."comment_notifications" validate constraint "comment_notifications_comment_fkey";

alter table "notifications"."comment_notifications" add constraint "comment_notifications_identity_fkey" FOREIGN KEY (identity) REFERENCES identities(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "notifications"."comment_notifications" validate constraint "comment_notifications_identity_fkey";
