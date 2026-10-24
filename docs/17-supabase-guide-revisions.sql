-- ============================================================
-- DSHS Developer Platform — 가이드 위키식 편집 스키마
-- ============================================================
-- ⚠️ 운영 DB에 데이터가 생긴 뒤에는 이 파일을 다시 실행하지 마세요 (DROP TABLE로 모든 버전이 지워짐). 함수 수정은 migration으로.
--
-- 가이드 문서의 수정 기록(버전). 한 번 쓰면 바뀌지 않는다(append-only).
-- 직접 INSERT/UPDATE/DELETE 는 RLS 로 막혀 있고, 저장은
-- public.save_guide_revision() 으로만 한다. 이 함수는 service_role 만 실행할 수 있어
-- 서버 액션(서비스 키)에서만 부를 수 있다.
--
-- 03-supabase-schema.sql 의 public.users 가 이미 존재한다는 전제.
-- 설계: docs/superpowers/specs/2026-10-24-guide-wiki-editing-design.md 5절

-- 안전을 위해 재실행 가능하도록 DROP 후 재생성
DROP FUNCTION IF EXISTS public._guide_validate_doc(text, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.save_guide_revision(uuid, text, int, text, text, jsonb, jsonb, text, int, jsonb, jsonb);
DROP TABLE IF EXISTS public.guide_revisions CASCADE;


-- 1. guide_revisions — 가이드 버전
CREATE TABLE public.guide_revisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_key       text NOT NULL CHECK (doc_key ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  rev_no        int  NOT NULL CHECK (rev_no >= 1),
  kind          text NOT NULL CHECK (kind IN ('seed','edit','revert','sync')),
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  steps         jsonb NOT NULL,   -- WikiStep[]
  extra         jsonb,
  summary       text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 100),
  base_rev      int,              -- 이 수정이 기준으로 삼은 버전 (seed는 NULL)
  revert_of     int,              -- kind='revert'일 때 되돌린 대상 버전
  stats         jsonb NOT NULL DEFAULT '{}'::jsonb, -- {added,removed,edited,moved,plus,minus}
  author_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  author_email  text NOT NULL,    -- 책임 추적용 스냅샷. 계정이 지워져도 남는다
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_key, rev_no)
);

CREATE INDEX guide_revisions_doc_idx ON public.guide_revisions (doc_key, rev_no DESC);
CREATE INDEX guide_revisions_author_idx ON public.guide_revisions (author_id);

ALTER TABLE public.guide_revisions ENABLE ROW LEVEL SECURITY;

-- 기록은 누구나 볼 수 있다 (가이드처럼 비로그인도 열람).
-- INSERT/UPDATE/DELETE 정책은 일부러 만들지 않는다 → 직접 쓰기 전부 거부.
CREATE POLICY "guide_revisions_select_all"
  ON public.guide_revisions FOR SELECT USING (true);


-- 2a. 내부 검증 도우미 — 제목·단계·stats 를 검사하고 다듬은 제목을 돌려준다. 아무에게도 EXECUTE 를 주지 않는다.
CREATE OR REPLACE FUNCTION public._guide_validate_doc(
  p_title text,
  p_steps jsonb,
  p_stats jsonb
) RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_step  jsonb;
BEGIN
  v_title := btrim(coalesce(p_title, ''));
  IF char_length(v_title) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'title_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- 형태 검사를 먼저 하고, 길이·크기 검사는 따로 한다 (OR 평가 순서에 기대지 않는다)
  IF jsonb_typeof(p_steps) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'steps_invalid' USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_array_length(p_steps) NOT BETWEEN 1 AND 50
     OR octet_length(p_steps::text) > 204800 THEN
    RAISE EXCEPTION 'steps_invalid' USING ERRCODE = 'P0001';
  END IF;

  FOR v_step IN SELECT jsonb_array_elements(p_steps) LOOP
    IF jsonb_typeof(v_step) IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_step->'body') IS DISTINCT FROM 'string'
       OR char_length(v_step->>'body') > 20000 THEN
      RAISE EXCEPTION 'steps_invalid' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  IF jsonb_typeof(p_stats) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'stats_invalid' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_title;
END;
$$;

