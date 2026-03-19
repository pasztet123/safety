CREATE TABLE IF NOT EXISTS public.safety_survey_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.safety_surveys(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS safety_survey_photos_survey_id_idx
  ON public.safety_survey_photos(survey_id);

CREATE INDEX IF NOT EXISTS safety_survey_photos_survey_id_display_order_idx
  ON public.safety_survey_photos(survey_id, display_order);

ALTER TABLE public.safety_survey_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view safety survey photos" ON public.safety_survey_photos;
CREATE POLICY "Authenticated users can view safety survey photos"
ON public.safety_survey_photos FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert safety survey photos" ON public.safety_survey_photos;
CREATE POLICY "Authenticated users can insert safety survey photos"
ON public.safety_survey_photos FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update safety survey photos" ON public.safety_survey_photos;
CREATE POLICY "Authenticated users can update safety survey photos"
ON public.safety_survey_photos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete safety survey photos" ON public.safety_survey_photos;
CREATE POLICY "Authenticated users can delete safety survey photos"
ON public.safety_survey_photos FOR DELETE
TO authenticated
USING (true);