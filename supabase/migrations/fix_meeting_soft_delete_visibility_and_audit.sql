DROP POLICY IF EXISTS "Allow authenticated users full access to meetings" ON public.meetings;

CREATE OR REPLACE FUNCTION public.soft_delete_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
  v_event_type TEXT;
BEGIN
  IF OLD.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  v_record_id := OLD.id;
  v_event_type := CASE TG_TABLE_NAME
    WHEN 'meetings' THEN 'meeting_deleted'
    WHEN 'incidents' THEN 'incident_deleted'
    WHEN 'corrective_actions' THEN 'corrective_action_deleted'
    WHEN 'checklist_completions' THEN 'checklist_completion_deleted'
    WHEN 'disciplinary_actions' THEN 'disciplinary_action_deleted'
    ELSE 'soft_delete'
  END;

  EXECUTE format(
    'UPDATE %I.%I SET deleted_at = timezone(''utc''::text, now()), deleted_by = $1 WHERE id = $2',
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME
  )
  USING auth.uid(), v_record_id;

  BEGIN
    PERFORM public.record_audit_event(
      v_event_type,
      TG_TABLE_NAME,
      v_record_id,
      jsonb_build_object(
        'deleted_by', auth.uid(),
        'table_name', TG_TABLE_NAME,
        'deleted_at', timezone('utc'::text, now())
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;