REVOKE ALL ON FUNCTION public._guide_validate_doc(text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;


-- 2b. save_guide_revision — 새 버전 저장 (service_role 전용)
--    p_base_rev: 문서에 버전이 없으면 0 (= 저장소 원본 위에서 고침). 있으면 현재 최신 rev_no.
--    p_seed: { "title": text, "steps": jsonb array, "extra": jsonb|null, "stats": jsonb object|null }
--            문서의 첫 저장일 때만 쓰이는 저장소 원본. 이미 버전이 있으면 무시한다.
--    p_kind: 'edit' | 'revert' | 'sync' ('seed' 는 p_seed 로만 들어간다)
--    첫 저장: seed 를 rev 1, 새 버전을 rev 2 (base_rev = 1) 로 기록한다.
--    반환: 새 rev_no
--    충돌: RAISE EXCEPTION 'conflict:<최신 rev_no, 없으면 0>' (ERRCODE P0001)
CREATE OR REPLACE FUNCTION public.save_guide_revision(
  p_author_id uuid,
  p_doc_key   text,
  p_base_rev  int,
  p_kind      text,
  p_title     text,
  p_steps     jsonb,
  p_extra     jsonb,
  p_summary   text,
  p_revert_of int,
  p_stats     jsonb,
  p_seed      jsonb
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email      text;
  v_latest     int;
  v_summary    text;
  v_title      text;
  v_stats      jsonb;
  v_seed_title text;
  v_seed_stats jsonb;
  v_new        int;
BEGIN
  -- 1. 작성자 확인 + 인자 형태 확인
  SELECT email INTO v_email FROM public.users WHERE id = p_author_id;
  IF v_email IS NULL OR v_email !~* '@ts\.hs\.kr$' THEN
    RAISE EXCEPTION 'author_invalid' USING ERRCODE = 'P0001';
  END IF;

  IF p_doc_key IS NULL OR p_doc_key !~ '^[a-z0-9][a-z0-9-]{0,99}$' THEN
    RAISE EXCEPTION 'doc_key_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- seed 는 p_seed 로만 들어간다
  IF p_kind IS NULL OR p_kind NOT IN ('edit', 'revert', 'sync') THEN
    RAISE EXCEPTION 'kind_invalid' USING ERRCODE = 'P0001';
  END IF;

  IF p_kind = 'revert' THEN
    IF p_revert_of IS NULL THEN
      RAISE EXCEPTION 'revert_invalid' USING ERRCODE = 'P0001';
    END IF;
  ELSIF p_revert_of IS NOT NULL THEN
    RAISE EXCEPTION 'revert_invalid' USING ERRCODE = 'P0001';
  END IF;

  v_summary := btrim(coalesce(p_summary, ''));
  IF char_length(v_summary) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'summary_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- 새 버전의 제목·단계·stats 검증 (제목은 다듬어 저장)
  v_stats := coalesce(p_stats, '{}'::jsonb);
  v_title := public._guide_validate_doc(p_title, p_steps, v_stats);

  -- 2. 같은 문서의 저장을 줄 세운다
  PERFORM pg_advisory_xact_lock(hashtext('guide:' || p_doc_key));

  SELECT max(rev_no) INTO v_latest FROM public.guide_revisions WHERE doc_key = p_doc_key;

  -- 3·4. 버전이 없는 문서는 기준이 0 (저장소 원본) 이어야 한다. 있으면 최신과 같아야 한다.
  IF p_base_rev IS DISTINCT FROM coalesce(v_latest, 0) THEN
    RAISE EXCEPTION 'conflict:%', coalesce(v_latest, 0) USING ERRCODE = 'P0001';
  END IF;

  -- 첫 저장이면 저장소 원본을 rev 1 (seed) 로 먼저 기록. 작성자는 지금 저장하는 사람.
  IF v_latest IS NULL THEN
    IF p_seed IS NULL OR jsonb_typeof(p_seed) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'seed_required' USING ERRCODE = 'P0001';
    END IF;
    IF jsonb_typeof(p_seed->'title') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'seed_invalid' USING ERRCODE = 'P0001';
    END IF;
    IF p_seed->'extra' IS NOT NULL
       AND jsonb_typeof(p_seed->'extra') NOT IN ('null', 'object') THEN
      RAISE EXCEPTION 'seed_invalid' USING ERRCODE = 'P0001';
    END IF;

    v_seed_stats := CASE WHEN jsonb_typeof(p_seed->'stats') = 'null' OR p_seed->'stats' IS NULL
                         THEN '{}'::jsonb ELSE p_seed->'stats' END;
    v_seed_title := public._guide_validate_doc(p_seed->>'title', p_seed->'steps', v_seed_stats);

    INSERT INTO public.guide_revisions
      (doc_key, rev_no, kind, title, steps, extra, summary, base_rev, revert_of, stats, author_id, author_email)
    VALUES (
      p_doc_key, 1, 'seed',
      v_seed_title,
      p_seed->'steps',
      CASE WHEN jsonb_typeof(p_seed->'extra') = 'null' THEN NULL ELSE p_seed->'extra' END,
      '저장소 원본', NULL, NULL,
      v_seed_stats,
      p_author_id, v_email
    );
    v_latest := 1;
  END IF;

  -- revert: 대상이 이 문서에 있고 최신보다 작아야 한다
  IF p_kind = 'revert' THEN
    IF p_revert_of >= v_latest OR NOT EXISTS (
      SELECT 1 FROM public.guide_revisions WHERE doc_key = p_doc_key AND rev_no = p_revert_of
    ) THEN
      RAISE EXCEPTION 'revert_invalid' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 5. 새 버전 기록 (base_rev 는 직전 최신. 첫 저장이면 방금 넣은 seed = 1)
  v_new := v_latest + 1;
  INSERT INTO public.guide_revisions
    (doc_key, rev_no, kind, title, steps, extra, summary, base_rev, revert_of, stats, author_id, author_email)
  VALUES (
    p_doc_key, v_new, p_kind, v_title, p_steps,
    CASE WHEN p_extra IS NULL OR jsonb_typeof(p_extra) = 'null' THEN NULL ELSE p_extra END,
    v_summary, v_latest, p_revert_of,
    v_stats,
    p_author_id, v_email
  );

  RETURN v_new;
END;
$$;

-- 학생 브라우저(anon/authenticated)가 직접 부르면 서버 검증을 건너뛸 수 있으므로 service_role 만 허용
REVOKE ALL ON FUNCTION public.save_guide_revision(uuid, text, int, text, text, jsonb, jsonb, text, int, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_guide_revision(uuid, text, int, text, text, jsonb, jsonb, text, int, jsonb, jsonb)
  TO service_role;
