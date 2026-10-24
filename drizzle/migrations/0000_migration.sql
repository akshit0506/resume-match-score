CREATE TABLE public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  job_title text,
  company text,
  resume_name text,
  score integer NOT NULL,
  verdict text NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own scans" ON public.scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners delete own scans" ON public.scans FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX scans_user_created_idx ON public.scans (user_id, created_at DESC);