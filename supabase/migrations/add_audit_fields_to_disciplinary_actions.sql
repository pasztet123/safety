ALTER TABLE disciplinary_actions
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION set_disciplinary_actions_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by = auth.uid();
    END IF;

    IF NEW.updated_by IS NULL THEN
      NEW.updated_by = COALESCE(auth.uid(), NEW.created_by);
    END IF;

    IF NEW.created_at IS NULL THEN
      NEW.created_at = NOW();
    END IF;

    IF NEW.updated_at IS NULL THEN
      NEW.updated_at = NEW.created_at;
    END IF;
  ELSE
    NEW.created_by = OLD.created_by;
    NEW.created_at = OLD.created_at;
    NEW.updated_at = NOW();
    NEW.updated_by = COALESCE(auth.uid(), NEW.updated_by, OLD.updated_by);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.set_disciplinary_actions_audit_fields()
SET search_path = public;

DROP TRIGGER IF EXISTS disciplinary_actions_updated_at ON disciplinary_actions;
DROP FUNCTION IF EXISTS public.update_disciplinary_actions_updated_at();

DROP TRIGGER IF EXISTS disciplinary_actions_audit_fields ON disciplinary_actions;
CREATE TRIGGER disciplinary_actions_audit_fields
  BEFORE INSERT OR UPDATE ON disciplinary_actions
  FOR EACH ROW
  EXECUTE FUNCTION set_disciplinary_actions_audit_fields();
