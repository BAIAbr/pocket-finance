
-- Allow family members to view each other's piggy banks
CREATE POLICY "Family members can view piggy banks"
ON public.piggy_bank
FOR SELECT
USING (
  user_id IN (
    SELECT fm2.user_id 
    FROM family_members fm1
    JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid()
  )
);

-- Allow family members to view each other's piggy bank transactions
CREATE POLICY "Family members can view piggy bank transactions"
ON public.piggy_bank_transactions
FOR SELECT
USING (
  user_id IN (
    SELECT fm2.user_id 
    FROM family_members fm1
    JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid()
  )
);
