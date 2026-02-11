
-- Deny INSERT for regular users (notifications are created by backend/service role only)
CREATE POLICY "Deny user insert on notifications_log"
ON public.notifications_log
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Deny UPDATE for regular users
CREATE POLICY "Deny user update on notifications_log"
ON public.notifications_log
FOR UPDATE
TO authenticated
USING (false);

-- Deny DELETE for regular users
CREATE POLICY "Deny user delete on notifications_log"
ON public.notifications_log
FOR DELETE
TO authenticated
USING (false);
