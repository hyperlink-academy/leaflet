BEGIN;

ALTER TABLE public.notification_preferences
  ADD COLUMN digest_next_at timestamptz;

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

-- Historical deliveries are manual tests; they must not affect automatic mail.
ALTER TABLE public.notification_digests
  ADD COLUMN mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'scheduled')),
  DROP CONSTRAINT notification_digests_status_check,
  ADD CONSTRAINT notification_digests_status_check CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  DROP CONSTRAINT notification_digests_pkey,
  ADD PRIMARY KEY (identity, publication, mode, period_start, period_end);

COMMIT;
