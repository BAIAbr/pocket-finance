
-- Allow admins to read app_config
CREATE POLICY "Admins can read app_config"
ON public.app_config FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert app_config
CREATE POLICY "Admins can insert app_config"
ON public.app_config FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update app_config
CREATE POLICY "Admins can update app_config"
ON public.app_config FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));
