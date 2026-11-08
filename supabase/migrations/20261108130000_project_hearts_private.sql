-- 2026-11-08 하트 누른 사람을 숨기기 2단계(B) — project_hearts 는 본인 행만(관리자는 project_hearts_select_developer 로 전부).
-- 예전엔 공개 키로 project_hearts?project_id=eq.<id>&select=user_id 를 부르면 누른 사람이 다 나왔다.
-- 수는 A(20261108120000)의 projects.heart_count 로 보여 주고, 앱 코드가 그 칸으로 바뀐 뒤에 적용한다.

DROP POLICY IF EXISTS project_hearts_select ON public.project_hearts;
CREATE POLICY project_hearts_select ON public.project_hearts
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

REVOKE SELECT ON public.project_hearts FROM anon;
