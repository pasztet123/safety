-- Store multiple photos per incident while keeping incidents.photo_url as a legacy primary photo.

CREATE TABLE IF NOT EXISTS incident_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_photos_incident_id
  ON incident_photos(incident_id);

CREATE INDEX IF NOT EXISTS idx_incident_photos_incident_id_display_order
  ON incident_photos(incident_id, display_order);

ALTER TABLE incident_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view incident photos" ON incident_photos;
CREATE POLICY "Authenticated users can view incident photos"
ON incident_photos FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert incident photos" ON incident_photos;
CREATE POLICY "Authenticated users can insert incident photos"
ON incident_photos FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete incident photos" ON incident_photos;
CREATE POLICY "Authenticated users can delete incident photos"
ON incident_photos FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can update incident photos" ON incident_photos;
CREATE POLICY "Authenticated users can update incident photos"
ON incident_photos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

INSERT INTO incident_photos (incident_id, photo_url, display_order)
SELECT i.id, i.photo_url, 0
FROM incidents i
WHERE i.photo_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM incident_photos ip
    WHERE ip.incident_id = i.id
  );