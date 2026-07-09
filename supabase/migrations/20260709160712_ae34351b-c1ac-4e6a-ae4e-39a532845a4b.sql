DROP POLICY IF EXISTS "Authenticated users can read app_config" ON public.app_config;
DROP POLICY IF EXISTS "Deny all public access to app_config" ON public.app_config;
CREATE POLICY "Admins can read app_config" ON public.app_config FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));