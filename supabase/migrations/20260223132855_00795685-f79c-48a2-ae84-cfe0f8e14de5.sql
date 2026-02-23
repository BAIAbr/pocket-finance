
-- Create a security definer function to check family membership without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_family_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid();
$$;

-- Drop existing problematic policies on family_members
DROP POLICY IF EXISTS "Members can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.family_members;

-- Recreate without self-referencing
CREATE POLICY "Members can view family members" ON public.family_members FOR SELECT
USING (family_id IN (SELECT public.get_my_family_ids()));

CREATE POLICY "Admins can update members" ON public.family_members FOR UPDATE
USING (user_id = auth.uid() OR (family_id IN (SELECT public.get_my_family_ids()) AND EXISTS (
  SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid() AND fm.role = 'admin'
)));

-- For delete, simplify to avoid recursion
DROP POLICY IF EXISTS "Admins can remove members" ON public.family_members;

-- Use security definer function for admin check too
CREATE OR REPLACE FUNCTION public.is_family_admin(p_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM family_members WHERE family_id = p_family_id AND user_id = auth.uid() AND role = 'admin');
$$;

CREATE POLICY "Admins can remove members" ON public.family_members FOR DELETE
USING (user_id = auth.uid() OR public.is_family_admin(family_id));

-- Also fix the update policy to use the function
DROP POLICY IF EXISTS "Admins can update members" ON public.family_members;
CREATE POLICY "Admins can update members" ON public.family_members FOR UPDATE
USING (user_id = auth.uid() OR public.is_family_admin(family_id));

-- Fix families policies that reference family_members
DROP POLICY IF EXISTS "Members and invite lookup can view families" ON public.families;
CREATE POLICY "Members and invite lookup can view families" ON public.families FOR SELECT
USING (created_by = auth.uid() OR id IN (SELECT public.get_my_family_ids()) OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Family admins can update" ON public.families;
CREATE POLICY "Family admins can update" ON public.families FOR UPDATE
USING (public.is_family_admin(id));

-- Fix family_goals policies
DROP POLICY IF EXISTS "Family members can view goals" ON public.family_goals;
CREATE POLICY "Family members can view goals" ON public.family_goals FOR SELECT
USING (family_id IN (SELECT public.get_my_family_ids()));

DROP POLICY IF EXISTS "Family members can create goals" ON public.family_goals;
CREATE POLICY "Family members can create goals" ON public.family_goals FOR INSERT
WITH CHECK (family_id IN (SELECT public.get_my_family_ids()) AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Goal creators can update" ON public.family_goals;
CREATE POLICY "Goal creators can update" ON public.family_goals FOR UPDATE
USING (family_id IN (SELECT public.get_my_family_ids()));

DROP POLICY IF EXISTS "Goal creators can delete" ON public.family_goals;
CREATE POLICY "Goal creators can delete" ON public.family_goals FOR DELETE
USING (family_id IN (SELECT public.get_my_family_ids()));

-- Fix family_insights policies
DROP POLICY IF EXISTS "Family members can view insights" ON public.family_insights;
CREATE POLICY "Family members can view insights" ON public.family_insights FOR SELECT
USING (family_id IN (SELECT public.get_my_family_ids()));

DROP POLICY IF EXISTS "System can create insights" ON public.family_insights;
CREATE POLICY "System can create insights" ON public.family_insights FOR INSERT
WITH CHECK (family_id IN (SELECT public.get_my_family_ids()));

-- Fix shared_transactions policies
DROP POLICY IF EXISTS "Family members can view shared transactions" ON public.shared_transactions;
CREATE POLICY "Family members can view shared transactions" ON public.shared_transactions FOR SELECT
USING (family_id IN (SELECT public.get_my_family_ids()));

DROP POLICY IF EXISTS "Members can share transactions" ON public.shared_transactions;
CREATE POLICY "Members can share transactions" ON public.shared_transactions FOR INSERT
WITH CHECK (family_id IN (SELECT public.get_my_family_ids()) AND auth.uid() = shared_by);
