CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS audit_events_created_at_idx
  ON public.audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_event_type_idx
  ON public.audit_events (event_type);

CREATE INDEX IF NOT EXISTS audit_events_table_record_idx
  ON public.audit_events (table_name, record_id);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.audit_events FROM anon, authenticated;
GRANT SELECT ON public.audit_events TO authenticated;

CREATE OR REPLACE FUNCTION public.record_audit_event(
  p_event_type TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID := gen_random_uuid();
  v_actor_email TEXT;
BEGIN
  v_actor_email := COALESCE(
    NULLIF(auth.jwt() ->> 'email', ''),
    (SELECT users.email FROM public.users WHERE users.id = auth.uid())
  );

  INSERT INTO public.audit_events (
    id,
    event_type,
    table_name,
    record_id,
    actor_user_id,
    actor_email,
    metadata
  ) VALUES (
    v_event_id,
    p_event_type,
    p_table_name,
    p_record_id,
    auth.uid(),
    v_actor_email,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_audit_event(TEXT, TEXT, UUID, JSONB) TO authenticated;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.checklist_completions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.corrective_actions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.disciplinary_actions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.leaders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.involved_persons
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_audit_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.email = 'stas@abmdistributing.com'
      AND users.deleted_at IS NULL
  );
$$;

DROP POLICY IF EXISTS "audit_events_superadmin_read" ON public.audit_events;
CREATE POLICY "audit_events_superadmin_read"
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (public.is_audit_superadmin());

CREATE INDEX IF NOT EXISTS meetings_deleted_at_idx ON public.meetings (deleted_at);
CREATE INDEX IF NOT EXISTS incidents_deleted_at_idx ON public.incidents (deleted_at);
CREATE INDEX IF NOT EXISTS checklist_completions_deleted_at_idx ON public.checklist_completions (deleted_at);
CREATE INDEX IF NOT EXISTS corrective_actions_deleted_at_idx ON public.corrective_actions (deleted_at);
CREATE INDEX IF NOT EXISTS disciplinary_actions_deleted_at_idx ON public.disciplinary_actions (deleted_at);
CREATE INDEX IF NOT EXISTS leaders_deleted_at_idx ON public.leaders (deleted_at);
CREATE INDEX IF NOT EXISTS involved_persons_deleted_at_idx ON public.involved_persons (deleted_at);
CREATE INDEX IF NOT EXISTS companies_deleted_at_idx ON public.companies (deleted_at);
CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON public.users (deleted_at);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meetings_select_active" ON public.meetings;
CREATE POLICY "meetings_select_active"
  ON public.meetings
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "meetings_insert_authenticated" ON public.meetings;
CREATE POLICY "meetings_insert_authenticated"
  ON public.meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "meetings_update_active" ON public.meetings;
CREATE POLICY "meetings_update_active"
  ON public.meetings
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL OR deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "meetings_delete_active" ON public.meetings;
CREATE POLICY "meetings_delete_active"
  ON public.meetings
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "incidents_select_active" ON public.incidents;
CREATE POLICY "incidents_select_active"
  ON public.incidents
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "incidents_insert_authenticated" ON public.incidents;
CREATE POLICY "incidents_insert_authenticated"
  ON public.incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "incidents_update_active" ON public.incidents;
CREATE POLICY "incidents_update_active"
  ON public.incidents
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL OR deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "incidents_delete_active" ON public.incidents;
CREATE POLICY "incidents_delete_active"
  ON public.incidents
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "checklist_completions_select_active" ON public.checklist_completions;
CREATE POLICY "checklist_completions_select_active"
  ON public.checklist_completions
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "checklist_completions_insert_authenticated" ON public.checklist_completions;
CREATE POLICY "checklist_completions_insert_authenticated"
  ON public.checklist_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "checklist_completions_update_active" ON public.checklist_completions;
CREATE POLICY "checklist_completions_update_active"
  ON public.checklist_completions
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL OR deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "checklist_completions_delete_active" ON public.checklist_completions;
CREATE POLICY "checklist_completions_delete_active"
  ON public.checklist_completions
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "leaders_select_active" ON public.leaders;
CREATE POLICY "leaders_select_active"
  ON public.leaders
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "leaders_insert_authenticated" ON public.leaders;
CREATE POLICY "leaders_insert_authenticated"
  ON public.leaders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "leaders_update_active" ON public.leaders;
CREATE POLICY "leaders_update_active"
  ON public.leaders
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL OR deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "leaders_delete_active" ON public.leaders;
CREATE POLICY "leaders_delete_active"
  ON public.leaders
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "companies_select_active" ON public.companies;
CREATE POLICY "companies_select_active"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "companies_insert_authenticated" ON public.companies;
CREATE POLICY "companies_insert_authenticated"
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "companies_update_active" ON public.companies;
CREATE POLICY "companies_update_active"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL OR deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "companies_delete_active" ON public.companies;
CREATE POLICY "companies_delete_active"
  ON public.companies
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "users_select_active" ON public.users;
CREATE POLICY "users_select_active"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "users_insert_authenticated" ON public.users;
CREATE POLICY "users_insert_authenticated"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "users_update_active" ON public.users;
CREATE POLICY "users_update_active"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL OR deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "users_delete_active" ON public.users;
CREATE POLICY "users_delete_active"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "corrective_actions_select_active_only" ON public.corrective_actions;
CREATE POLICY "corrective_actions_select_active_only"
  ON public.corrective_actions
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "corrective_actions_update_active_only" ON public.corrective_actions;
CREATE POLICY "corrective_actions_update_active_only"
  ON public.corrective_actions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "corrective_actions_delete_active_only" ON public.corrective_actions;
CREATE POLICY "corrective_actions_delete_active_only"
  ON public.corrective_actions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "disciplinary_actions_select_active_only" ON public.disciplinary_actions;
CREATE POLICY "disciplinary_actions_select_active_only"
  ON public.disciplinary_actions
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "disciplinary_actions_update_active_only" ON public.disciplinary_actions;
CREATE POLICY "disciplinary_actions_update_active_only"
  ON public.disciplinary_actions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "disciplinary_actions_delete_active_only" ON public.disciplinary_actions;
CREATE POLICY "disciplinary_actions_delete_active_only"
  ON public.disciplinary_actions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "involved_persons_select_active_only" ON public.involved_persons;
CREATE POLICY "involved_persons_select_active_only"
  ON public.involved_persons
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "involved_persons_update_active_only" ON public.involved_persons;
CREATE POLICY "involved_persons_update_active_only"
  ON public.involved_persons
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "involved_persons_delete_active_only" ON public.involved_persons;
CREATE POLICY "involved_persons_delete_active_only"
  ON public.involved_persons
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

CREATE OR REPLACE FUNCTION public.soft_delete_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  IF OLD.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  v_record_id := OLD.id;

  EXECUTE format(
    'UPDATE %I.%I SET deleted_at = timezone(''utc''::text, now()), deleted_by = $1 WHERE id = $2',
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME
  )
  USING auth.uid(), v_record_id;

  BEGIN
    PERFORM public.record_audit_event(
      'soft_delete',
      TG_TABLE_NAME,
      v_record_id,
      jsonb_build_object('deleted_by', auth.uid())
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS meetings_soft_delete_trigger ON public.meetings;
CREATE TRIGGER meetings_soft_delete_trigger
  BEFORE DELETE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.soft_delete_row();

DROP TRIGGER IF EXISTS incidents_soft_delete_trigger ON public.incidents;
CREATE TRIGGER incidents_soft_delete_trigger
  BEFORE DELETE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.soft_delete_row();

DROP TRIGGER IF EXISTS checklist_completions_soft_delete_trigger ON public.checklist_completions;
CREATE TRIGGER checklist_completions_soft_delete_trigger
  BEFORE DELETE ON public.checklist_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.soft_delete_row();

DROP TRIGGER IF EXISTS corrective_actions_soft_delete_trigger ON public.corrective_actions;
CREATE TRIGGER corrective_actions_soft_delete_trigger
  BEFORE DELETE ON public.corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.soft_delete_row();

DROP TRIGGER IF EXISTS disciplinary_actions_soft_delete_trigger ON public.disciplinary_actions;
CREATE TRIGGER disciplinary_actions_soft_delete_trigger
  BEFORE DELETE ON public.disciplinary_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.soft_delete_row();

DROP TRIGGER IF EXISTS leaders_soft_delete_trigger ON public.leaders;
CREATE TRIGGER leaders_soft_delete_trigger
  BEFORE DELETE ON public.leaders
  FOR EACH ROW
  EXECUTE FUNCTION public.soft_delete_row();

DROP TRIGGER IF EXISTS involved_persons_soft_delete_trigger ON public.involved_persons;
CREATE TRIGGER involved_persons_soft_delete_trigger
  BEFORE DELETE ON public.involved_persons
  FOR EACH ROW
  EXECUTE FUNCTION public.soft_delete_row();

DROP TRIGGER IF EXISTS companies_soft_delete_trigger ON public.companies;
CREATE TRIGGER companies_soft_delete_trigger
  BEFORE DELETE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.soft_delete_row();