
-- Allow authenticated users to read rarity labels
CREATE POLICY "Authenticated users can read app_config"
ON public.app_config FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Drop the admin-only read since authenticated covers it
DROP POLICY IF EXISTS "Admins can read app_config" ON public.app_config;
