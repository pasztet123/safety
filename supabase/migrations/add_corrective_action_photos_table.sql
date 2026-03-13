-- Store multiple photos for each corrective action.

CREATE TABLE IF NOT EXISTS corrective_action_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrective_action_id UUID NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrective_action_photos_action_id
  ON corrective_action_photos(corrective_action_id);

CREATE INDEX IF NOT EXISTS idx_corrective_action_photos_action_id_display_order
  ON corrective_action_photos(corrective_action_id, display_order);

ALTER TABLE corrective_action_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view corrective action photos" ON corrective_action_photos;
CREATE POLICY "Authenticated users can view corrective action photos"
ON corrective_action_photos FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert corrective action photos" ON corrective_action_photos;
CREATE POLICY "Authenticated users can insert corrective action photos"
ON corrective_action_photos FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update corrective action photos" ON corrective_action_photos;
CREATE POLICY "Authenticated users can update corrective action photos"
ON corrective_action_photos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete corrective action photos" ON corrective_action_photos;
CREATE POLICY "Authenticated users can delete corrective action photos"
ON corrective_action_photos FOR DELETE
TO authenticated
USING (true);