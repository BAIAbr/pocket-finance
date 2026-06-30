
-- Tighten storage listing: scope avatars to own folder, achievements to admins
DROP POLICY IF EXISTS "Authenticated users can list avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list achievement images" ON storage.objects;

CREATE POLICY "Users can list their own avatar files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can list achievement images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'achievements'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Lock down remaining SECURITY DEFINER trigger function from direct invocation
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
