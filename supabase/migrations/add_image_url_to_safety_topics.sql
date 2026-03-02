-- Add image_url column to safety_topics table
-- Usage: upload image to Supabase Storage (e.g. bucket: safety-topic-images)
-- then paste the public URL here via Admin Panel > Safety Topics > Edit

ALTER TABLE safety_topics
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN safety_topics.image_url IS
  'Optional hero image URL (Supabase Storage public URL). '
  'Shown as thumbnail in topic list and as hero banner in topic detail modal.';
