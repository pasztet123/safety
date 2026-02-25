-- Query to find users in Auth but not in users table
-- Run this in Supabase SQL Editor to see orphaned users

SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- To add an orphaned user to the users table, run:
-- (Replace the values with actual user data)
-- INSERT INTO public.users (id, email, name, is_admin)
-- VALUES ('user-id-from-above', 'user@email.com', 'User Name', false);
