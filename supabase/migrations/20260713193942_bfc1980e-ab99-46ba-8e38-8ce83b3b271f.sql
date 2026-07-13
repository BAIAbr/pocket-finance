
CREATE OR REPLACE FUNCTION public.user_plan_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan_code FROM public.user_subscriptions
      WHERE user_id = _user_id
        AND status IN ('active','trial','vip')
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY started_at DESC LIMIT 1),
    'free'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_feature(_user_id uuid, _slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.plan_features pf
    JOIN public.feature_flags f ON f.id = pf.feature_id AND f.active = true
    JOIN public.subscription_plans sp ON sp.id = pf.plan_id
    WHERE f.slug = _slug
      AND pf.enabled = true
      AND sp.code = public.user_plan_code(_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_plan_limit(_user_id uuid, _key text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT pl.value
  FROM public.plan_limits pl
  JOIN public.subscription_plans sp ON sp.id = pl.plan_id
  WHERE sp.code = public.user_plan_code(_user_id)
    AND pl.key = _key
  LIMIT 1;
$$;
