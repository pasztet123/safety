ALTER TABLE public.corrective_actions
ADD COLUMN IF NOT EXISTS declared_completion_date DATE;

UPDATE public.corrective_actions
SET declared_completion_date = COALESCE(declared_completion_date, completion_date)
WHERE status = 'completed'
  AND declared_completion_date IS NULL
  AND completion_date IS NOT NULL;