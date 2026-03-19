CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT app_settings_timezone_not_blank CHECK (char_length(trim(timezone)) > 0)
);

INSERT INTO public.app_settings (id, timezone)
VALUES (1, 'America/Chicago')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.touch_app_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_settings_touch_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_touch_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_app_settings_updated_at();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.app_settings TO authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;

DROP POLICY IF EXISTS "app_settings_select_authenticated" ON public.app_settings;
CREATE POLICY "app_settings_select_authenticated"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "app_settings_insert_admin" ON public.app_settings;
CREATE POLICY "app_settings_insert_admin"
  ON public.app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.is_admin = true
        AND users.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "app_settings_update_admin" ON public.app_settings;
CREATE POLICY "app_settings_update_admin"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.is_admin = true
        AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.is_admin = true
        AND users.deleted_at IS NULL
    )
  );
