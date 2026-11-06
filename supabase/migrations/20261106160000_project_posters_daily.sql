-- 2026-11-06 AI 포스터: 새 포스터는 프로젝트마다 하루(KST) 1개 (사용자 결정). 고치기는 ai_usage 한도 그대로.
-- 지웠다가 같은 날 다시 만드는 것도 막으려고 만든 날을 따로 남긴다(project_poster_days). 서비스 키 전용.

CREATE TABLE public.project_poster_days (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (project_id, day)
);

ALTER TABLE public.project_poster_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_poster_days FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.project_posters_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM 1 FROM public.projects WHERE id = NEW.project_id FOR UPDATE;
  IF (SELECT count(*) FROM public.project_posters WHERE project_id = NEW.project_id) >= 3 THEN
    RAISE EXCEPTION 'poster_limit' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.project_poster_days (project_id, day)
  VALUES (NEW.project_id, (now() AT TIME ZONE 'Asia/Seoul')::date)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'poster_daily' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
