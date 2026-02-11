
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    -- Create default income categories
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
    -- Create default expense categories
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
