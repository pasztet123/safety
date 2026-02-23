-- Create involved_persons table
CREATE TABLE IF NOT EXISTS involved_persons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE involved_persons ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read involved_persons"
  ON involved_persons FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert involved_persons"
  ON involved_persons FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update involved_persons"
  ON involved_persons FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete involved_persons"
  ON involved_persons FOR DELETE
  TO authenticated
  USING (true);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS involved_persons_name_idx ON involved_persons(name);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_involved_persons_updated_at BEFORE UPDATE ON involved_persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
