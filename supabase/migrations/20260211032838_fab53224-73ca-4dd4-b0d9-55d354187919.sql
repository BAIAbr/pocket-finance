
-- Add streak tracking columns to user_analytics
ALTER TABLE public.user_analytics
ADD COLUMN current_streak integer NOT NULL DEFAULT 0,
ADD COLUMN last_activity_date date DEFAULT NULL,
ADD COLUMN missed_days_in_week integer NOT NULL DEFAULT 0,
ADD COLUMN week_cycle_start date DEFAULT NULL;
