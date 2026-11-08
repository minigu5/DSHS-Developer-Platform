-- 2026-11-08 하트 누른 사람을 숨기기 1단계(A) — 하트 수를 projects 칸으로.
-- 사용자 결정: 프로필 즐겨찾기는 본인·관리자만, project_hearts 는 본인 행만 읽게 바꾼다(B, 코드 배포 뒤 별도 migration).
-- 그러면 카드·상세의 project_hearts(count)·count 조회가 내 하트만 세게 되므로, 먼저 수를 트리거가 채우는 칸으로 옮긴다.
-- 만든 사람이 자기 익명 프로젝트에 누른 하트도 센다(수만으로는 누가 눌렀는지 알 수 없다).

ALTER TABLE public.projects
  ADD COLUMN heart_count integer NOT NULL DEFAULT 0 CHECK (heart_count >= 0);

GRANT SELECT (heart_count) ON public.projects TO anon, authenticated;

UPDATE public.projects p
SET heart_count = h.n
FROM (SELECT project_id, count(*)::integer AS n FROM public.project_hearts GROUP BY project_id) h
WHERE h.project_id = p.id;

-- DEFINER: 하트를 누른 사람은 그 프로젝트를 고칠 권한이 없다. current_user 가 함수 주인이 되어
-- projects_guard_owner·zz_ban_guard(사용자 키일 때만 검사)도 통과한다. updated_at 은 앱이 채우는 칸이라 안 바뀐다.
CREATE OR REPLACE FUNCTION public.project_hearts_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects SET heart_count = heart_count + 1 WHERE id = NEW.project_id;
  ELSE
    -- 프로젝트가 지워지며 따라 지워질 때는 고칠 행이 없다(0행)
    UPDATE public.projects SET heart_count = greatest(heart_count - 1, 0) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.project_hearts_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER project_hearts_count
  AFTER INSERT OR DELETE ON public.project_hearts
  FOR EACH ROW EXECUTE FUNCTION public.project_hearts_count();

-- 사용자 키로는 heart_count 를 못 바꾼다(click_count 와 같다). 20261107120000 정의에 heart_count 만 더함.
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
    NEW.heart_count := 0;
    NEW.poster_id := NULL;
    NEW.poster_image_url := NULL;
    NEW.poster_is_ai := false;
    NEW.poster_hung_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.author_id IS DISTINCT FROM OLD.author_id
     OR NEW.click_count IS DISTINCT FROM OLD.click_count
     OR NEW.heart_count IS DISTINCT FROM OLD.heart_count
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
