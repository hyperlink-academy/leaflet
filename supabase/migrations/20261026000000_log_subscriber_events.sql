-- Inserts only the events whose subscriber still exists, so a subscriber
-- deleted while a send is in flight drops out of the batch instead of failing
-- its foreign key on every retry.
create or replace function public.log_subscriber_events(p_events jsonb)
returns void
language sql
as $$
  insert into public.publication_email_subscriber_events
    (subscriber, publication, event_type, metadata)
  select e.subscriber, e.publication, e.event_type, e.metadata
  from jsonb_to_recordset(p_events)
    as e(subscriber uuid, publication text, event_type text, metadata jsonb)
  join public.publication_email_subscribers s on s.id = e.subscriber;
$$;

revoke execute on function public.log_subscriber_events(jsonb) from public, anon, authenticated;
grant execute on function public.log_subscriber_events(jsonb) to service_role;
