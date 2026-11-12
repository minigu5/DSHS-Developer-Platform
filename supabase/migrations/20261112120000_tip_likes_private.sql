-- 2026-11-12 팁 좋아요 누른 사람 숨기기 2단계(B) — tip_likes 는 본인 행만(관리자 명단은 서비스 키 adminListLikers).
-- 예전엔 공개 키로 tip_likes?tip_id=eq.<id>&select=user_id 를 부르면 누른 사람이 다 나왔다.
-- 수는 A(20261112110000)의 tips.like_count 로 보여 주고, 앱 코드가 그 칸으로 바뀐 뒤에 적용한다.

DROP POLICY IF EXISTS tip_likes_select_all ON public.tip_likes;
CREATE POLICY tip_likes_select_own ON public.tip_likes
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

REVOKE SELECT ON public.tip_likes FROM anon;
