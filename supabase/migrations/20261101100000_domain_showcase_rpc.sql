-- 홈 "도메인 마련하기" 카드의 사용 현황("벌써 N개 사이트가…" + 최근 주소 칩)을 브라우저가 직접 읽게 한다.
-- 이유: Cloudflare Workers 무료 요금제(요청당 CPU 10ms)에서 홈을 요청마다 그리면 CPU 초과 503이 나서,
-- 홈을 빌드 때 만든 정적 페이지로 두고 목록은 브라우저가 anon 키로 채운다. subdomains는 RLS가 본인·관리자만 읽게 하므로
-- 예전처럼 서버가 서비스 키로 읽던 것을 이 함수로 대신한다.
-- 돌려주는 것: 공개 프로젝트에 연결된(active) 주소의 이름·프로젝트 id·제목 — 홈에 이미 공개로 보이던 값 그대로.
-- 비공개 프로젝트의 주소는 숫자에도 세지 않는다.

CREATE OR REPLACE FUNCTION public.domain_showcase(p_limit integer DEFAULT 6)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH live AS (
    SELECT s.name, p.id AS project_id, p.title, s.created_at
    FROM public.subdomains s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.status = 'active' AND p.visibility = 'public'
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM live),
    'items', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('name', x.name, 'projectId', x.project_id, 'title', x.title) ORDER BY x.created_at DESC)
       FROM (SELECT * FROM live ORDER BY created_at DESC LIMIT LEAST(GREATEST(p_limit, 0), 12)) x),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.domain_showcase(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.domain_showcase(integer) TO anon, authenticated;
