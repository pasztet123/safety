-- Add checkbox signature option to meeting_attendees table
ALTER TABLE meeting_attendees 
ADD COLUMN IF NOT EXISTS signed_with_checkbox BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN meeting_attendees.signed_with_checkbox IS 'Indicates if attendee signed with checkbox instead of signature';
