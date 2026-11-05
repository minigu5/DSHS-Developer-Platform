-- 20261105140000 의 user_id 읽기 막기 다시 적용 (2026-11-05)
--
-- 140000 이 main 푸시와 함께 자동 적용됐는데, 그때 코드의 project_comments(count) 집계가 행 전체를 읽어
-- 칸 단위 GRANT 에서 42501 → 탐색·홈·프로필이 빈 목록이 됐다. 사이트를 살리려고 표 단위 SELECT 를 잠시
-- 되돌렸고(supabase db query), 댓글 수를 project_comments(id) 로 읽게 고친 코드를 배포한 뒤 다시 막는다.
-- ⚠️ project_comments 에 (count) 집계·select=* 를 쓰지 말 것.

REVOKE SELECT ON public.project_comments FROM anon, authenticated;
GRANT SELECT (id, project_id, content, created_at, is_author, public_user_id)
  ON public.project_comments TO anon, authenticated;
