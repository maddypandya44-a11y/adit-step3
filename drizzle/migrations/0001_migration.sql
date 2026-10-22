ALTER TABLE public.resumes ADD COLUMN parsed jsonb;
ALTER TABLE public.watched_companies DROP CONSTRAINT IF EXISTS watched_companies_ats_check;
ALTER TABLE public.watched_companies ADD CONSTRAINT watched_companies_ats_check CHECK (ats IN ('greenhouse','lever','ashby','workable','workday','oracle'));
ALTER TABLE public.applications ADD COLUMN job_id uuid, ADD COLUMN applied_at timestamptz;
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid(),
  display_name text,
  target_roles text[] NOT NULL DEFAULT '{}',
  locations text[] NOT NULL DEFAULT '{}',
  remote boolean NOT NULL DEFAULT false,
  seniority text,
  salary_min int,
  alert_email boolean NOT NULL DEFAULT true,
  daily_digest boolean NOT NULL DEFAULT true,
  weekly_digest boolean NOT NULL DEFAULT true,
  llm_api_key_encrypted text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  resume_id uuid NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  label text NOT NULL DEFAULT 'Version',
  content text NOT NULL,
  kind text NOT NULL DEFAULT 'improved' CHECK (kind IN ('original','improved','tailored')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.job_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  resume_id uuid NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  llm_score numeric NOT NULL CHECK (llm_score >= 0 AND llm_score <= 10),
  reason text NOT NULL DEFAULT '',
  rule_applied text,
  model text NOT NULL DEFAULT 'local',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, resume_id)
);
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  day date NOT NULL DEFAULT current_date,
  tokens_used int NOT NULL DEFAULT 0,
  UNIQUE (user_id, day)
);
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('new_match','digest','followup_due','system')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.application_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  resume_version_id uuid REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  cover_letter text NOT NULL DEFAULT '',
  answers jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','submitted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','linkedin')),
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sent','skipped')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  provider text NOT NULL CHECK (provider IN ('gmail','llm')),
  access_encrypted text,
  scopes text[] NOT NULL DEFAULT '{}',
  connected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','resume_versions','job_scores','ai_usage','alerts','application_packages','follow_ups','integrations'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "own rows" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;