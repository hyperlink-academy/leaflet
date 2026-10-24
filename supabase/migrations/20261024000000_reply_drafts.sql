-- One row per draft that will be submitted as a reply when it's first
-- published: the post it answers and the reply block it was started from.
-- Keyed by the draft's edit token, like leaflets_in_publications, so a
-- duplicate of the draft starts out unlinked. identity_did is whoever linked
-- it, who alone sees it in the reply block and can withdraw it. The row goes
-- once the reply is submitted.
create table "public"."reply_drafts" (
    "leaflet" uuid not null,
    "subject" text not null,
    "block" text,
    "identity_did" text not null,
    "created_at" timestamp with time zone not null default now()
);

alter table "public"."reply_drafts" enable row level security;

CREATE UNIQUE INDEX reply_drafts_pkey ON public.reply_drafts USING btree (leaflet);

alter table "public"."reply_drafts" add constraint "reply_drafts_pkey" PRIMARY KEY using index "reply_drafts_pkey";

CREATE INDEX reply_drafts_subject_idx ON public.reply_drafts USING btree (subject);

alter table "public"."reply_drafts" add constraint "reply_drafts_leaflet_fkey" FOREIGN KEY (leaflet) REFERENCES permission_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE;

alter table "public"."reply_drafts" add constraint "reply_drafts_subject_fkey" FOREIGN KEY (subject) REFERENCES documents(uri) ON UPDATE CASCADE ON DELETE CASCADE;

alter table "public"."reply_drafts" add constraint "reply_drafts_identity_did_fkey" FOREIGN KEY (identity_did) REFERENCES identities(atp_did) ON UPDATE CASCADE ON DELETE CASCADE;

grant all on table "public"."reply_drafts" to "anon";
grant all on table "public"."reply_drafts" to "authenticated";
grant all on table "public"."reply_drafts" to "service_role";

-- Carry over the unpublished drafts linked the old ways. Publication drafts
-- kept the link on their join row; they were linked by the publication's
-- owner.
insert into "public"."reply_drafts" (leaflet, subject, block, identity_did)
select lip.leaflet, lip.reply_to, lip.reply_to_block, p.identity_did
from leaflets_in_publications lip
join publications p on p.uri = lip.publication
join documents d on d.uri = lip.reply_to
join identities i on i.atp_did = p.identity_did
where lip.reply_to is not null and lip.doc is null
on conflict (leaflet) do nothing;

-- Standalone drafts kept it as root facts; they were linked by whoever has
-- the draft on their home. One pass over facts for both attributes.
with links as materialized (
    select entity, attribute, data->>'value' as value
    from facts
    where attribute in ('root/reply-to', 'root/reply-to-block')
)
insert into "public"."reply_drafts" (leaflet, subject, block, identity_did)
select distinct on (pt.id) pt.id, link.value, block.value, i.atp_did
from links link
join permission_tokens pt on pt.root_entity = link.entity
join permission_token_on_homepage h on h.token = pt.id
join identities i on i.id = h.identity and i.atp_did is not null
join documents d on d.uri = link.value
left join links block
    on block.entity = link.entity and block.attribute = 'root/reply-to-block'
where link.attribute = 'root/reply-to'
    and not exists (
        select 1 from leaflets_to_documents ltd where ltd.leaflet = pt.id
    )
    and not exists (
        select 1 from leaflets_in_publications lip where lip.leaflet = pt.id
    )
order by pt.id, h.created_at
on conflict (leaflet) do nothing;

-- The attributes are gone from the app, which looks every fact's attribute
-- up when copying or restoring a leaflet, so the facts go too.
delete from facts where attribute in ('root/reply-to', 'root/reply-to-block');
