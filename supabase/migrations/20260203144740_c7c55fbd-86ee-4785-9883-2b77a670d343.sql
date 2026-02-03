-- Add currency field to piggy_bank table
ALTER TABLE public.piggy_bank 
ADD COLUMN currency text NOT NULL DEFAULT 'BRL';

-- Add comment for clarity
COMMENT ON COLUMN public.piggy_bank.currency IS 'Currency code: BRL, USD, EUR, etc.';