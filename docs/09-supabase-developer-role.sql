-- 개발자(관리자) 계정 RLS 정책 추가
-- 대상 이메일: ts250024@ts.hs.kr
--
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 이 SQL 을 실행해야 개발자 계정이 DB 레벨에서도
-- 모든 비공개 프로젝트 조회 및 모든 프로젝트 수정이 가능합니다.

-- 1. 개발자 계정: 모든 프로젝트 조회 (비공개 포함)
CREATE POLICY "projects_select_developer"
  ON public.projects FOR SELECT
  USING (
    (SELECT email FROM public.users WHERE id = auth.uid()) = 'ts250024@ts.hs.kr'
  );

-- 2. 개발자 계정: 모든 프로젝트 수정
CREATE POLICY "projects_update_developer"
  ON public.projects FOR UPDATE
  USING (
    (SELECT email FROM public.users WHERE id = auth.uid()) = 'ts250024@ts.hs.kr'
  );

-- 3. 개발자 계정: 모든 프로젝트 삭제 (선택 사항)
-- CREATE POLICY "projects_delete_developer"
--   ON public.projects FOR DELETE
--   USING (
--     (SELECT email FROM public.users WHERE id = auth.uid()) = 'ts250024@ts.hs.kr'
--   );

-- 4. 개발자 계정: 모든 프로젝트의 리뷰 조회
CREATE POLICY "reviews_select_developer"
  ON public.reviews FOR SELECT
  USING (
    (SELECT email FROM public.users WHERE id = auth.uid()) = 'ts250024@ts.hs.kr'
  );
