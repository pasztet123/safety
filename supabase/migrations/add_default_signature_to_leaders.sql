-- Add default signature to leaders table
ALTER TABLE public.leaders
ADD COLUMN default_signature_url TEXT;

COMMENT ON COLUMN public.leaders.default_signature_url IS 'URL to leader''s default signature image in storage';
