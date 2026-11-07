-- 2026-11-07 팀 아이콘 — 팀 프로젝트는 팀원 대신 팀 이름이 작성자로 보이는데, 그 옆 동그라미가 늘 첫 글자뿐이었다.
-- 팀이 따로 올린 그림(Cloudinary 주소)을 둔다. 팀 프로젝트가 아니면 비어 있어야 한다(폼도 저장할 때 비움).
-- 수정 권한은 다른 칸과 같다(소유자·팀원 — projects_update_own).

ALTER TABLE public.projects
  ADD COLUMN team_icon_url text NULL,
  ADD CONSTRAINT projects_team_icon_only_team CHECK (team_icon_url IS NULL OR author_role = 'team'),
  ADD CONSTRAINT projects_team_icon_length CHECK (team_icon_url IS NULL OR char_length(team_icon_url) <= 2048);

GRANT SELECT (team_icon_url) ON public.projects TO anon, authenticated;
