BEGIN;

CREATE TABLE public.notification_preferences (
  identity uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  publication text NOT NULL REFERENCES public.publications(uri) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
  enabled_types text[] NOT NULL DEFAULT '{}',
  digest_frequency text CHECK (digest_frequency IN ('daily', 'weekly')),
  comments_enabled_at timestamptz,
  digest_next_at timestamptz,
  PRIMARY KEY (identity, publication, channel),
  CHECK (enabled_types <@ ARRAY['digest', 'comments']::text[]),
  CHECK (array_position(enabled_types, NULL) IS NULL),
  CHECK (('digest' = ANY(enabled_types)) = (digest_frequency IS NOT NULL))
);
CREATE INDEX notification_preferences_publication_idx ON public.notification_preferences(publication);

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

-- A changed frequency restarts the schedule; the hourly cron sets the next run.
CREATE FUNCTION public.reset_digest_next_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.digest_frequency IS DISTINCT FROM OLD.digest_frequency THEN
    NEW.digest_next_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_digest_next_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reset_digest_next_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.reset_digest_next_at();

-- One row per delivery. A worker claims a delivery by INSERT before sending, so
-- a repeated send of the same delivery_key conflicts instead of emailing twice.
CREATE TABLE public.notification_history (
  identity uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  publication text NOT NULL REFERENCES public.publications(uri) ON DELETE CASCADE,
  channel text NOT NULL CHECK (btrim(channel) <> ''),
  notification_type text NOT NULL CHECK (btrim(notification_type) <> ''),
  mode text NOT NULL DEFAULT 'live' CHECK (mode IN ('live', 'test')),
  delivery_key text NOT NULL,
  subject_uri text,
  period_start timestamptz,
  period_end timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'uncertain', 'skipped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  provider_message_id text,
  PRIMARY KEY (identity, publication, channel, delivery_key),
  CHECK ((period_start IS NULL) = (period_end IS NULL)),
  CHECK (period_end > period_start),
  CHECK (notification_type <> 'digest' OR period_start IS NOT NULL),
  CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);
CREATE INDEX notification_history_publication_idx ON public.notification_history(publication);
CREATE INDEX notification_history_digest_period_idx ON public.notification_history
  (identity, publication, channel, notification_type, mode, period_end DESC);

-- Coarse opt-in check run before queueing a comment email, so comments nobody
-- asked to be emailed about never reach the queue. The sender rechecks recipients.
CREATE FUNCTION public.has_comment_email_recipients(p_comment_uri text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM comments_on_documents c
    JOIN documents_in_publications dip ON dip.document = c.document
    JOIN notification_preferences pref
      ON pref.publication = dip.publication AND pref.channel = 'email'
    WHERE c.uri = p_comment_uri AND 'comments' = ANY(pref.enabled_types)
  );
$$;
REVOKE ALL ON FUNCTION public.has_comment_email_recipients(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_comment_email_recipients(text) TO service_role;

-- Leaflet authenticates with its own cookies; only authorized server actions
-- use the service role. Browser Supabase roles have no direct access.
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_preferences, public.notification_history FROM anon, authenticated;
GRANT ALL ON public.notification_preferences, public.notification_history TO service_role;

COMMIT;
