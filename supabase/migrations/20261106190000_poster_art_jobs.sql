-- 2026-11-06 포스터 그림을 학교 Mac mini 로 (설계: docs/superpowers/specs/2026-11-06-poster-mac-art-design.md §5-1)
-- 1) poster_art_workers — Mac 한 대당 한 줄. 토큰은 SHA-256 hex 만 저장한다.
-- 2) poster_art_jobs — 그림 일감 대기 목록. 서버가 서비스 키로 넣고, Mac 은 아래 RPC 로만 받아 간다.
-- 3) project_posters.art_job_id — 지금 기다리는 그림(NULL 이면 없음).
-- 4) ai_usage.kind 에 'art_local'(Mac 그림, KST 자정 — ai_usage_day 는 'art' 만 UTC 라 그대로).
-- 5) claim_poster_art_job / poster_art_ping — anon 키 + Mac 토큰으로 부른다. 학교망은 밖으로만 연결하고(들어오는 연결 없음),
--    Mac 이 Worker 요청 대신 Supabase 를 직접 불러 Workers 무료 요청 수를 쓰지 않는다.

CREATE TABLE public.poster_art_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 40),
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

ALTER TABLE public.poster_art_workers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.poster_art_workers FROM anon, authenticated;

CREATE TABLE public.poster_art_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'art' CHECK (kind IN ('art')),
  poster_id uuid NOT NULL REFERENCES public.project_posters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prompt text NOT NULL CHECK (char_length(prompt) <= 1000),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'working', 'done', 'failed', 'canceled', 'expired')),
  worker_id uuid REFERENCES public.poster_art_workers(id) ON DELETE SET NULL,
  job_secret_hash text,
  claimed_at timestamptz,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  result_url text,
  error text CHECK (char_length(error) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX poster_art_jobs_status_created_idx ON public.poster_art_jobs (status, created_at);
CREATE INDEX poster_art_jobs_poster_id_idx ON public.poster_art_jobs (poster_id);
CREATE INDEX poster_art_jobs_user_id_idx ON public.poster_art_jobs (user_id);
CREATE INDEX poster_art_jobs_worker_id_idx ON public.poster_art_jobs (worker_id);

ALTER TABLE public.poster_art_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.poster_art_jobs FROM anon, authenticated;

ALTER TABLE public.project_posters
  ADD COLUMN art_job_id uuid REFERENCES public.poster_art_jobs(id) ON DELETE SET NULL;
CREATE INDEX project_posters_art_job_id_idx ON public.project_posters (art_job_id);

-- 이름이 다르면 push 가 실패하게 IF EXISTS 를 붙이지 않는다(옛 제약이 남으면 'art_local' 예약이 조용히 실패)
ALTER TABLE public.ai_usage DROP CONSTRAINT ai_usage_kind_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_kind_check CHECK (kind IN ('text', 'art', 'art_local'));

-- Mac 이 3초마다 부른다. 토큰이 틀리면 이유 없이 0행.
-- lease 가 30초(결과 유예)를 넘겨 끝난 일감은 2번째까지 다시 줄 세우고, 그다음은 expired.
CREATE OR REPLACE FUNCTION public.claim_poster_art_job(p_token text)
RETURNS TABLE (id uuid, prompt text, width integer, height integer, job_secret text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_worker uuid;
  v_job public.poster_art_jobs%ROWTYPE;
  v_secret text;
BEGIN
  IF p_token IS NULL OR char_length(p_token) NOT BETWEEN 32 AND 200 THEN
    RETURN;
  END IF;
  SELECT w.id INTO v_worker FROM public.poster_art_workers w
  WHERE w.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') AND w.revoked_at IS NULL;
  IF v_worker IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.poster_art_workers w SET last_seen_at = now() WHERE w.id = v_worker;

  UPDATE public.poster_art_jobs j SET
    status = CASE WHEN j.attempts < 2 THEN 'queued' ELSE 'expired' END,
    worker_id = CASE WHEN j.attempts < 2 THEN NULL ELSE j.worker_id END,
    job_secret_hash = NULL,
    lease_until = NULL,
    finished_at = CASE WHEN j.attempts < 2 THEN NULL ELSE now() END
  WHERE j.status = 'working' AND j.lease_until < now() - interval '30 seconds';

  SELECT * INTO v_job FROM public.poster_art_jobs j
  WHERE j.status = 'queued' AND j.kind = 'art'
  ORDER BY j.created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_secret := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  UPDATE public.poster_art_jobs j SET
    status = 'working',
    worker_id = v_worker,
    job_secret_hash = encode(sha256(convert_to(v_secret, 'UTF8')), 'hex'),
    claimed_at = now(),
    lease_until = now() + interval '180 seconds',
    attempts = j.attempts + 1
  WHERE j.id = v_job.id;

  RETURN QUERY SELECT v_job.id, v_job.prompt, v_job.width, v_job.height, v_secret;
END;
$$;

-- 그리는 동안 15초마다: 살아 있음만 알린다
CREATE OR REPLACE FUNCTION public.poster_art_ping(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.poster_art_workers SET last_seen_at = now()
  WHERE token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') AND revoked_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.claim_poster_art_job(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.poster_art_ping(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_poster_art_job(text) TO anon, service_role;
GRANT EXECUTE ON FUNCTION public.poster_art_ping(text) TO anon, service_role;
