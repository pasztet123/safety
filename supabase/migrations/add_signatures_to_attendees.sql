-- Add signature_url column to meeting_attendees table
ALTER TABLE meeting_attendees 
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Add comment
COMMENT ON COLUMN meeting_attendees.signature_url IS 'URL to the attendee signature image stored in Supabase Storage';
