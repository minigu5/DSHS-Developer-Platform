-- 프로젝트 상세의 "주소"(<이름>.dshs.dev) 한 줄 — 브라우저가 그리는 빠른 상세 화면이 읽는다(2026-11-06).
-- subdomains 는 본인·관리자만 읽을 수 있어서(RLS) 남의 프로젝트 주소를 못 읽었다.
-- 이름은 공개 DNS 라 숨길 것이 아니고, 비공개 프로젝트는 주소를 반납하므로 공개 프로젝트의 연결된(active) 주소만 돌려준다.

CREATE OR REPLACE FUNCTION public.project_live_domain(p_project_id uuid)
RETURNS TABLE (name text, host text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.name, s.host
  FROM public.subdomains s
  JOIN public.projects p ON p.id = s.project_id
  WHERE s.project_id = p_project_id AND s.status = 'active' AND p.visibility = 'public'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.project_live_domain(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_live_domain(uuid) TO anon, authenticated;
