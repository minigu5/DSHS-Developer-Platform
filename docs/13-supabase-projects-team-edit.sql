-- 팀 프로젝트 팀원에게 수정 권한 부여
-- projects_update_own 정책을 팀원(team_members 배열에 이메일이 포함된 사용자)도 허용하도록 확장

DROP POLICY IF EXISTS "projects_update_own" ON public.projects;

CREATE POLICY "projects_update_own"
  ON public.projects FOR UPDATE
  USING (
    auth.uid() = author_id OR
    (SELECT email FROM public.users WHERE id = auth.uid()) = ANY(team_members)
  );
