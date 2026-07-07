
CREATE POLICY "theme_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'theme-assets');

CREATE POLICY "theme_assets_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'theme-assets' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "theme_assets_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'theme-assets' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "theme_assets_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'theme-assets' AND private.has_role(auth.uid(), 'admin'::app_role));
