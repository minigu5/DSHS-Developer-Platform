-- 2026-11-05 같은 프로젝트가 연달아 여러 번 등록되는 것 막기
--
-- Jakal Office 가 10초 안에 6번 등록됐다. 등록 폼이 저장에 성공한 뒤에도 버튼을 다시 켜서
-- 페이지 이동(1~2초)을 기다리는 동안 누를 때마다 또 저장됐다(폼은 따로 고침).
-- 화면을 거치지 않는 API 직접 호출도 막도록 DB에서 거절한다:
-- 같은 사람이 같은 이름(앞뒤 공백·대소문자 무시)의 프로젝트를 10분 안에 또 만들면 실패.
--
-- author_id 는 사용자 키로 못 읽으므로(20261031100000 칸 단위 GRANT) SECURITY DEFINER.
-- 동시에 들어온 요청이 서로를 못 보고 둘 다 통과하지 않게 작성자 단위로 잠근다.

CREATE OR REPLACE FUNCTION public.projects_guard_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('projects_guard_duplicate:' || NEW.author_id::text));

  IF EXISTS (
    SELECT 1 FROM public.projects
    WHERE author_id = NEW.author_id
      AND lower(btrim(title)) = lower(btrim(NEW.title))
      AND created_at > now() - interval '10 minutes'
  ) THEN
    RAISE EXCEPTION 'projects_duplicate_recent' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.projects_guard_duplicate() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS projects_guard_duplicate ON public.projects;
CREATE TRIGGER projects_guard_duplicate
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_guard_duplicate();
