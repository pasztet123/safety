-- Add default signature to users table
-- This allows each user to have a pre-saved signature that will be automatically loaded
-- when they add a drawn signature in meetings

ALTER TABLE public.users
ADD COLUMN default_signature_url TEXT;

COMMENT ON COLUMN public.users.default_signature_url IS 'URL to user''s default signature image in storage';
