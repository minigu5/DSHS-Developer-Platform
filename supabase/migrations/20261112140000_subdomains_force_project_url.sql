-- 도메인을 연결하면 프로젝트 방문 주소는 무조건 <이름>.dshs.dev (2026-11-12 사용자 요청, 공개·비공개 모두)
-- 예전엔 연결 뒤 제안 띠의 "바꾸기"를 눌러야 바뀌었고, 학생이 수정 폼에서 다시 옛 주소로 돌릴 수도 있었다.
-- 1. 연결(subdomain_connect·subdomain_connect_naru 가 connected_at 을 새로 적을 때)되는 순간 방문 주소를 바꾸고 옛 주소는 previous_url 에 기억한다.
--    CNAME 호스트는 아직 확인 전(pending)일 수 있는데, 그동안 "웹사이트 방문"은 /api/track 이 previous_url → site_url 로 보낸다(visit-url.ts).
-- 2. 연결된 동안(pending·active·broken + host 있음) 사용자 키로는 방문 주소를 다른 값으로 못 바꾼다 — 팀원 포함. 반납·회수 때는 DB 가 되돌린다(subdomain_restore_project_url).
-- 3. 이미 연결된 주소들도 지금 한 번 맞춘다.

-- 1. 연결 순간 방문 주소 바꾸기
CREATE OR REPLACE FUNCTION public.subdomains_force_project_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new text := 'https://' || NEW.name || '.dshs.dev';
  v_old text;
BEGIN
  IF NEW.project_id IS NULL OR NEW.host IS NULL OR NEW.status NOT IN ('pending', 'active', 'broken') THEN
    RETURN NEW;
  END IF;
  SELECT url INTO v_old FROM public.projects WHERE id = NEW.project_id;
  IF rtrim(coalesce(v_old, ''), '/') = v_new THEN
    RETURN NEW;   -- 이미 이 주소(다시 연결·호스트 옮기기)면 기억한 옛 주소도 그대로
  END IF;
  IF nullif(trim(coalesce(v_old, '')), '') IS NOT NULL THEN
    NEW.previous_url := v_old;
  END IF;
  UPDATE public.projects SET url = v_new WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER subdomains_force_project_url
  BEFORE UPDATE OF connected_at ON public.subdomains
  FOR EACH ROW
  WHEN (NEW.connected_at IS NOT NULL AND NEW.connected_at IS DISTINCT FROM OLD.connected_at)
  EXECUTE FUNCTION public.subdomains_force_project_url();

-- 2. 연결된 동안 방문 주소 잠금. subdomains 는 본인·관리자만 읽혀서(RLS) 팀원 수정도 가리려면 DEFINER 도우미가 필요하다 — API 로 안 열리는 private 스키마
CREATE OR REPLACE FUNCTION private.project_domain_url(p_project_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 'https://' || s.name || '.dshs.dev'
  FROM public.subdomains s
  WHERE s.project_id = p_project_id AND s.host IS NOT NULL AND s.status IN ('pending', 'active', 'broken')
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION private.project_domain_url(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.project_domain_url(uuid) TO authenticated, service_role;

-- INVOKER — current_user 로 사용자 키를 가린다(서비스 키·DEFINER 함수의 되돌리기는 통과)
CREATE OR REPLACE FUNCTION public.projects_guard_domain_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_locked text;
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NEW.url IS DISTINCT FROM OLD.url THEN
    v_locked := private.project_domain_url(NEW.id);
    IF v_locked IS NOT NULL AND rtrim(coalesce(NEW.url, ''), '/') <> v_locked THEN
      RAISE EXCEPTION 'project_url_locked' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_guard_domain_url
  BEFORE UPDATE OF url ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_guard_domain_url();

-- 3. 이미 연결된 주소 맞추기
WITH live AS (
  SELECT s.id, s.project_id, 'https://' || s.name || '.dshs.dev' AS new_url, p.url AS old_url
  FROM public.subdomains s
  JOIN public.projects p ON p.id = s.project_id
  WHERE s.host IS NOT NULL AND s.status IN ('pending', 'active', 'broken')
    AND rtrim(coalesce(p.url, ''), '/') <> 'https://' || s.name || '.dshs.dev'
), remembered AS (
  UPDATE public.subdomains s
  SET previous_url = live.old_url
  FROM live
  WHERE s.id = live.id AND nullif(trim(coalesce(live.old_url, '')), '') IS NOT NULL
  RETURNING s.id
)
UPDATE public.projects p
SET url = live.new_url
FROM live
WHERE p.id = live.project_id;
