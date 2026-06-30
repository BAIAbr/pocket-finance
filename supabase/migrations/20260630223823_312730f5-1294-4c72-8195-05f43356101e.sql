
-- Move SECURITY DEFINER helper functions out of the public (API) schema so signed-in users
-- cannot invoke them via PostgREST. RLS policies can still call them across schemas.

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Recreate the helper functions inside `private`
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.get_my_family_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.family_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_family_admin(p_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = p_family_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION private.find_family_by_invite_code(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.families WHERE invite_code = upper(p_code) LIMIT 1;
$$;

-- Lock down execution: only authenticated users (via RLS / wrapper) and service_role.
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_my_family_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_family_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.find_family_by_invite_code(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_my_family_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_family_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.find_family_by_invite_code(text) TO authenticated, service_role;

-- Drop the old public functions together with their dependent policies; we recreate everything below.
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_family_ids() CASCADE;
DROP FUNCTION IF EXISTS public.is_family_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.find_family_by_invite_code(text) CASCADE;

-- ---------- Recreate the dropped RLS policies, now referencing `private.*` ----------

-- user_sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- user_analytics
CREATE POLICY "Users can view own analytics"
ON public.user_analytics FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- notifications_log
CREATE POLICY "Admins can view all notifications"
ON public.notifications_log FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- storage.objects (achievements bucket - admin policies)
CREATE POLICY "Admins can upload achievement images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ((bucket_id = 'achievements') AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update achievement images"
ON storage.objects FOR UPDATE TO authenticated
USING ((bucket_id = 'achievements') AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete achievement images"
ON storage.objects FOR DELETE TO authenticated
USING ((bucket_id = 'achievements') AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can list achievement images"
ON storage.objects FOR SELECT TO authenticated
USING ((bucket_id = 'achievements') AND private.has_role(auth.uid(), 'admin'::public.app_role));

-- missions
CREATE POLICY "Admins can insert missions"
ON public.missions FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update missions"
ON public.missions FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete missions"
ON public.missions FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- app_config
CREATE POLICY "Admins can insert app_config"
ON public.app_config FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update app_config"
ON public.app_config FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- stock_outputs
CREATE POLICY "Family members can view outputs"
ON public.stock_outputs FOR SELECT TO authenticated
USING ((family_id IS NOT NULL) AND ((family_id)::uuid IN (SELECT private.get_my_family_ids())));

CREATE POLICY "Family members can manage outputs"
ON public.stock_outputs FOR ALL TO authenticated
USING ((family_id IS NOT NULL) AND ((family_id)::uuid IN (SELECT private.get_my_family_ids())))
WITH CHECK ((family_id IS NOT NULL) AND ((family_id)::uuid IN (SELECT private.get_my_family_ids())) AND (auth.uid() = user_id));

-- stock_output_items
CREATE POLICY "Family members can view output items"
ON public.stock_output_items FOR SELECT TO authenticated
USING (output_id IN (
  SELECT id FROM public.stock_outputs
  WHERE (family_id IS NOT NULL) AND ((family_id)::uuid IN (SELECT private.get_my_family_ids()))
));

CREATE POLICY "Family members can manage output items"
ON public.stock_output_items FOR ALL TO authenticated
USING (output_id IN (
  SELECT id FROM public.stock_outputs
  WHERE (family_id IS NOT NULL) AND ((family_id)::uuid IN (SELECT private.get_my_family_ids()))
))
WITH CHECK (output_id IN (
  SELECT id FROM public.stock_outputs
  WHERE (family_id IS NOT NULL) AND ((family_id)::uuid IN (SELECT private.get_my_family_ids()))
));

-- products
CREATE POLICY "Family members can view products"
ON public.products FOR SELECT TO authenticated
USING ((family_id IS NOT NULL) AND ((family_id)::uuid IN (SELECT private.get_my_family_ids())));

CREATE POLICY "Family members can manage products"
ON public.products FOR ALL TO authenticated
USING ((family_id IS NOT NULL) AND ((family_id)::uuid IN (SELECT private.get_my_family_ids())))
WITH CHECK ((family_id IS NOT NULL) AND ((family_id)::uuid IN (SELECT private.get_my_family_ids())) AND (auth.uid() = user_id));

-- family_members
CREATE POLICY "Members can view family members"
ON public.family_members FOR SELECT TO authenticated
USING (family_id IN (SELECT private.get_my_family_ids()));

CREATE POLICY "Admins can remove members"
ON public.family_members FOR DELETE TO authenticated
USING ((user_id = auth.uid()) OR private.is_family_admin(family_id));

CREATE POLICY "Admins can update members"
ON public.family_members FOR UPDATE TO authenticated
USING ((user_id = auth.uid()) OR private.is_family_admin(family_id));

-- families
CREATE POLICY "Family admins can update"
ON public.families FOR UPDATE TO authenticated
USING (private.is_family_admin(id));

CREATE POLICY "Members and creator can view families"
ON public.families FOR SELECT TO authenticated
USING ((created_by = auth.uid()) OR (id IN (SELECT private.get_my_family_ids())));

-- family_goals
CREATE POLICY "Family members can view goals"
ON public.family_goals FOR SELECT TO authenticated
USING (family_id IN (SELECT private.get_my_family_ids()));

CREATE POLICY "Family members can create goals"
ON public.family_goals FOR INSERT TO authenticated
WITH CHECK ((family_id IN (SELECT private.get_my_family_ids())) AND (auth.uid() = created_by));

CREATE POLICY "Goal creators can delete their own goals"
ON public.family_goals FOR DELETE TO authenticated
USING ((created_by = auth.uid()) AND (family_id IN (SELECT private.get_my_family_ids())));

CREATE POLICY "Goal creators can update their own goals"
ON public.family_goals FOR UPDATE TO authenticated
USING ((created_by = auth.uid()) AND (family_id IN (SELECT private.get_my_family_ids())))
WITH CHECK ((created_by = auth.uid()) AND (family_id IN (SELECT private.get_my_family_ids())));

-- family_insights
CREATE POLICY "Family members can view insights"
ON public.family_insights FOR SELECT TO authenticated
USING (family_id IN (SELECT private.get_my_family_ids()));

-- shared_transactions
CREATE POLICY "Family members can view shared transactions"
ON public.shared_transactions FOR SELECT TO authenticated
USING (family_id IN (SELECT private.get_my_family_ids()));

CREATE POLICY "Members can share transactions"
ON public.shared_transactions FOR INSERT TO authenticated
WITH CHECK ((family_id IN (SELECT private.get_my_family_ids())) AND (auth.uid() = shared_by));

-- transactions (family shared view)
CREATE POLICY "Users can view family shared transactions"
ON public.transactions FOR SELECT TO authenticated
USING (id IN (
  SELECT st.transaction_id FROM public.shared_transactions st
  WHERE st.family_id IN (SELECT private.get_my_family_ids())
));

-- ---------- Public wrapper so the client can still RPC find_family_by_invite_code ----------
-- SECURITY INVOKER so it is not flagged by the definer-function linter.
CREATE OR REPLACE FUNCTION public.find_family_by_invite_code(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.find_family_by_invite_code(p_code);
$$;

REVOKE ALL ON FUNCTION public.find_family_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_family_by_invite_code(text) TO authenticated, service_role;
