CREATE TABLE IF NOT EXISTS public.person_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  default_signature_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.person_profile_name_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_profile_id UUID NOT NULL REFERENCES public.person_profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.leaders
  ADD COLUMN IF NOT EXISTS person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.involved_persons
  ADD COLUMN IF NOT EXISTS person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_person_profiles_normalized_name
  ON public.person_profiles(normalized_name);

CREATE INDEX IF NOT EXISTS idx_person_profile_name_aliases_profile_id
  ON public.person_profile_name_aliases(person_profile_id);

CREATE INDEX IF NOT EXISTS idx_person_profile_name_aliases_normalized_name
  ON public.person_profile_name_aliases(normalized_name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_person_profile_name_aliases_profile_normalized
  ON public.person_profile_name_aliases(person_profile_id, normalized_name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_person_profile_id_unique
  ON public.users(person_profile_id)
  WHERE person_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaders_person_profile_id_unique
  ON public.leaders(person_profile_id)
  WHERE person_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_involved_persons_person_profile_id_unique
  ON public.involved_persons(person_profile_id)
  WHERE person_profile_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_person_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_person_profiles_updated_at ON public.person_profiles;

CREATE TRIGGER set_person_profiles_updated_at
  BEFORE UPDATE ON public.person_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_person_profiles_updated_at();

ALTER TABLE public.person_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_profile_name_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read person_profiles" ON public.person_profiles;
CREATE POLICY "Allow authenticated users to read person_profiles"
  ON public.person_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read person_profile_name_aliases" ON public.person_profile_name_aliases;
CREATE POLICY "Allow authenticated users to read person_profile_name_aliases"
  ON public.person_profile_name_aliases FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow admin users to insert person_profiles" ON public.person_profiles;
CREATE POLICY "Allow admin users to insert person_profiles"
  ON public.person_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND is_admin = true
        AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Allow admin users to update person_profiles" ON public.person_profiles;
CREATE POLICY "Allow admin users to update person_profiles"
  ON public.person_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND is_admin = true
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND is_admin = true
        AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Allow admin users to delete person_profiles" ON public.person_profiles;
CREATE POLICY "Allow admin users to delete person_profiles"
  ON public.person_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND is_admin = true
        AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Allow admin users to insert person_profile_name_aliases" ON public.person_profile_name_aliases;
CREATE POLICY "Allow admin users to insert person_profile_name_aliases"
  ON public.person_profile_name_aliases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND is_admin = true
        AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Allow admin users to update person_profile_name_aliases" ON public.person_profile_name_aliases;
CREATE POLICY "Allow admin users to update person_profile_name_aliases"
  ON public.person_profile_name_aliases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND is_admin = true
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND is_admin = true
        AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Allow admin users to delete person_profile_name_aliases" ON public.person_profile_name_aliases;
CREATE POLICY "Allow admin users to delete person_profile_name_aliases"
  ON public.person_profile_name_aliases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND is_admin = true
        AND deleted_at IS NULL
    )
  );