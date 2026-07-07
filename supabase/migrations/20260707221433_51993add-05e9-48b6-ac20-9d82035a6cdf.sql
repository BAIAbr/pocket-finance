
-- =========================================================================
-- 1) Plan self-upgrade bypass: restrict user_subscriptions writes to free tier
-- =========================================================================
DROP POLICY IF EXISTS "User inserts own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "User updates own subscription" ON public.user_subscriptions;

CREATE POLICY "User inserts own free subscription"
  ON public.user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND plan_code = 'free'
  );

CREATE POLICY "User updates own subscription to free"
  ON public.user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND plan_code = 'free'
  );

-- =========================================================================
-- 2) Family members role escalation
-- =========================================================================
DROP POLICY IF EXISTS "Users can join families" ON public.family_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.family_members;

-- Self-inserts must be role='member', unless the user created the family (admin bootstrap)
CREATE POLICY "Users can join families as member"
  ON public.family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      role = 'member'
      OR (
        role = 'admin'
        AND EXISTS (
          SELECT 1 FROM public.families f
          WHERE f.id = family_id AND f.created_by = auth.uid()
        )
      )
    )
  );

-- Admins can update anyone's row; a non-admin can update only their own row
-- and MUST NOT change their own role.
CREATE POLICY "Admins update members; users update own non-role fields"
  ON public.family_members
  FOR UPDATE
  TO authenticated
  USING (
    private.is_family_admin(family_id) OR user_id = auth.uid()
  )
  WITH CHECK (
    private.is_family_admin(family_id)
    OR (
      user_id = auth.uid()
      AND role = (SELECT fm.role FROM public.family_members fm WHERE fm.id = family_members.id)
    )
  );

-- =========================================================================
-- 3) Installment purchases/items: restrict UPDATE to owner only
-- =========================================================================
DROP POLICY IF EXISTS "own or family purchases update" ON public.installment_purchases;
CREATE POLICY "own purchases update"
  ON public.installment_purchases
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own or family items update" ON public.installment_items;
CREATE POLICY "own items update"
  ON public.installment_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 4) Products / stock_outputs / stock_output_items:
--    remove permissive ALL family policies (SELECT and per-owner CRUD remain)
-- =========================================================================
DROP POLICY IF EXISTS "Family members can manage products" ON public.products;
DROP POLICY IF EXISTS "Family members can manage outputs" ON public.stock_outputs;
DROP POLICY IF EXISTS "Family members can manage output items" ON public.stock_output_items;

-- =========================================================================
-- 5) Gamification server-side validation
-- =========================================================================
-- Lock down direct client writes on user_xp / user_mission_history / weekly_missions
DROP POLICY IF EXISTS "Users can insert own xp" ON public.user_xp;
DROP POLICY IF EXISTS "Users can update own xp" ON public.user_xp;
DROP POLICY IF EXISTS "Users can insert own mission history" ON public.user_mission_history;
DROP POLICY IF EXISTS "Users can update own mission history" ON public.user_mission_history;
DROP POLICY IF EXISTS "Users can insert own weekly missions" ON public.weekly_missions;
DROP POLICY IF EXISTS "Users can update own weekly missions" ON public.weekly_missions;

-- Allow users to only flag a completion popup/home banner as shown (no XP fields)
CREATE POLICY "Users can mark own mission history as shown"
  ON public.user_mission_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND mission_id = (SELECT h.mission_id FROM public.user_mission_history h WHERE h.id = user_mission_history.id)
    AND xp_earned  = (SELECT h.xp_earned  FROM public.user_mission_history h WHERE h.id = user_mission_history.id)
  );

-- Award mission RPC (validates uniqueness, uses mission's real xp_reward)
CREATE OR REPLACE FUNCTION public.award_mission(p_mission_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
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
$$;

REVOKE ALL ON FUNCTION public.award_mission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_mission(text) TO authenticated;

-- Weekly mission progress RPC (server picks completion from row's own target_value)
CREATE OR REPLACE FUNCTION public.update_weekly_mission_progress(
  p_mission_id uuid,
  p_new_value int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
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

  -- Clamp progress to [current_value, target_value]
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
$$;

REVOKE ALL ON FUNCTION public.update_weekly_mission_progress(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_weekly_mission_progress(uuid, int) TO authenticated;

-- =========================================================================
-- 6) Restrict find_family_by_invite_code to authenticated only (no anon)
-- =========================================================================
REVOKE ALL ON FUNCTION public.find_family_by_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_family_by_invite_code(text) TO authenticated;
