CREATE TABLE IF NOT EXISTS public.safety_survey_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.safety_surveys(id) ON DELETE CASCADE,
  category_key TEXT,
  category_label TEXT NOT NULL,
  category_source TEXT NOT NULL DEFAULT 'predefined' CHECK (category_source IN ('predefined', 'custom')),
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS safety_survey_sections_survey_id_idx
  ON public.safety_survey_sections(survey_id);

CREATE INDEX IF NOT EXISTS safety_survey_sections_survey_id_display_order_idx
  ON public.safety_survey_sections(survey_id, display_order);

ALTER TABLE public.safety_survey_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view safety survey sections" ON public.safety_survey_sections;
CREATE POLICY "Authenticated users can view safety survey sections"
ON public.safety_survey_sections FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert safety survey sections" ON public.safety_survey_sections;
CREATE POLICY "Authenticated users can insert safety survey sections"
ON public.safety_survey_sections FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update safety survey sections" ON public.safety_survey_sections;
CREATE POLICY "Authenticated users can update safety survey sections"
ON public.safety_survey_sections FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete safety survey sections" ON public.safety_survey_sections;
CREATE POLICY "Authenticated users can delete safety survey sections"
ON public.safety_survey_sections FOR DELETE
TO authenticated
USING (true);

DROP TRIGGER IF EXISTS safety_survey_sections_audit_fields ON public.safety_survey_sections;
CREATE TRIGGER safety_survey_sections_audit_fields
  BEFORE INSERT OR UPDATE ON public.safety_survey_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_core_table_audit_fields();