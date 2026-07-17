
DROP POLICY IF EXISTS "Anon read docassets" ON storage.objects;

CREATE POLICY "Anon read published docassets" ON storage.objects
  FOR SELECT TO anon
  USING (
    bucket_id = 'document-assets'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.status = 'published'
        AND (
          (d.cover_image IS NOT NULL AND d.cover_image LIKE '%' || storage.objects.name || '%')
          OR (d.seo_image IS NOT NULL AND d.seo_image LIKE '%' || storage.objects.name || '%')
          OR (d.conteudo IS NOT NULL AND d.conteudo::text LIKE '%' || storage.objects.name || '%')
        )
    )
  );
