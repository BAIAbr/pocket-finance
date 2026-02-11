
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS for user_roles - only admins can read all, users can read own
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Deny anon access to user_roles"
ON public.user_roles FOR SELECT
TO anon
USING (false);

-- 5. Create user_sessions table
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  login_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz,
  duration_minutes numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sessions"
ON public.user_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON public.user_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Deny anon access to user_sessions"
ON public.user_sessions FOR SELECT
TO anon
USING (false);

-- 6. Create user_analytics table
CREATE TABLE public.user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  last_login_at timestamptz,
  total_time_online numeric NOT NULL DEFAULT 0,
  total_sessions integer NOT NULL DEFAULT 0,
  average_session_time numeric NOT NULL DEFAULT 0,
  status_usuario text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
ON public.user_analytics FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own analytics"
ON public.user_analytics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics"
ON public.user_analytics FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Deny anon access to user_analytics"
ON public.user_analytics FOR SELECT
TO anon
USING (false);

-- 7. Trigger to update updated_at
CREATE TRIGGER update_user_analytics_updated_at
BEFORE UPDATE ON public.user_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Update handle_new_user to create analytics row and assign 'user' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create role for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_analytics (user_id) VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create analytics for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
    (NEW.id, 'Salário', 'Briefcase', '#10B981', 'income', true),
    (NEW.id, 'Freelance', 'Laptop', '#34D399', 'income', true),
    (NEW.id, 'Investimentos', 'TrendingUp', '#6EE7B7', 'income', true),
    (NEW.id, 'Presentes', 'Gift', '#A7F3D0', 'income', true),
    (NEW.id, 'Outros', 'Plus', '#059669', 'income', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create income categories for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
    (NEW.id, 'Alimentação', 'UtensilsCrossed', '#F43F5E', 'expense', true),
    (NEW.id, 'Transporte', 'Car', '#FB7185', 'expense', true),
    (NEW.id, 'Moradia', 'Home', '#FDA4AF', 'expense', true),
    (NEW.id, 'Lazer', 'Gamepad2', '#E11D48', 'expense', true),
    (NEW.id, 'Saúde', 'Heart', '#BE123C', 'expense', true),
    (NEW.id, 'Educação', 'GraduationCap', '#9F1239', 'expense', true),
    (NEW.id, 'Compras', 'ShoppingBag', '#881337', 'expense', true),
    (NEW.id, 'Contas', 'Receipt', '#F472B6', 'expense', true),
    (NEW.id, 'Outros', 'MoreHorizontal', '#DB2777', 'expense', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create expense categories for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
