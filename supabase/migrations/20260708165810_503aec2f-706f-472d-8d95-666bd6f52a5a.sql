
-- 1. FAMILIES: hide invite_code from broad selects
CREATE OR REPLACE FUNCTION public.get_family_invite_code(_family_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  IF NOT private.is_family_admin(_family_id)
     AND NOT EXISTS (SELECT 1 FROM public.families f WHERE f.id = _family_id AND f.created_by = auth.uid()) THEN
    RETURN NULL;
  END IF;
  SELECT invite_code INTO code FROM public.families WHERE id = _family_id;
  RETURN code;
END;
$$;

REVOKE SELECT (invite_code) ON public.families FROM authenticated, anon;
GRANT SELECT (id, nome, created_by, plano, ai_enabled, auto_share, created_at, updated_at) ON public.families TO authenticated;

-- 2. FAMILY_MEMBERS: prevent role escalation
DROP POLICY IF EXISTS "Users can join families as member" ON public.family_members;
CREATE POLICY "Users can join families as member"
ON public.family_members FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'member'
);

DROP POLICY IF EXISTS "Admins update members; users update own non-role fields" ON public.family_members;
CREATE POLICY "Admins update members; users update own non-role fields"
ON public.family_members FOR UPDATE TO authenticated
USING (private.is_family_admin(family_id) OR user_id = auth.uid())
WITH CHECK (
  -- admins can set any role
  private.is_family_admin(family_id)
  OR (
    -- non-admin editing own row: role must remain unchanged
    user_id = auth.uid()
    AND role = (SELECT fm.role FROM public.family_members fm WHERE fm.id = family_members.id)
  )
);

-- Admin invite by creator: allow separate INSERT for family creator to add admins
CREATE POLICY "Family creator can add admin members"
ON public.family_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.families f WHERE f.id = family_id AND f.created_by = auth.uid())
);

-- 3. FAMILY_GOALS: remove admin blanket delete; enforce ownership on update
DROP POLICY IF EXISTS "Admins can delete goals" ON public.family_goals;
DROP POLICY IF EXISTS "Members can create goals" ON public.family_goals;
-- Keep "Goal creators can delete their own goals" and "Family members can create goals" and "Goal creators can update their own goals"

-- 4. FAMILY_INSIGHTS: remove client INSERT policy (service role bypasses RLS)
DROP POLICY IF EXISTS "Admins can insert insights" ON public.family_insights;

-- 5. INSTALLMENT_PURCHASES & INSTALLMENT_ITEMS: ensure mutations are owner-only (already are, recreate explicitly)
DROP POLICY IF EXISTS "own purchases update" ON public.installment_purchases;
CREATE POLICY "own purchases update"
ON public.installment_purchases FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own purchases delete" ON public.installment_purchases;
CREATE POLICY "own purchases delete"
ON public.installment_purchases FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own items update" ON public.installment_items;
CREATE POLICY "own items update"
ON public.installment_items FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own items delete" ON public.installment_items;
CREATE POLICY "own items delete"
ON public.installment_items FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 6. PRODUCTS: ensure explicit owner-only mutations
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products"
ON public.products FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products"
ON public.products FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
CREATE POLICY "Users can insert own products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. STOCK_OUTPUTS: explicit owner-only mutations
DROP POLICY IF EXISTS "Users can update own outputs" ON public.stock_outputs;
CREATE POLICY "Users can update own outputs"
ON public.stock_outputs FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own outputs" ON public.stock_outputs;
CREATE POLICY "Users can delete own outputs"
ON public.stock_outputs FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own outputs" ON public.stock_outputs;
CREATE POLICY "Users can insert own outputs"
ON public.stock_outputs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 8. STOCK_OUTPUT_ITEMS: mutations only via own output
DROP POLICY IF EXISTS "Users can update output items" ON public.stock_output_items;
CREATE POLICY "Users can update output items"
ON public.stock_output_items FOR UPDATE TO authenticated
USING (output_id IN (SELECT id FROM public.stock_outputs WHERE user_id = auth.uid()))
WITH CHECK (output_id IN (SELECT id FROM public.stock_outputs WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete output items" ON public.stock_output_items;
CREATE POLICY "Users can delete output items"
ON public.stock_output_items FOR DELETE TO authenticated
USING (output_id IN (SELECT id FROM public.stock_outputs WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert output items" ON public.stock_output_items;
CREATE POLICY "Users can insert output items"
ON public.stock_output_items FOR INSERT TO authenticated
WITH CHECK (output_id IN (SELECT id FROM public.stock_outputs WHERE user_id = auth.uid()));

-- 9. USER_SUBSCRIPTIONS: remove client insert/update paths; require server-verified upgrades
DROP POLICY IF EXISTS "User inserts own free subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "User updates own subscription to free" ON public.user_subscriptions;
DROP POLICY IF EXISTS "User deletes own subscription" ON public.user_subscriptions;
-- Keep SELECT own subscription only. All writes must go through service_role/edge functions.

-- 10. GAMIFICATION tables: block client writes; only service role writes
REVOKE INSERT, UPDATE, DELETE ON public.user_xp FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.weekly_missions FROM authenticated, anon;
REVOKE INSERT, DELETE ON public.user_mission_history FROM authenticated, anon;
-- Keep UPDATE grant on user_mission_history so the "mark as shown" policy still works
GRANT UPDATE ON public.user_mission_history TO authenticated;

GRANT ALL ON public.user_xp TO service_role;
GRANT ALL ON public.weekly_missions TO service_role;
GRANT ALL ON public.user_mission_history TO service_role;
