CREATE TABLE IF NOT EXISTS public.incident_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  version_no INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  row_before JSONB,
  row_after JSONB,
  CONSTRAINT incident_history_incident_version_key UNIQUE (incident_id, version_no)
);

CREATE INDEX IF NOT EXISTS incident_history_incident_id_idx
  ON public.incident_history (incident_id, version_no DESC);

CREATE INDEX IF NOT EXISTS incident_history_changed_at_idx
  ON public.incident_history (changed_at DESC);

ALTER TABLE public.incident_history ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.incident_history FROM anon, authenticated;
GRANT SELECT ON public.incident_history TO authenticated;

DROP POLICY IF EXISTS "incident_history_superadmin_read" ON public.incident_history;
CREATE POLICY "incident_history_superadmin_read"
  ON public.incident_history
  FOR SELECT
  TO authenticated
  USING (public.is_audit_superadmin());


CREATE TABLE IF NOT EXISTS public.corrective_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrective_action_id UUID NOT NULL,
  version_no INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  row_before JSONB,
  row_after JSONB,
  CONSTRAINT corrective_action_history_version_key UNIQUE (corrective_action_id, version_no)
);

CREATE INDEX IF NOT EXISTS corrective_action_history_record_id_idx
  ON public.corrective_action_history (corrective_action_id, version_no DESC);

CREATE INDEX IF NOT EXISTS corrective_action_history_changed_at_idx
  ON public.corrective_action_history (changed_at DESC);

ALTER TABLE public.corrective_action_history ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.corrective_action_history FROM anon, authenticated;
GRANT SELECT ON public.corrective_action_history TO authenticated;

DROP POLICY IF EXISTS "corrective_action_history_superadmin_read" ON public.corrective_action_history;
CREATE POLICY "corrective_action_history_superadmin_read"
  ON public.corrective_action_history
  FOR SELECT
  TO authenticated
  USING (public.is_audit_superadmin());


CREATE TABLE IF NOT EXISTS public.checklist_completion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_completion_id UUID NOT NULL,
  version_no INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  row_before JSONB,
  row_after JSONB,
  CONSTRAINT checklist_completion_history_version_key UNIQUE (checklist_completion_id, version_no)
);

CREATE INDEX IF NOT EXISTS checklist_completion_history_record_id_idx
  ON public.checklist_completion_history (checklist_completion_id, version_no DESC);

CREATE INDEX IF NOT EXISTS checklist_completion_history_changed_at_idx
  ON public.checklist_completion_history (changed_at DESC);

ALTER TABLE public.checklist_completion_history ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.checklist_completion_history FROM anon, authenticated;
GRANT SELECT ON public.checklist_completion_history TO authenticated;

DROP POLICY IF EXISTS "checklist_completion_history_superadmin_read" ON public.checklist_completion_history;
CREATE POLICY "checklist_completion_history_superadmin_read"
  ON public.checklist_completion_history
  FOR SELECT
  TO authenticated
  USING (public.is_audit_superadmin());


CREATE OR REPLACE FUNCTION public.capture_incident_history_and_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email TEXT;
  v_incident_id UUID;
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
    v_incident_id := NEW.id;
    v_event_type := 'incident_created';
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_incident_id := NEW.id;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_event_type := 'incident_deleted';
    ELSE
      v_event_type := 'incident_updated';
    END IF;
  ELSE
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(version_no), 0) + 1
  INTO v_next_version
  FROM public.incident_history
  WHERE incident_id = v_incident_id;

  INSERT INTO public.incident_history (
    incident_id,
    version_no,
    operation,
    changed_by,
    changed_by_email,
    row_before,
    row_after
  ) VALUES (
    v_incident_id,
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
    'incidents',
    v_incident_id,
    jsonb_build_object(
      'version_no', v_next_version,
      'type_name', COALESCE(NEW.type_name, OLD.type_name),
      'employee_name', COALESCE(NEW.employee_name, OLD.employee_name),
      'date', COALESCE(NEW.date, OLD.date),
      'severity', COALESCE(NEW.severity, OLD.severity)
    )
  );

  RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION public.capture_corrective_action_history_and_audit()
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
    v_event_type := 'corrective_action_created';
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_event_type := 'corrective_action_deleted';
    ELSE
      v_event_type := 'corrective_action_updated';
    END IF;
  ELSE
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(version_no), 0) + 1
  INTO v_next_version
  FROM public.corrective_action_history
  WHERE corrective_action_id = v_record_id;

  INSERT INTO public.corrective_action_history (
    corrective_action_id,
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
    'corrective_actions',
    v_record_id,
    jsonb_build_object(
      'version_no', v_next_version,
      'incident_id', COALESCE(NEW.incident_id, OLD.incident_id),
      'status', COALESCE(NEW.status, OLD.status),
      'due_date', COALESCE(NEW.due_date, OLD.due_date),
      'description', LEFT(COALESCE(NEW.description, OLD.description, ''), 240)
    )
  );

  RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION public.capture_checklist_completion_history_and_audit()
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
    v_event_type := 'checklist_completion_created';
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_event_type := 'checklist_completion_deleted';
    ELSE
      v_event_type := 'checklist_completion_updated';
    END IF;
  ELSE
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(version_no), 0) + 1
  INTO v_next_version
  FROM public.checklist_completion_history
  WHERE checklist_completion_id = v_record_id;

  INSERT INTO public.checklist_completion_history (
    checklist_completion_id,
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
    'checklist_completions',
    v_record_id,
    jsonb_build_object(
      'version_no', v_next_version,
      'checklist_id', COALESCE(NEW.checklist_id, OLD.checklist_id),
      'project_id', COALESCE(NEW.project_id, OLD.project_id),
      'completed_by', COALESCE(NEW.completed_by, OLD.completed_by),
      'signer_name', COALESCE(NEW.signer_name, OLD.signer_name),
      'completion_datetime', COALESCE(NEW.completion_datetime, OLD.completion_datetime)
    )
  );

  RETURN NULL;
END;
$$;


DROP TRIGGER IF EXISTS incidents_history_audit_trigger ON public.incidents;
CREATE TRIGGER incidents_history_audit_trigger
  AFTER INSERT OR UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_incident_history_and_audit();

DROP TRIGGER IF EXISTS corrective_actions_history_audit_trigger ON public.corrective_actions;
CREATE TRIGGER corrective_actions_history_audit_trigger
  AFTER INSERT OR UPDATE ON public.corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_corrective_action_history_and_audit();

DROP TRIGGER IF EXISTS checklist_completions_history_audit_trigger ON public.checklist_completions;
CREATE TRIGGER checklist_completions_history_audit_trigger
  AFTER INSERT OR UPDATE ON public.checklist_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_checklist_completion_history_and_audit();