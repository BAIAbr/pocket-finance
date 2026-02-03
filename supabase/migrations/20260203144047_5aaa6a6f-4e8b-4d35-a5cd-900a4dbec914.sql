-- Remove unique constraint on user_id to allow multiple piggy banks per user
ALTER TABLE public.piggy_bank DROP CONSTRAINT piggy_bank_user_id_key;

-- Update the handle_new_user function to NOT create a default piggy bank
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
  
  -- Don't create a default piggy bank anymore - users will create their own
  
  -- Create default income categories
  INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
  (NEW.id, 'Salário', 'Briefcase', '#10B981', 'income', true),
  (NEW.id, 'Freelance', 'Laptop', '#34D399', 'income', true),
  (NEW.id, 'Investimentos', 'TrendingUp', '#6EE7B7', 'income', true),
  (NEW.id, 'Presentes', 'Gift', '#A7F3D0', 'income', true),
  (NEW.id, 'Outros', 'Plus', '#059669', 'income', true);
  
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
  
  RETURN NEW;
END;
$function$;