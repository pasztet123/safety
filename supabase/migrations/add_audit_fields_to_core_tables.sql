CREATE OR REPLACE FUNCTION set_core_table_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_at IS NULL THEN
      NEW.created_at = NOW();
    END IF;

    IF NEW.updated_at IS NULL THEN
      NEW.updated_at = NEW.created_at;
    END IF;

    IF NEW.created_by IS NULL THEN
      NEW.created_by = auth.uid();
    END IF;

    IF NEW.updated_by IS NULL THEN
      NEW.updated_by = COALESCE(auth.uid(), NEW.created_by);
    END IF;
  ELSE
    NEW.created_at = OLD.created_at;
    NEW.created_by = OLD.created_by;
    NEW.updated_at = NOW();
    NEW.updated_by = COALESCE(auth.uid(), NEW.updated_by, OLD.updated_by);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE checklists
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE corrective_actions
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE meetings
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE incidents
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE checklists
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE corrective_actions
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

DROP TRIGGER IF EXISTS meetings_audit_fields ON meetings;
CREATE TRIGGER meetings_audit_fields
  BEFORE INSERT OR UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION set_core_table_audit_fields();

DROP TRIGGER IF EXISTS incidents_audit_fields ON incidents;
CREATE TRIGGER incidents_audit_fields
  BEFORE INSERT OR UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION set_core_table_audit_fields();

DROP TRIGGER IF EXISTS checklists_audit_fields ON checklists;
CREATE TRIGGER checklists_audit_fields
  BEFORE INSERT OR UPDATE ON checklists
  FOR EACH ROW
  EXECUTE FUNCTION set_core_table_audit_fields();

DROP TRIGGER IF EXISTS corrective_actions_audit_fields ON corrective_actions;
CREATE TRIGGER corrective_actions_audit_fields
  BEFORE INSERT OR UPDATE ON corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION set_core_table_audit_fields();
