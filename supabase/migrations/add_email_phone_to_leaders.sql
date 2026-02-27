-- Add email and phone columns to leaders table
ALTER TABLE public.leaders
ADD COLUMN email TEXT,
ADD COLUMN phone TEXT;

COMMENT ON COLUMN public.leaders.email IS 'Leader email address';
COMMENT ON COLUMN public.leaders.phone IS 'Leader phone number';
