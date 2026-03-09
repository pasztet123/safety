-- Table for photos attached to a checklist completion.
-- completion_item_id IS NULL  → photo belongs to the whole completion
-- completion_item_id IS NOT NULL → photo belongs to a specific checklist item

CREATE TABLE checklist_completion_photos (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  completion_id      UUID        NOT NULL REFERENCES checklist_completions(id)       ON DELETE CASCADE,
  completion_item_id UUID                 REFERENCES checklist_completion_items(id)  ON DELETE CASCADE,
  photo_url          TEXT        NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checklist_completion_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklist completion photos"
ON checklist_completion_photos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert checklist completion photos"
ON checklist_completion_photos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete checklist completion photos"
ON checklist_completion_photos FOR DELETE
TO authenticated
USING (true);
