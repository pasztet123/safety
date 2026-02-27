-- Add default signature to involved_persons table
-- This allows each involved person to have a pre-saved signature that will be automatically loaded
-- when they add a drawn signature in meetings

ALTER TABLE public.involved_persons
ADD COLUMN default_signature_url TEXT;

COMMENT ON COLUMN public.involved_persons.default_signature_url IS 'URL to involved person''s default signature image in storage';
