CREATE TABLE IF NOT EXISTS public.safety_survey_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safety_survey_id UUID NOT NULL,
  version_no INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  row_before JSONB,
  row_after JSONB,
  CONSTRAINT safety_survey_history_record_version_key UNIQUE (safety_survey_id, version_no)
);

CREATE INDEX IF NOT EXISTS safety_survey_history_record_id_idx
  ON public.safety_survey_history (safety_survey_id, version_no DESC);

CREATE INDEX IF NOT EXISTS safety_survey_history_changed_at_idx
  ON public.safety_survey_history (changed_at DESC);

ALTER TABLE public.safety_survey_history ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.safety_survey_history FROM anon, authenticated;
GRANT SELECT ON public.safety_survey_history TO authenticated;

DROP POLICY IF EXISTS "safety_survey_history_superadmin_read" ON public.safety_survey_history;
CREATE POLICY "safety_survey_history_superadmin_read"
  ON public.safety_survey_history
  FOR SELECT
  TO authenticated
  USING (public.is_audit_superadmin());

CREATE OR REPLACE FUNCTION public.capture_safety_survey_history_and_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email TEXT;
  v_record_id UUID;
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
    v_record_id := NEW.id;
    v_event_type := 'safety_survey_created';
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_event_type := 'safety_survey_deleted';
    ELSE
      v_event_type := 'safety_survey_updated';
    END IF;
  ELSE
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(version_no), 0) + 1
  INTO v_next_version
  FROM public.safety_survey_history
  WHERE safety_survey_id = v_record_id;

  INSERT INTO public.safety_survey_history (
    safety_survey_id,
    version_no,
    operation,
    changed_by,
    changed_by_email,
    row_before,
    row_after
  ) VALUES (
    v_record_id,
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
    'safety_surveys',
    v_record_id,
    jsonb_build_object(
      'version_no', v_next_version,
      'survey_title', COALESCE(NEW.survey_title, OLD.survey_title),
      'survey_date', COALESCE(NEW.survey_date, OLD.survey_date),
      'project_address', COALESCE(NEW.project_address, OLD.project_address),
      'responsible_person_name', COALESCE(NEW.responsible_person_name, OLD.responsible_person_name)
    )
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS safety_surveys_history_audit_trigger ON public.safety_surveys;
CREATE TRIGGER safety_surveys_history_audit_trigger
  AFTER INSERT OR UPDATE ON public.safety_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_safety_survey_history_and_audit();