-- Add fields to piggy_bank to support names, targets and individual CDI
ALTER TABLE public.piggy_bank
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Cofrinho Principal',
  ADD COLUMN IF NOT EXISTS target_amount NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'PiggyBank',
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#10B981',
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false;

-- Allow users to delete their own piggy banks (for multiple support)
CREATE POLICY "Users can delete own piggy bank" 
ON public.piggy_bank 
FOR DELETE 
USING (auth.uid() = user_id);

-- Link piggy bank transactions to a specific piggy bank
ALTER TABLE public.piggy_bank_transactions 
  ADD COLUMN IF NOT EXISTS piggy_bank_id UUID REFERENCES public.piggy_bank(id) ON DELETE CASCADE;

-- Update existing transactions to point to the user's piggy bank
UPDATE public.piggy_bank_transactions pbt
SET piggy_bank_id = (
  SELECT pb.id FROM public.piggy_bank pb WHERE pb.user_id = pbt.user_id LIMIT 1
)
WHERE pbt.piggy_bank_id IS NULL;