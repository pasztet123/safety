ALTER TABLE public.safety_survey_photos
  ADD COLUMN IF NOT EXISTS survey_section_id UUID REFERENCES public.safety_survey_sections(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS safety_survey_photos_section_id_idx
  ON public.safety_survey_photos(survey_section_id);

CREATE INDEX IF NOT EXISTS safety_survey_photos_survey_id_section_id_display_order_idx
  ON public.safety_survey_photos(survey_id, survey_section_id, display_order);