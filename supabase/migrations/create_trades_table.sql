-- Create a canonical trades registry used across the whole app
-- (safety_topics.trades and checklists.trades TEXT[] remain, this table is the source of truth for autocomplete)
CREATE TABLE IF NOT EXISTS trades (
  id   uuid  DEFAULT gen_random_uuid() PRIMARY KEY,
  name text  NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT trades_name_unique UNIQUE (name)
);

-- All authenticated users can read trades
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trades_select_authenticated"
  ON trades FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can add a new trade (rare on-the-fly case)
CREATE POLICY "trades_insert_authenticated"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can delete/rename trades
CREATE POLICY "trades_delete_admin"
  ON trades FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "trades_update_admin"
  ON trades FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Fast lookup by name prefix for autocomplete
CREATE INDEX IF NOT EXISTS idx_trades_name ON trades(name);
