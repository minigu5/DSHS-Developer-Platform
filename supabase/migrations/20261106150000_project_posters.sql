-- 2026-11-06 AI 포스터 만들기 (설계: docs/superpowers/specs/2026-11-05-ai-poster-design.md §8)
-- 1) project_posters — 프로젝트의 AI 포스터(현재 HTML·그림 URL·버전·대화). 서버가 권한을 확인한 뒤 서비스 키로만 읽고 쓴다
--    (Gemini 키·횟수 검사가 어차피 서버에 있다). RLS 켜고 사용자 키 정책은 두지 않는다.
-- 2) ai_usage — 하루 AI 사용 횟수. 글(Gemini)은 KST 자정, 그림(Workers AI)은 Cloudflare 할당량과 같은 UTC 자정에 새 날.
-- 3) reserve_ai_usage / release_ai_usage — 요청 시작 때 1회 예약(동시 요청에도 상한이 안 새게 잠금), 실패하면 돌려준다.

CREATE TABLE public.project_posters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  html text,
  art_url text,
  art_order jsonb,
  versions jsonb NOT NULL DEFAULT '[]'::jsonb,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  band_tone text NOT NULL DEFAULT 'light' CHECK (band_tone IN ('light', 'dark')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_posters_project_id_idx ON public.project_posters (project_id);
CREATE INDEX project_posters_created_by_idx ON public.project_posters (created_by);

ALTER TABLE public.project_posters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_posters FROM anon, authenticated;

-- 프로젝트마다 3개까지(설계 §4). 같은 프로젝트에 동시에 만들 때도 새지 않게 프로젝트 줄을 잠근다.
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_posters_limit
  BEFORE INSERT ON public.project_posters
  FOR EACH ROW EXECUTE FUNCTION public.project_posters_limit();

CREATE TABLE public.ai_usage (
  kind text NOT NULL CHECK (kind IN ('text', 'art')),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (kind, user_id, day)
);
CREATE INDEX ai_usage_kind_day_idx ON public.ai_usage (kind, day);
CREATE INDEX ai_usage_user_id_idx ON public.ai_usage (user_id);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.ai_usage_day(p_kind text)
RETURNS date
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN p_kind = 'art' THEN (now() AT TIME ZONE 'UTC')::date ELSE (now() AT TIME ZONE 'Asia/Seoul')::date END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_ai_usage(p_kind text, p_user uuid, p_user_limit integer, p_site_limit integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_day date := public.ai_usage_day(p_kind);
  v_site integer;
  v_mine integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ai_usage:' || p_kind || ':' || v_day::text));
  SELECT coalesce(sum(count), 0) INTO v_site FROM public.ai_usage WHERE kind = p_kind AND day = v_day;
  IF v_site >= p_site_limit THEN
    RETURN 'site_limit';
  END IF;
  SELECT coalesce(max(count), 0) INTO v_mine FROM public.ai_usage WHERE kind = p_kind AND day = v_day AND user_id = p_user;
  IF v_mine >= p_user_limit THEN
    RETURN 'user_limit';
  END IF;
  INSERT INTO public.ai_usage (kind, user_id, day, count) VALUES (p_kind, p_user, v_day, 1)
  ON CONFLICT (kind, user_id, day) DO UPDATE SET count = public.ai_usage.count + 1;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_usage(p_kind text, p_user uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.ai_usage SET count = count - 1
  WHERE kind = p_kind AND user_id = p_user AND day = public.ai_usage_day(p_kind) AND count > 0;
$$;

REVOKE ALL ON FUNCTION public.project_posters_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_usage_day(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_ai_usage(text, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_ai_usage(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_usage_day(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage(text, uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ai_usage(text, uuid) TO service_role;
