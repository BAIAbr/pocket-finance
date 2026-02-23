
-- Allow users to view transactions that are shared with their family
CREATE POLICY "Users can view family shared transactions" ON public.transactions FOR SELECT
USING (
  id IN (
    SELECT st.transaction_id 
    FROM shared_transactions st 
    WHERE st.family_id IN (SELECT public.get_my_family_ids())
  )
);
