-- 2026-11-08 사용자 결정: "새 포스터는 프로젝트마다 하루 1개"를 없앤다.
-- 비용은 ai_usage(글·그림 횟수)가 이미 막고 있어 겹치는 제한이었다. 프로젝트당 5개(poster_limit)는 그대로.

CREATE OR REPLACE FUNCTION public.project_posters_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM 1 FROM public.projects WHERE id = NEW.project_id FOR UPDATE;
  IF (SELECT count(*) FROM public.project_posters WHERE project_id = NEW.project_id) >= 5 THEN
    RAISE EXCEPTION 'poster_limit' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TABLE public.project_poster_days;
