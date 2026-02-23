
-- Remove the overly permissive policy and the duplicate
DROP POLICY IF EXISTS "Anyone can search families by invite code" ON public.families;
DROP POLICY IF EXISTS "Members can view their family" ON public.families;

-- Recreate a proper SELECT policy that also allows searching by invite code
CREATE POLICY "Members and invite lookup can view families" ON public.families FOR SELECT
USING (
  (id IN (SELECT family_members.family_id FROM family_members WHERE family_members.user_id = auth.uid()))
  OR (created_by = auth.uid())
  OR (auth.uid() IS NOT NULL)
);
