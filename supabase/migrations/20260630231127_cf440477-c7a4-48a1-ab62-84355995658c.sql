
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip TEXT,
  user_agent TEXT,
  consumed_ip TEXT,
  consumed_user_agent TEXT
);

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Lock the table from clients entirely; only service_role (edge functions) may touch it.
GRANT ALL ON public.password_reset_tokens TO service_role;

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated => zero access from the client.
-- service_role bypasses RLS, so edge functions still work.
