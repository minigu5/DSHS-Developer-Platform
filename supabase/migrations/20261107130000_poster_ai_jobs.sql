-- 2026-11-07 AI 포스터 만들기·고치기·다시 그리기를 Cloudflare Queues 로 (탭을 닫아도 끝까지 저장)
-- Workers 는 연결이 끊긴 뒤 waitUntil 을 30초까지만 이어 가서, Gemini(12~90초)가 남아 있으면 결과도 횟수도 사라졌다.
-- 이제 요청은 일감을 넣고 바로 돌려주고, 큐 소비자(custom-worker.ts)가 내부 경로를 불러 끝까지 기다린다.
-- 1) poster_ai_jobs — 일감 한 줄. input 은 요청 때 받은 부탁·스타일·프로젝트 정보(소비자에겐 로그인 쿠키가 없다).
--    holds 는 지금 잡고 있는 횟수(ai_usage.kind) — 막힌 일감을 정리할 때 이것만 한 번 돌려준다(usage_released_at).
-- 2) project_posters.ai_job_id — 지금 돌고 있는 일감(NULL 이면 없음). 다시 열어도 "만드는 중"을 보여 준다.
-- 서비스 키로만 읽고 쓴다(RLS 켜고 정책 없음) — project_posters·poster_art_jobs 와 같다.

CREATE TABLE public.poster_ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('ask', 'redraw')),
  poster_id uuid NOT NULL REFERENCES public.project_posters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  holds text[] NOT NULL DEFAULT '{}' CHECK (holds <@ ARRAY['text', 'art', 'art_local']::text[]),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'working', 'done', 'failed', 'expired')),
  result jsonb,
  usage_released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);
CREATE INDEX poster_ai_jobs_poster_id_idx ON public.poster_ai_jobs (poster_id);
CREATE INDEX poster_ai_jobs_user_id_idx ON public.poster_ai_jobs (user_id);
CREATE INDEX poster_ai_jobs_status_created_idx ON public.poster_ai_jobs (status, created_at);

ALTER TABLE public.poster_ai_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.poster_ai_jobs FROM anon, authenticated;

ALTER TABLE public.project_posters
  ADD COLUMN ai_job_id uuid REFERENCES public.poster_ai_jobs(id) ON DELETE SET NULL;
CREATE INDEX project_posters_ai_job_id_idx ON public.project_posters (ai_job_id);
