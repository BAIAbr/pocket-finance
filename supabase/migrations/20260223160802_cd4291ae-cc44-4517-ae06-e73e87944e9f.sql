-- Add family_id column to piggy_bank to distinguish personal vs family piggy banks
ALTER TABLE public.piggy_bank ADD COLUMN family_id TEXT DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX idx_piggy_bank_family_id ON public.piggy_bank(family_id);
