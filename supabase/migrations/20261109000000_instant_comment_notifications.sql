BEGIN;

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT notification_preferences_enabled_types_check,
  ADD CONSTRAINT notification_preferences_enabled_types_check
    CHECK (enabled_types <@ ARRAY['digest', 'comments']::text[]),
  ADD COLUMN comments_enabled_at timestamptz;

-- Update one notification type atomically without overwriting the other.
CREATE FUNCTION public.set_notification_preference(
  p_identity uuid, p_publication text, p_type text, p_frequency text
) RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE enabled boolean;
BEGIN
  IF NOT ((p_type = 'digest' AND p_frequency IN ('off', 'daily', 'weekly'))
       OR (p_type = 'comments' AND p_frequency IN ('off', 'instant'))) THEN
    RAISE EXCEPTION 'Invalid notification preference';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM publications p JOIN identities i ON i.atp_did = p.identity_did
    WHERE p.uri = p_publication AND i.id = p_identity
  ) THEN RAISE EXCEPTION 'Not publication owner'; END IF;
  enabled := p_frequency <> 'off';
  INSERT INTO notification_preferences (identity, publication, channel, enabled_types, digest_frequency, comments_enabled_at)
  VALUES (p_identity, p_publication, 'email',
    CASE WHEN enabled THEN ARRAY[p_type] ELSE '{}'::text[] END,
    CASE WHEN p_type = 'digest' AND enabled THEN p_frequency END,
    CASE WHEN p_type = 'comments' AND enabled THEN now() END)
  ON CONFLICT (identity, publication, channel) DO UPDATE SET
    enabled_types = array_remove(notification_preferences.enabled_types, p_type)
      || CASE WHEN enabled THEN ARRAY[p_type] ELSE '{}'::text[] END,
    digest_frequency = CASE WHEN p_type = 'digest' THEN excluded.digest_frequency
      ELSE notification_preferences.digest_frequency END,
    comments_enabled_at = CASE WHEN p_type <> 'comments' THEN notification_preferences.comments_enabled_at
      WHEN NOT enabled THEN NULL
      ELSE COALESCE(notification_preferences.comments_enabled_at, excluded.comments_enabled_at) END;
END;
$$;
REVOKE ALL ON FUNCTION public.set_notification_preference(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_notification_preference(uuid, text, text, text) TO service_role;

CREATE TABLE public.notification_email_deliveries (
  identity uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  publication text NOT NULL REFERENCES public.publications(uri) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type = 'comments'),
  subject_uri text NOT NULL,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed', 'uncertain')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  provider_message_id text,
  PRIMARY KEY (identity, publication, notification_type, subject_uri),
  CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);
CREATE INDEX notification_email_deliveries_publication_idx ON public.notification_email_deliveries(publication);
ALTER TABLE public.notification_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_email_deliveries FROM anon, authenticated;
GRANT ALL ON public.notification_email_deliveries TO service_role;

COMMIT;
