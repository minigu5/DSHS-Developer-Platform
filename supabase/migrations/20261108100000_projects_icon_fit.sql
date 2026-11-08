-- 2026-11-08 아이콘 맞춤값 — 아이콘 그림이 자기 바탕(둥근 네모)을 갖고 모서리·바깥이 투명하면
-- 우리 틀의 흰 바탕이 모서리 실선·흰 테두리로 비쳤다(AFO·영화대교).
-- 서버가 저장·매일 파비콘 동기화 때 그림을 살펴 {"src": 분석한 icon_url, "bg": "#rrggbb", "box": [x, y, 크기]}를 적는다.
-- 화면은 src가 지금 icon_url과 같을 때만 쓰고 값도 다시 검사한다(src/lib/icon-fit.ts) — 사용자 키로 써도 자기 프로젝트 모양만 바뀐다.

ALTER TABLE public.projects
  ADD COLUMN icon_fit jsonb NULL,
  ADD CONSTRAINT projects_icon_fit_shape CHECK (
    icon_fit IS NULL OR (jsonb_typeof(icon_fit) = 'object' AND octet_length(icon_fit::text) <= 2300)
  );

GRANT SELECT (icon_fit) ON public.projects TO anon, authenticated;
