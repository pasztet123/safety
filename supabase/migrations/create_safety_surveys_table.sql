CREATE TABLE IF NOT EXISTS public.safety_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  survey_date DATE NOT NULL,
  survey_time TEXT,
  project_address TEXT,
  responsible_person_id UUID REFERENCES public.involved_persons(id) ON DELETE SET NULL,
  responsible_person_name TEXT,
  survey_title TEXT,
  survey_notes TEXT,
  hazards_observed TEXT,
  recommendations TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  compliance_documented BOOLEAN NOT NULL DEFAULT false,
  compliance_follow_up_required BOOLEAN NOT NULL DEFAULT false,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS safety_surveys_project_id_idx
  ON public.safety_surveys(project_id);

CREATE INDEX IF NOT EXISTS safety_surveys_responsible_person_id_idx
  ON public.safety_surveys(responsible_person_id);

CREATE INDEX IF NOT EXISTS safety_surveys_survey_date_idx
  ON public.safety_surveys(survey_date DESC, survey_time DESC);

CREATE INDEX IF NOT EXISTS safety_surveys_deleted_at_idx
  ON public.safety_surveys(deleted_at);

ALTER TABLE public.safety_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view safety surveys" ON public.safety_surveys;
CREATE POLICY "Authenticated users can view safety surveys"
ON public.safety_surveys FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can insert safety surveys" ON public.safety_surveys;
CREATE POLICY "Authenticated users can insert safety surveys"
ON public.safety_surveys FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update safety surveys" ON public.safety_surveys;
CREATE POLICY "Authenticated users can update safety surveys"
ON public.safety_surveys FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete safety surveys" ON public.safety_surveys;
CREATE POLICY "Authenticated users can delete safety surveys"
ON public.safety_surveys FOR DELETE
TO authenticated
USING (true);

DROP TRIGGER IF EXISTS safety_surveys_audit_fields ON public.safety_surveys;
CREATE TRIGGER safety_surveys_audit_fields
  BEFORE INSERT OR UPDATE ON public.safety_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.set_core_table_audit_fields();