-- Create storage bucket for signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true);

-- Allow authenticated users to upload their own signatures
CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signatures');

-- Allow public read access to signatures
CREATE POLICY "Public can view signatures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'signatures');

-- Allow authenticated users to update their own signatures
CREATE POLICY "Authenticated users can update signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'signatures');

-- Allow authenticated users to delete signatures
CREATE POLICY "Authenticated users can delete signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'signatures');
