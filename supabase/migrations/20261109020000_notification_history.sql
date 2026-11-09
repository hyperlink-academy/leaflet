BEGIN;

-- Pause email workers while applying this migration and deploying the new writers.
LOCK TABLE public.notification_digests, public.notification_email_deliveries IN ACCESS EXCLUSIVE MODE;

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
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_history FROM anon, authenticated;
GRANT ALL ON public.notification_history TO service_role;

-- Keep every delivery and cutoff; the channel/type/mode keep histories independent.
INSERT INTO public.notification_history (
  identity, publication, channel, notification_type, mode, delivery_key,
  period_start, period_end, status, created_at, sent_at
)
SELECT identity, publication, 'email', 'digest',
  CASE mode WHEN 'scheduled' THEN 'live' ELSE 'test' END,
  'digest:' || CASE mode WHEN 'scheduled' THEN 'live' ELSE 'test' END || ':' ||
    to_char(period_start AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || ':' ||
    to_char(period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  period_start, period_end, status, COALESCE(sent_at, period_end), sent_at
FROM public.notification_digests;

INSERT INTO public.notification_history (
  identity, publication, channel, notification_type, delivery_key, subject_uri,
  status, created_at, sent_at, provider_message_id
)
SELECT identity, publication, 'email', notification_type,
  notification_type || ':live:' || subject_uri, subject_uri,
  CASE status WHEN 'sending' THEN 'pending' ELSE status END,
  created_at, sent_at, provider_message_id
FROM public.notification_email_deliveries;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.notification_history) <>
     (SELECT count(*) FROM public.notification_digests) +
     (SELECT count(*) FROM public.notification_email_deliveries) THEN
    RAISE EXCEPTION 'Notification history backfill count mismatch';
  END IF;
END $$;

DROP TABLE public.notification_digests;
DROP TABLE public.notification_email_deliveries;

COMMIT;
