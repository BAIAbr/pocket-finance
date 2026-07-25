
-- Revoke public access to SECURITY DEFINER functions not meant to be user-callable
REVOKE ALL ON FUNCTION public.cc_process_recurring() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cc_process_recurring() TO service_role;

REVOKE ALL ON FUNCTION public.cc_ensure_invoice(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cc_ensure_invoice(uuid, date) TO service_role;

-- Narrow piggy_bank family visibility to rows that belong to a family the user is in
DROP POLICY IF EXISTS "Family members can view piggy banks" ON public.piggy_bank;
CREATE POLICY "Family members can view piggy banks"
  ON public.piggy_bank
  FOR SELECT
  USING (
    family_id IS NOT NULL
    AND family_id::uuid IN (SELECT private.get_my_family_ids())
  );

DROP POLICY IF EXISTS "Family members can view piggy bank transactions" ON public.piggy_bank_transactions;
CREATE POLICY "Family members can view piggy bank transactions"
  ON public.piggy_bank_transactions
  FOR SELECT
  USING (
    piggy_bank_id IN (
      SELECT pb.id FROM public.piggy_bank pb
      WHERE pb.family_id IS NOT NULL
        AND pb.family_id::uuid IN (SELECT private.get_my_family_ids())
    )
  );
