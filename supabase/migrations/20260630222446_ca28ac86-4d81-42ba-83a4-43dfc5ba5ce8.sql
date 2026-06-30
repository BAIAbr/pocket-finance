
-- =========================================================================
-- 1. families: remove "any authenticated user can read" clause
-- =========================================================================
DROP POLICY IF EXISTS "Members and invite lookup can view families" ON public.families;

CREATE POLICY "Members and creator can view families"
ON public.families
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR id IN (SELECT public.get_my_family_ids())
);

-- Dedicated SECURITY DEFINER lookup for invite-code joins. Returns only the
-- family id; never exposes invite_code, name, or AI settings to non-members.
CREATE OR REPLACE FUNCTION public.find_family_by_invite_code(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.families WHERE invite_code = upper(p_code) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_family_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_family_by_invite_code(text) TO authenticated;

-- =========================================================================
-- 2. family_goals: restrict update/delete to the creator (admins keep their
--    dedicated policies)
-- =========================================================================
DROP POLICY IF EXISTS "Goal creators can delete" ON public.family_goals;
DROP POLICY IF EXISTS "Goal creators can update" ON public.family_goals;
DROP POLICY IF EXISTS "Members can update goals" ON public.family_goals;

CREATE POLICY "Goal creators can delete their own goals"
ON public.family_goals
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND family_id IN (SELECT public.get_my_family_ids())
);

CREATE POLICY "Goal creators can update their own goals"
ON public.family_goals
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND family_id IN (SELECT public.get_my_family_ids())
)
WITH CHECK (
  created_by = auth.uid()
  AND family_id IN (SELECT public.get_my_family_ids())
);

-- =========================================================================
-- 3. family_insights: only admins can insert (drop permissive "system" rule)
-- =========================================================================
DROP POLICY IF EXISTS "System can create insights" ON public.family_insights;

-- =========================================================================
-- 4. Lock down SECURITY DEFINER helper functions: no anon execution
-- =========================================================================
REVOKE ALL ON FUNCTION public.get_my_family_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_family_ids() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_family_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_family_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- =========================================================================
-- 5. Storage: prevent anonymous listing of avatars/achievement buckets.
--    Direct CDN URLs for public buckets bypass RLS, so existing image URLs
--    continue to load; only the metadata/listing API is restricted.
-- =========================================================================
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Achievement images are publicly accessible" ON storage.objects;

CREATE POLICY "Authenticated users can list avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can list achievement images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'achievements');
