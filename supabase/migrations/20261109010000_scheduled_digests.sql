BEGIN;

ALTER TABLE public.notification_preferences
  ADD COLUMN digest_schedule_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN digest_next_at timestamptz;

-- Cancel sleeping jobs as soon as the frequency changes, including Off.
CREATE FUNCTION public.invalidate_digest_schedule() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.digest_frequency IS DISTINCT FROM OLD.digest_frequency THEN
    NEW.digest_schedule_id := gen_random_uuid();
    NEW.digest_next_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.invalidate_digest_schedule() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER invalidate_digest_schedule
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_digest_schedule();

-- Historical deliveries are manual tests; they must not affect automatic mail.
ALTER TABLE public.notification_digests
  ADD COLUMN mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'scheduled')),
  DROP CONSTRAINT notification_digests_status_check,
  ADD CONSTRAINT notification_digests_status_check CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  DROP CONSTRAINT notification_digests_pkey,
  ADD PRIMARY KEY (identity, publication, mode, period_start, period_end);

COMMIT;
