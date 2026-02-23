
-- Drop all restrictive policies on families
DROP POLICY IF EXISTS "Users can create families" ON public.families;
DROP POLICY IF EXISTS "Members can view their family" ON public.families;
DROP POLICY IF EXISTS "Family admins can update" ON public.families;
DROP POLICY IF EXISTS "Family creator can delete" ON public.families;

-- Recreate as PERMISSIVE
CREATE POLICY "Users can create families" ON public.families FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view their family" ON public.families FOR SELECT
USING ((id IN (SELECT family_members.family_id FROM family_members WHERE family_members.user_id = auth.uid())) OR (created_by = auth.uid()));

CREATE POLICY "Family admins can update" ON public.families FOR UPDATE
USING (id IN (SELECT family_members.family_id FROM family_members WHERE family_members.user_id = auth.uid() AND family_members.role = 'admin'));

CREATE POLICY "Family creator can delete" ON public.families FOR DELETE
USING (created_by = auth.uid());

-- Drop all restrictive policies on family_members
DROP POLICY IF EXISTS "Users can join families" ON public.family_members;
DROP POLICY IF EXISTS "Members can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.family_members;

-- Recreate as PERMISSIVE
CREATE POLICY "Users can join families" ON public.family_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can view family members" ON public.family_members FOR SELECT
USING (family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid()));

CREATE POLICY "Admins can update members" ON public.family_members FOR UPDATE
USING ((family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid() AND fm.role = 'admin')) OR (user_id = auth.uid()));

CREATE POLICY "Admins can remove members" ON public.family_members FOR DELETE
USING ((family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid() AND fm.role = 'admin')) OR (user_id = auth.uid()));

-- Drop all restrictive policies on family_goals
DROP POLICY IF EXISTS "Family members can view goals" ON public.family_goals;
DROP POLICY IF EXISTS "Family members can create goals" ON public.family_goals;
DROP POLICY IF EXISTS "Goal creators can update" ON public.family_goals;
DROP POLICY IF EXISTS "Goal creators can delete" ON public.family_goals;

-- Recreate as PERMISSIVE
CREATE POLICY "Family members can view goals" ON public.family_goals FOR SELECT
USING (family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid()));

CREATE POLICY "Family members can create goals" ON public.family_goals FOR INSERT
WITH CHECK (family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Goal creators can update" ON public.family_goals FOR UPDATE
USING (family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid()));

CREATE POLICY "Goal creators can delete" ON public.family_goals FOR DELETE
USING (family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid()));

-- Drop all restrictive policies on family_insights
DROP POLICY IF EXISTS "Family members can view insights" ON public.family_insights;
DROP POLICY IF EXISTS "System can create insights" ON public.family_insights;

-- Recreate as PERMISSIVE
CREATE POLICY "Family members can view insights" ON public.family_insights FOR SELECT
USING (family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid()));

CREATE POLICY "System can create insights" ON public.family_insights FOR INSERT
WITH CHECK (family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid()));

-- Drop all restrictive policies on shared_transactions
DROP POLICY IF EXISTS "Family members can view shared transactions" ON public.shared_transactions;
DROP POLICY IF EXISTS "Members can share transactions" ON public.shared_transactions;
DROP POLICY IF EXISTS "Members can unshare own transactions" ON public.shared_transactions;

-- Recreate as PERMISSIVE
CREATE POLICY "Family members can view shared transactions" ON public.shared_transactions FOR SELECT
USING (family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid()));

CREATE POLICY "Members can share transactions" ON public.shared_transactions FOR INSERT
WITH CHECK (family_id IN (SELECT fm.family_id FROM family_members fm WHERE fm.user_id = auth.uid()) AND auth.uid() = shared_by);

CREATE POLICY "Members can unshare own transactions" ON public.shared_transactions FOR DELETE
USING (shared_by = auth.uid());

-- Also need permissive SELECT on families for joining by invite code
CREATE POLICY "Anyone can search families by invite code" ON public.families FOR SELECT
USING (true);

-- Drop the duplicate
DROP POLICY IF EXISTS "Members can view their family" ON public.families;
