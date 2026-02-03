-- Add CDI yield tracking fields to piggy_bank table
ALTER TABLE public.piggy_bank 
ADD COLUMN IF NOT EXISTS cdi_rate_annual numeric NOT NULL DEFAULT 14.15,
ADD COLUMN IF NOT EXISTS yield_start_date timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS principal_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_yield numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_yield_calculation timestamp with time zone DEFAULT now();

-- Update existing piggy banks to set principal_amount from current balance
UPDATE public.piggy_bank 
SET principal_amount = balance,
    yield_start_date = created_at,
    last_yield_calculation = now()
WHERE principal_amount = 0 AND balance > 0;

-- Create yield history table to track daily yields
CREATE TABLE IF NOT EXISTS public.piggy_bank_yield_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  piggy_bank_id uuid NOT NULL REFERENCES public.piggy_bank(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  principal_at_date numeric NOT NULL,
  daily_yield numeric NOT NULL,
  cumulative_yield numeric NOT NULL,
  cdi_rate_used numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(piggy_bank_id, date)
);

-- Enable RLS on yield history table
ALTER TABLE public.piggy_bank_yield_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for yield history
CREATE POLICY "Users can view own yield history" 
ON public.piggy_bank_yield_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own yield history" 
ON public.piggy_bank_yield_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_yield_history_piggy_bank_date 
ON public.piggy_bank_yield_history(piggy_bank_id, date DESC);