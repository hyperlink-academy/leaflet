BEGIN;

CREATE TABLE public.notification_preferences (
  identity uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  publication text NOT NULL REFERENCES public.publications(uri) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
  enabled_types text[] NOT NULL DEFAULT '{}',
  digest_frequency text CHECK (digest_frequency IN ('daily', 'weekly')),
  PRIMARY KEY (identity, publication, channel),
  CHECK (enabled_types <@ ARRAY['digest']::text[]),
  CHECK (array_position(enabled_types, NULL) IS NULL),
  CHECK (('digest' = ANY(enabled_types)) = (digest_frequency IS NOT NULL))
);
CREATE INDEX notification_preferences_publication_idx ON public.notification_preferences(publication);

-- A worker must claim a period with INSERT before sending; concurrent claims
-- conflict on the primary key. Provider idempotency is still needed for retries.
CREATE TABLE public.notification_digests (
  identity uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  publication text NOT NULL REFERENCES public.publications(uri) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  PRIMARY KEY (identity, publication, period_start, period_end),
  CHECK (period_end > period_start),
  CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);
CREATE INDEX notification_digests_publication_idx ON public.notification_digests(publication);

-- Leaflet authenticates with its own cookies; only authorized server actions
-- use the service role. Browser Supabase roles have no direct access.
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_digests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_preferences, public.notification_digests FROM anon, authenticated;
GRANT ALL ON public.notification_preferences, public.notification_digests TO service_role;

COMMIT;
