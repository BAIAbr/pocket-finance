
-- Ensure private schema exists (already used by find_family_by_invite_code)
CREATE SCHEMA IF NOT EXISTS private;

-- =========================================================
-- 1) Move get_vip_code_info -> private
-- =========================================================
CREATE OR REPLACE FUNCTION private.get_vip_code_info(p_code text)
RETURNS TABLE(valid boolean, reason text, code text, description text, plan_code text, plan_name text, duration_days integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code public.vip_codes%ROWTYPE;
  v_plan_name TEXT;
BEGIN
  SELECT * INTO v_code FROM public.vip_codes WHERE upper(vip_codes.code) = upper(p_code);
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT, p_code, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;
  IF NOT v_code.is_active THEN
    RETURN QUERY SELECT false, 'inactive'::TEXT, v_code.code, v_code.description, v_code.plan_code, NULL::TEXT, v_code.duration_days;
    RETURN;
  END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN QUERY SELECT false, 'expired'::TEXT, v_code.code, v_code.description, v_code.plan_code, NULL::TEXT, v_code.duration_days;
    RETURN;
  END IF;
  IF v_code.max_uses IS NOT NULL AND v_code.uses_count >= v_code.max_uses THEN
    RETURN QUERY SELECT false, 'max_uses'::TEXT, v_code.code, v_code.description, v_code.plan_code, NULL::TEXT, v_code.duration_days;
    RETURN;
  END IF;
  SELECT name INTO v_plan_name FROM public.subscription_plans WHERE subscription_plans.code = v_code.plan_code;
  RETURN QUERY SELECT true, 'ok'::TEXT, v_code.code, v_code.description, v_code.plan_code, v_plan_name, v_code.duration_days;
END;
$function$;

REVOKE ALL ON FUNCTION private.get_vip_code_info(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_vip_code_info(text) TO service_role;

DROP FUNCTION IF EXISTS public.get_vip_code_info(text);

-- =========================================================
-- 2) Move register_vip_view -> private
-- =========================================================
CREATE OR REPLACE FUNCTION private.register_vip_view(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.vip_codes
     SET views_count = views_count + 1
   WHERE upper(code) = upper(p_code);
END;
$function$;

REVOKE ALL ON FUNCTION private.register_vip_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.register_vip_view(text) TO service_role;

DROP FUNCTION IF EXISTS public.register_vip_view(text);

-- =========================================================
-- 3) Move award_mission -> private
-- =========================================================
CREATE OR REPLACE FUNCTION private.award_mission(p_user_id uuid, p_mission_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := p_user_id;
  v_mission public.missions%ROWTYPE;
  v_history_id uuid;
  v_total int;
  v_level int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_mission FROM public.missions WHERE key = p_mission_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mission_not_found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_mission_history
    WHERE user_id = v_uid AND mission_id = v_mission.id
  ) THEN
    RETURN jsonb_build_object('already_completed', true);
  END IF;

  INSERT INTO public.user_mission_history (user_id, mission_id, xp_earned, shown_home, shown_popup)
  VALUES (v_uid, v_mission.id, v_mission.xp_reward, false, false)
  RETURNING id INTO v_history_id;

  INSERT INTO public.user_xp (user_id, total_xp, level)
  VALUES (v_uid, v_mission.xp_reward, GREATEST(1, (v_mission.xp_reward / 200) + 1))
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = public.user_xp.total_xp + v_mission.xp_reward,
        level    = GREATEST(1, ((public.user_xp.total_xp + v_mission.xp_reward) / 200) + 1)
  RETURNING total_xp, level INTO v_total, v_level;

  INSERT INTO public.user_gamification_notifications (user_id, type, title, description, icon)
  VALUES (v_uid, 'mission_complete',
          'Missão Concluída: ' || v_mission.name,
          v_mission.description, v_mission.icon);

  RETURN jsonb_build_object(
    'history_id', v_history_id,
    'mission_id', v_mission.id,
    'xp_earned', v_mission.xp_reward,
    'total_xp', v_total,
    'level', v_level
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.award_mission(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.award_mission(uuid, text) TO service_role;

DROP FUNCTION IF EXISTS public.award_mission(text);

-- =========================================================
-- 4) Move update_weekly_mission_progress -> private
-- =========================================================
CREATE OR REPLACE FUNCTION private.update_weekly_mission_progress(p_user_id uuid, p_mission_id uuid, p_new_value integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := p_user_id;
  v_row public.weekly_missions%ROWTYPE;
  v_completed boolean;
  v_total int;
  v_level int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_row FROM public.weekly_missions
    WHERE id = p_mission_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF v_row.is_completed THEN
    RETURN jsonb_build_object('already_completed', true);
  END IF;

  p_new_value := GREATEST(v_row.current_value, LEAST(p_new_value, v_row.target_value));
  v_completed := p_new_value >= v_row.target_value;

  UPDATE public.weekly_missions
     SET current_value = p_new_value,
         is_completed  = v_completed
   WHERE id = p_mission_id;

  IF v_completed THEN
    INSERT INTO public.user_xp (user_id, total_xp, level)
    VALUES (v_uid, v_row.xp_reward, GREATEST(1, (v_row.xp_reward / 200) + 1))
    ON CONFLICT (user_id) DO UPDATE
      SET total_xp = public.user_xp.total_xp + v_row.xp_reward,
          level    = GREATEST(1, ((public.user_xp.total_xp + v_row.xp_reward) / 200) + 1)
    RETURNING total_xp, level INTO v_total, v_level;

    INSERT INTO public.user_gamification_notifications (user_id, type, title, description, icon)
    VALUES (v_uid, 'mission_complete',
            'Missão Semanal: ' || v_row.title,
            v_row.description, v_row.icon);
  END IF;

  RETURN jsonb_build_object(
    'current_value', p_new_value,
    'is_completed', v_completed,
    'total_xp', v_total,
    'level', v_level
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.update_weekly_mission_progress(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.update_weekly_mission_progress(uuid, uuid, integer) TO service_role;

DROP FUNCTION IF EXISTS public.update_weekly_mission_progress(uuid, integer);
