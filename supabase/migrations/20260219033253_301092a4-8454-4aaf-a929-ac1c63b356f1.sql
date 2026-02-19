
-- Add image_url column to missions table
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for achievement images
INSERT INTO storage.buckets (id, name, public) VALUES ('achievements', 'achievements', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for achievements bucket
CREATE POLICY "Achievement images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'achievements');

CREATE POLICY "Admins can upload achievement images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'achievements' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update achievement images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'achievements' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete achievement images"
ON storage.objects FOR DELETE
USING (bucket_id = 'achievements' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Admin RLS policies for missions CRUD
CREATE POLICY "Admins can insert missions"
ON public.missions FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update missions"
ON public.missions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete missions"
ON public.missions FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));
