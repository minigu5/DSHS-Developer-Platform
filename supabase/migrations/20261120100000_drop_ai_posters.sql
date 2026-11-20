-- 2026-11-20 AI 포스터 만들기를 없앴다(코드는 53a4df7 배포 완료, 운영 DB의 AI 포스터는 미리 올린 포스터로 바꾸거나 지움).
-- 코드가 더는 안 쓰는 AI 전용 표·칸·함수를 지운다. 남기는 것:
--   * project_posters 의 id·project_id·created_by·kind·image_url·created_at·updated_at (올린 포스터)
--   * ai_usage·reserve_ai_usage·release_ai_usage — 이미지 올리기 하루 몫(kind 'upload')이 그대로 쓴다. 이름만 옛것.
--   * projects.poster_*(걸린 포스터), poster_limit 트리거, projects_poster_clear

-- Mac 그림 일감을 가져가던 함수(anon 이 토큰으로 부르던 것)부터
DROP FUNCTION IF EXISTS public.claim_poster_art_job(text);
DROP FUNCTION IF EXISTS public.poster_art_ping(text);

-- project_posters 가 일감 표를 가리키는 칸을 먼저 떼고, 일감 표를 지운다
ALTER TABLE public.project_posters
  DROP COLUMN IF EXISTS art_job_id,
  DROP COLUMN IF EXISTS ai_job_id,
  DROP COLUMN IF EXISTS html,
  DROP COLUMN IF EXISTS art_url,
  DROP COLUMN IF EXISTS art_order,
  DROP COLUMN IF EXISTS versions,
  DROP COLUMN IF EXISTS messages,
  DROP COLUMN IF EXISTS band_tone,
  DROP COLUMN IF EXISTS band_position;

DROP TABLE IF EXISTS public.poster_art_jobs;
DROP TABLE IF EXISTS public.poster_ai_jobs;
DROP TABLE IF EXISTS public.poster_art_workers;

-- 남은 포스터는 전부 올린 그림 — kind 는 'upload' 하나만
ALTER TABLE public.project_posters DROP CONSTRAINT IF EXISTS project_posters_kind_check;
ALTER TABLE public.project_posters ADD CONSTRAINT project_posters_kind_check CHECK (kind = 'upload');
ALTER TABLE public.project_posters ALTER COLUMN kind SET DEFAULT 'upload';

-- 글·그림 횟수 기록은 더 안 쓴다(upload 만 남김)
DELETE FROM public.ai_usage WHERE kind <> 'upload';
