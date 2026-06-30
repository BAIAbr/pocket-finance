
CREATE POLICY "Family members can update family piggy banks"
ON public.piggy_bank FOR UPDATE
TO authenticated
USING (family_id IS NOT NULL AND family_id::uuid IN (SELECT private.get_my_family_ids()))
WITH CHECK (family_id IS NOT NULL AND family_id::uuid IN (SELECT private.get_my_family_ids()));

CREATE POLICY "Family members can delete family piggy banks"
ON public.piggy_bank FOR DELETE
TO authenticated
USING (family_id IS NOT NULL AND family_id::uuid IN (SELECT private.get_my_family_ids()));

CREATE POLICY "Family members can update family piggy transactions"
ON public.piggy_bank_transactions FOR UPDATE
TO authenticated
USING (
  piggy_bank_id IN (
    SELECT id FROM public.piggy_bank
    WHERE family_id IS NOT NULL
      AND family_id::uuid IN (SELECT private.get_my_family_ids())
  )
)
WITH CHECK (
  piggy_bank_id IN (
    SELECT id FROM public.piggy_bank
    WHERE family_id IS NOT NULL
      AND family_id::uuid IN (SELECT private.get_my_family_ids())
  )
);

CREATE POLICY "Family members can delete family piggy transactions"
ON public.piggy_bank_transactions FOR DELETE
TO authenticated
USING (
  piggy_bank_id IN (
    SELECT id FROM public.piggy_bank
    WHERE family_id IS NOT NULL
      AND family_id::uuid IN (SELECT private.get_my_family_ids())
  )
);

CREATE POLICY "Family members can delete shared transactions"
ON public.transactions FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT st.transaction_id FROM public.shared_transactions st
    WHERE st.family_id IN (SELECT private.get_my_family_ids())
  )
);

CREATE POLICY "Family members can update shared transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT st.transaction_id FROM public.shared_transactions st
    WHERE st.family_id IN (SELECT private.get_my_family_ids())
  )
)
WITH CHECK (
  id IN (
    SELECT st.transaction_id FROM public.shared_transactions st
    WHERE st.family_id IN (SELECT private.get_my_family_ids())
  )
);
