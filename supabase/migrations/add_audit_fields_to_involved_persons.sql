ALTER TABLE public.involved_persons
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_involved_persons_audit_fields()
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

ALTER FUNCTION public.set_involved_persons_audit_fields() SET search_path = public;

DROP TRIGGER IF EXISTS update_involved_persons_updated_at ON public.involved_persons;
DROP TRIGGER IF EXISTS involved_persons_audit_fields ON public.involved_persons;

CREATE TRIGGER involved_persons_audit_fields
  BEFORE INSERT OR UPDATE ON public.involved_persons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_involved_persons_audit_fields();