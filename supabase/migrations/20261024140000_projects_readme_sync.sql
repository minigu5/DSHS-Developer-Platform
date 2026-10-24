-- README 자동 동기화: 켜 둔 프로젝트는 GitHub Actions가 매일 밤 README로 description을 다시 채운다.
-- 컬럼만 더하는 변경이라 코드 배포 전에 실행해도 옛 코드에 영향이 없다.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS readme_sync boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS readme_etag text,
  ADD COLUMN IF NOT EXISTS readme_synced_at timestamptz;

-- 동기화는 GitHub 저장소가 있는 오픈소스 프로젝트만
ALTER TABLE public.projects
  ADD CONSTRAINT projects_readme_sync_needs_repo
  CHECK (NOT readme_sync OR (source_type = 'open' AND repo_url IS NOT NULL));
