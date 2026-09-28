alter table "public"."publication_email_subscriber_events"
  drop constraint "publication_email_subscriber_events_event_type_check";
alter table "public"."publication_email_subscriber_events"
  add constraint "publication_email_subscriber_events_event_type_check"
  CHECK (event_type IN ('subscribe_requested','confirmation_sent','confirmed','unsubscribe_requested','resubscribed','post_sent','send_failed','bounce','complaint')) not valid;
alter table "public"."publication_email_subscriber_events"
  validate constraint "publication_email_subscriber_events_event_type_check";
