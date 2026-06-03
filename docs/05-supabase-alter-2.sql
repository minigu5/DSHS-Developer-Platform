-- 기존 projects 테이블 구조 추가 확장 스크립트 (접근 권한 및 커스텀 기능)

-- 1. 새로운 컬럼들 추가
ALTER TABLE public.projects 
ADD COLUMN allowed_users text[] default '{}',
ADD COLUMN feature_custom text;

-- 2. 기존 'private 프로젝트는 작성자만 볼 수 있습니다.' 정책 삭제
DROP POLICY IF EXISTS "private 프로젝트는 작성자만 볼 수 있습니다." ON public.projects;

-- 3. 새로운 정책 추가 (비공개 프로젝트는 작성자이거나 allowed_users 배열에 이메일이 포함된 사용자만 볼 수 있음)
CREATE POLICY "private 프로젝트는 작성자와 허용된 사용자만 볼 수 있습니다."
  ON public.projects FOR SELECT
  USING (
    visibility = 'private' AND (
      auth.uid() = author_id OR 
      (SELECT email FROM public.users WHERE id = auth.uid()) = ANY(allowed_users)
    )
  );
