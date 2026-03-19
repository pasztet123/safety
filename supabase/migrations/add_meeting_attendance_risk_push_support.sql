ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS attendance_risk_push_enabled BOOLEAN NOT NULL DEFAULT false;

UPDATE public.app_settings
SET attendance_risk_push_enabled = COALESCE(attendance_risk_push_enabled, false)
WHERE id = 1;

ALTER TABLE public.meeting_attendance_risk_deliveries
  DROP CONSTRAINT IF EXISTS meeting_attendance_risk_deliveries_channel_check;

ALTER TABLE public.meeting_attendance_risk_deliveries
  ADD CONSTRAINT meeting_attendance_risk_deliveries_channel_check
  CHECK (channel IN ('email', 'in_app', 'push'));

CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_name_hint TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_push_subscriptions_endpoint_not_blank CHECK (char_length(trim(endpoint)) > 0),
  CONSTRAINT user_push_subscriptions_p256dh_not_blank CHECK (char_length(trim(p256dh)) > 0),
  CONSTRAINT user_push_subscriptions_auth_not_blank CHECK (char_length(trim(auth)) > 0),
  CONSTRAINT user_push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS user_push_subscriptions_user_idx
  ON public.user_push_subscriptions(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS user_push_subscriptions_last_seen_idx
  ON public.user_push_subscriptions(last_seen_at DESC);

CREATE OR REPLACE FUNCTION public.touch_user_push_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_push_subscriptions_touch_updated_at ON public.user_push_subscriptions;
CREATE TRIGGER user_push_subscriptions_touch_updated_at
  BEFORE UPDATE ON public.user_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_push_subscriptions_updated_at();

ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_push_subscriptions TO authenticated;

DROP POLICY IF EXISTS "user_push_subscriptions_select_own" ON public.user_push_subscriptions;
CREATE POLICY "user_push_subscriptions_select_own"
  ON public.user_push_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_push_subscriptions_insert_own" ON public.user_push_subscriptions;
CREATE POLICY "user_push_subscriptions_insert_own"
  ON public.user_push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_push_subscriptions_update_own" ON public.user_push_subscriptions;
CREATE POLICY "user_push_subscriptions_update_own"
  ON public.user_push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_push_subscriptions_delete_own" ON public.user_push_subscriptions;
CREATE POLICY "user_push_subscriptions_delete_own"
  ON public.user_push_subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);