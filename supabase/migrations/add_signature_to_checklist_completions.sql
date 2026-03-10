-- Add signer info and signature to checklist completions
ALTER TABLE checklist_completions
  ADD COLUMN IF NOT EXISTS signer_name   TEXT,
  ADD COLUMN IF NOT EXISTS signer_type   TEXT,   -- 'leader' | 'worker'
  ADD COLUMN IF NOT EXISTS signature_url TEXT;
