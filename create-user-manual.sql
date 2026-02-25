-- Manual user creation via SQL
-- Run this in Supabase SQL Editor

-- STEP 1: First, create user in Supabase Dashboard manually:
-- Go to Authentication → Users → "Add user"
-- Set email and password
-- Copy the user ID that gets generated

-- STEP 2: Then run this (replace with actual values):
INSERT INTO public.users (id, email, name, is_admin)
VALUES (
  'USER-ID-FROM-AUTH-DASHBOARD',  -- Get this from Auth → Users after creating
  'user@example.com',              -- Same email as in Auth
  'User Name',                      -- Display name
  false                             -- true for admin, false for regular user
);

-- Example:
-- INSERT INTO public.users (id, email, name, is_admin)
-- VALUES (
--   '12345678-1234-1234-1234-123456789012',
--   'john@example.com',
--   'John Doe',
--   false
-- );
