
-- Explicitly deny all public access to app_config (only service role bypasses RLS)
CREATE POLICY "Deny all public access to app_config"
  ON public.app_config FOR ALL
  USING (false)
  WITH CHECK (false);
