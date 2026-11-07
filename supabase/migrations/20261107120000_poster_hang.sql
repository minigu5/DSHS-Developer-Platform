-- 2026-11-07 포스터 자리·걸기 (설계: docs/superpowers/specs/2026-11-07-poster-placement-promo-design.md)
-- 1) project_posters.kind — AI 포스터(html) / 직접 올린 그림(image_url). 개수는 합쳐서 프로젝트당 5개(사용자 결정),
--    "새 포스터 하루 1개"는 AI 비용 때문이라 AI만.
-- 2) 걸린 포스터 — 상세 페이지·빠른 상세가 anon 키로 읽어야 해서 projects 에 둔다(공개/비공개는 projects RLS 가 맡음).
--    poster_image_url·poster_is_ai 만 공개, poster_id·poster_hung_at 은 서비스 키로만. 사용자 키로는 못 바꾼다(서버 액션만).
-- 3) poster_id 가 비면(포스터 삭제 = FK SET NULL, 또는 내리기) 나머지 칸도 비운다.
-- 4) admin_actions 에 'unhang'(관리자가 걸린 포스터 내리기).

ALTER TABLE public.project_posters
  ADD COLUMN kind text NOT NULL DEFAULT 'ai' CHECK (kind IN ('ai', 'upload')),
  ADD COLUMN image_url text NULL,
  ADD CONSTRAINT project_posters_upload_has_image CHECK (kind <> 'upload' OR image_url IS NOT NULL);

ALTER TABLE public.projects
  ADD COLUMN poster_id uuid NULL REFERENCES public.project_posters(id) ON DELETE SET NULL,
  ADD COLUMN poster_image_url text NULL,
  ADD COLUMN poster_is_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN poster_hung_at timestamptz NULL;
CREATE INDEX projects_poster_id_idx ON public.projects (poster_id);

GRANT SELECT (poster_image_url, poster_is_ai) ON public.projects TO anon, authenticated;

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
  IF NEW.kind = 'ai' THEN
    INSERT INTO public.project_poster_days (project_id, day)
    VALUES (NEW.project_id, (now() AT TIME ZONE 'Asia/Seoul')::date)
    ON CONFLICT DO NOTHING;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'poster_daily' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.projects_guard_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.click_count := 0;
    NEW.poster_id := NULL;
    NEW.poster_image_url := NULL;
    NEW.poster_is_ai := false;
    NEW.poster_hung_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.author_id IS DISTINCT FROM OLD.author_id
     OR NEW.click_count IS DISTINCT FROM OLD.click_count
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.poster_id IS DISTINCT FROM OLD.poster_id
     OR NEW.poster_image_url IS DISTINCT FROM OLD.poster_image_url
     OR NEW.poster_is_ai IS DISTINCT FROM OLD.poster_is_ai
     OR NEW.poster_hung_at IS DISTINCT FROM OLD.poster_hung_at THEN
    RAISE EXCEPTION 'projects_owner_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.projects_poster_clear()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.poster_id IS NULL AND OLD.poster_id IS NOT NULL THEN
    NEW.poster_image_url := NULL;
    NEW.poster_is_ai := false;
    NEW.poster_hung_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_poster_clear
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_poster_clear();

ALTER TABLE public.admin_actions DROP CONSTRAINT admin_actions_action_check;
ALTER TABLE public.admin_actions
  ADD CONSTRAINT admin_actions_action_check
  CHECK (action IN ('delete', 'ban', 'unban', 'private', 'dismiss', 'revert', 'unhang'));
