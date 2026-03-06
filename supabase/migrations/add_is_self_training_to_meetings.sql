-- Add is_self_training flag to meetings
-- A meeting with exactly one attendee who is also the leader is considered a self-training.
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS is_self_training BOOLEAN DEFAULT false;
