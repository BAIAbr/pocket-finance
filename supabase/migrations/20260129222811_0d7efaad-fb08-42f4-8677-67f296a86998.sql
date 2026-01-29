-- Add UPDATE policy for piggy_bank_transactions
CREATE POLICY "Users can update own piggy transactions"
ON public.piggy_bank_transactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Add DELETE policy for piggy_bank_transactions
CREATE POLICY "Users can delete own piggy transactions"
ON public.piggy_bank_transactions
FOR DELETE
USING (auth.uid() = user_id);