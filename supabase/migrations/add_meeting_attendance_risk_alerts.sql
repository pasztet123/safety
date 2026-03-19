ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS attendance_risk_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attendance_risk_email_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_risk_in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_risk_run_hour INTEGER NOT NULL DEFAULT 10;

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_attendance_risk_run_hour_range;

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_attendance_risk_run_hour_range
  CHECK (attendance_risk_run_hour >= 0 AND attendance_risk_run_hour <= 23);

UPDATE public.app_settings
SET
  attendance_risk_notifications_enabled = COALESCE(attendance_risk_notifications_enabled, false),
  attendance_risk_email_enabled = COALESCE(attendance_risk_email_enabled, true),
  attendance_risk_in_app_enabled = COALESCE(attendance_risk_in_app_enabled, true),
  attendance_risk_run_hour = COALESCE(attendance_risk_run_hour, 10)
WHERE id = 1;

CREATE TABLE IF NOT EXISTS public.meeting_attendance_risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_date DATE NOT NULL,
  subject_key TEXT NOT NULL,
  person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL,
  normalized_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  days_without_meeting INTEGER NOT NULL DEFAULT 1,
  latest_meeting_at TIMESTAMPTZ,
  latest_meeting_date DATE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acked', 'resolved')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ack_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_reason TEXT,
  evaluation_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT meeting_attendance_risk_alerts_subject_key_not_blank CHECK (char_length(trim(subject_key)) > 0),
  CONSTRAINT meeting_attendance_risk_alerts_normalized_name_not_blank CHECK (char_length(trim(normalized_name)) > 0),
  CONSTRAINT meeting_attendance_risk_alerts_display_name_not_blank CHECK (char_length(trim(display_name)) > 0),
  CONSTRAINT meeting_attendance_risk_alerts_days_without_meeting_positive CHECK (days_without_meeting >= 1),
  CONSTRAINT meeting_attendance_risk_alerts_unique_day_subject UNIQUE (alert_date, subject_key)
);

CREATE INDEX IF NOT EXISTS meeting_attendance_risk_alerts_alert_date_idx
  ON public.meeting_attendance_risk_alerts(alert_date DESC);

CREATE INDEX IF NOT EXISTS meeting_attendance_risk_alerts_status_idx
  ON public.meeting_attendance_risk_alerts(status);

CREATE INDEX IF NOT EXISTS meeting_attendance_risk_alerts_profile_idx
  ON public.meeting_attendance_risk_alerts(person_profile_id);

CREATE INDEX IF NOT EXISTS meeting_attendance_risk_alerts_name_idx
  ON public.meeting_attendance_risk_alerts(normalized_name);

CREATE TABLE IF NOT EXISTS public.meeting_attendance_risk_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.meeting_attendance_risk_alerts(id) ON DELETE CASCADE,
  delivery_scope TEXT NOT NULL DEFAULT 'alert'
    CHECK (delivery_scope IN ('alert', 'digest')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app')),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email_snapshot TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS meeting_attendance_risk_deliveries_alert_idx
  ON public.meeting_attendance_risk_deliveries(alert_id);

CREATE INDEX IF NOT EXISTS meeting_attendance_risk_deliveries_channel_idx
  ON public.meeting_attendance_risk_deliveries(channel, status);

CREATE INDEX IF NOT EXISTS meeting_attendance_risk_deliveries_recipient_idx
  ON public.meeting_attendance_risk_deliveries(recipient_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_meeting_attendance_risk_alerts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meeting_attendance_risk_alerts_touch_updated_at ON public.meeting_attendance_risk_alerts;
CREATE TRIGGER meeting_attendance_risk_alerts_touch_updated_at
  BEFORE UPDATE ON public.meeting_attendance_risk_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_meeting_attendance_risk_alerts_updated_at();

ALTER TABLE public.meeting_attendance_risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance_risk_deliveries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.meeting_attendance_risk_alerts TO authenticated;
GRANT SELECT ON public.meeting_attendance_risk_deliveries TO authenticated;

DROP POLICY IF EXISTS "meeting_attendance_risk_alerts_select_admin" ON public.meeting_attendance_risk_alerts;
CREATE POLICY "meeting_attendance_risk_alerts_select_admin"
  ON public.meeting_attendance_risk_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.is_admin = true
        AND users.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "meeting_attendance_risk_alerts_update_admin" ON public.meeting_attendance_risk_alerts;
CREATE POLICY "meeting_attendance_risk_alerts_update_admin"
  ON public.meeting_attendance_risk_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.is_admin = true
        AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.is_admin = true
        AND users.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "meeting_attendance_risk_deliveries_select_admin" ON public.meeting_attendance_risk_deliveries;
CREATE POLICY "meeting_attendance_risk_deliveries_select_admin"
  ON public.meeting_attendance_risk_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.is_admin = true
        AND users.deleted_at IS NULL
    )
  );