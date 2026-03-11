CREATE TABLE IF NOT EXISTS public.meeting_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  version_no INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  row_before JSONB,
  row_after JSONB,
  CONSTRAINT meeting_history_meeting_version_key UNIQUE (meeting_id, version_no)
);

CREATE INDEX IF NOT EXISTS meeting_history_meeting_id_idx
  ON public.meeting_history (meeting_id, version_no DESC);

CREATE INDEX IF NOT EXISTS meeting_history_changed_at_idx
  ON public.meeting_history (changed_at DESC);

ALTER TABLE public.meeting_history ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.meeting_history FROM anon, authenticated;
GRANT SELECT ON public.meeting_history TO authenticated;

DROP POLICY IF EXISTS "meeting_history_superadmin_read" ON public.meeting_history;
CREATE POLICY "meeting_history_superadmin_read"
  ON public.meeting_history
  FOR SELECT
  TO authenticated
  USING (public.is_audit_superadmin());

CREATE OR REPLACE FUNCTION public.capture_meeting_history_and_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email TEXT;
  v_meeting_id UUID;
  v_next_version INTEGER;
  v_event_type TEXT;
  v_before JSONB;
  v_after JSONB;
BEGIN
  v_actor_email := COALESCE(
    NULLIF(auth.jwt() ->> 'email', ''),
    (SELECT users.email FROM public.users WHERE users.id = auth.uid())
  );

  IF TG_OP = 'INSERT' THEN
    v_meeting_id := NEW.id;
    v_event_type := 'meeting_created';
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_meeting_id := NEW.id;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_event_type := 'meeting_deleted';
    ELSE
      v_event_type := 'meeting_updated';
    END IF;
  ELSE
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(version_no), 0) + 1
  INTO v_next_version
  FROM public.meeting_history
  WHERE meeting_id = v_meeting_id;

  INSERT INTO public.meeting_history (
    meeting_id,
    version_no,
    operation,
    changed_by,
    changed_by_email,
    row_before,
    row_after
  ) VALUES (
    v_meeting_id,
    v_next_version,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'INSERT'
      WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'DELETE'
      ELSE 'UPDATE'
    END,
    auth.uid(),
    v_actor_email,
    v_before,
    v_after
  );

  PERFORM public.record_audit_event(
    v_event_type,
    'meetings',
    v_meeting_id,
    jsonb_build_object(
      'version_no', v_next_version,
      'topic', COALESCE(NEW.topic, OLD.topic),
      'date', COALESCE(NEW.date, OLD.date),
      'is_draft', COALESCE(NEW.is_draft, OLD.is_draft),
      'source', COALESCE(NEW.source, OLD.source)
    )
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS meetings_history_audit_trigger ON public.meetings;
CREATE TRIGGER meetings_history_audit_trigger
  AFTER INSERT OR UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_meeting_history_and_audit();