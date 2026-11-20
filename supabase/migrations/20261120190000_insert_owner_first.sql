-- 2026-11-20 사각지대 보안 감사 반영
--
-- 1) BEFORE 트리거는 RLS WITH CHECK 보다 먼저 돈다. 그래서 사용자 키로 남의 id 를 적어 INSERT 하면, RLS 에 막히기 전에
--    트리거가 그 사람 기준으로 검사하고 오류가 달라져 정보가 샜다:
--    - projects_guard_duplicate(DEFINER): author_id 를 학생마다 바꿔 같은 제목으로 보내면 주인 id 에서만 23505
--      → 만든 지 10분 안의 익명 프로젝트 주인을 알아낼 수 있었다.
--    - guard_banned_writes(zz_ban_guard): 주인 칸이 차단된 사람이면 user_banned, 아니면 RLS 오류 → 남의 차단 여부.
--    사용자 키(anon·authenticated)의 INSERT 에서 주인 칸이 내 id 가 아니면, 다른 트리거보다 먼저(이름 a0_) RLS 와 같은
--    오류로 거절한다. 주인 칸이 비어 있으면 그대로 두고 RLS 가 판단한다. 서비스 키·DEFINER 함수는 그대로.
-- 2) events 는 표 전체 SELECT 라 created_by(관리자 id)가 공개였다 → 화면이 쓰는 칸만.

CREATE OR REPLACE FUNCTION public.guard_insert_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    v_owner := nullif(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid;
    IF v_owner IS NOT NULL AND v_owner IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'new row violates row-level security policy for table "%"', TG_TABLE_NAME
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a0_insert_owner ON public.projects;
CREATE TRIGGER a0_insert_owner BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_insert_owner('author_id');

DROP TRIGGER IF EXISTS a0_insert_owner ON public.project_comments;
CREATE TRIGGER a0_insert_owner BEFORE INSERT ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.guard_insert_owner('user_id');

DROP TRIGGER IF EXISTS a0_insert_owner ON public.project_hearts;
CREATE TRIGGER a0_insert_owner BEFORE INSERT ON public.project_hearts
  FOR EACH ROW EXECUTE FUNCTION public.guard_insert_owner('user_id');

DROP TRIGGER IF EXISTS a0_insert_owner ON public.ideas;
CREATE TRIGGER a0_insert_owner BEFORE INSERT ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.guard_insert_owner('author_id');

DROP TRIGGER IF EXISTS a0_insert_owner ON public.announcements;
CREATE TRIGGER a0_insert_owner BEFORE INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.guard_insert_owner('author_id');

-- 2) events: 칸 단위로(project_awards 와 같은 방식). 수상 배지가 events(name)으로 붙이므로 id·name 은 필요
REVOKE SELECT ON public.events FROM anon, authenticated;
GRANT SELECT (id, name, created_at) ON public.events TO anon, authenticated;
