-- ============================================================
-- DSHS Developer Platform — 가이드 위키식 편집 스키마
-- ============================================================
-- 가이드 문서의 수정 기록(버전). 한 번 쓰면 바뀌지 않는다(append-only).
-- 직접 INSERT/UPDATE/DELETE 는 RLS 로 막혀 있고, 저장은
-- public.save_guide_revision() 으로만 한다. 이 함수는 service_role 만 실행할 수 있어
-- 서버 액션(서비스 키)에서만 부를 수 있다.
--
-- 03-supabase-schema.sql 의 public.users 가 이미 존재한다는 전제.
-- 설계: docs/superpowers/specs/2026-10-24-guide-wiki-editing-design.md 5절

-- 안전을 위해 재실행 가능하도록 DROP 후 재생성
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


-- 2. save_guide_revision — 새 버전 저장 (service_role 전용)
--    p_seed: { "title": text, "steps": jsonb array, "extra": jsonb|null, "stats": jsonb }
--            문서의 첫 저장일 때만 쓰이는 저장소 원본. 이미 버전이 있으면 무시한다.
--    p_kind: 'edit' | 'revert' | 'sync' ('seed' 는 p_seed 로만 들어간다)
--    반환: 새 rev_no
--    충돌: RAISE EXCEPTION 'conflict:<최신 rev_no>' (ERRCODE P0001)
CREATE FUNCTION public.save_guide_revision(
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
  v_email   text;
  v_latest  int;
  v_summary text;
  v_new     int;
  v_step    jsonb;
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

  -- 2. 같은 문서의 저장을 줄 세운다
  PERFORM pg_advisory_xact_lock(hashtext('guide:' || p_doc_key));

  SELECT max(rev_no) INTO v_latest FROM public.guide_revisions WHERE doc_key = p_doc_key;

  -- 3. 첫 저장이면 저장소 원본을 rev 1 (seed) 로 먼저 기록. 작성자는 지금 저장하는 사람.
  IF v_latest IS NULL THEN
    IF p_seed IS NULL
       OR jsonb_typeof(p_seed) <> 'object'
       OR jsonb_typeof(p_seed->'steps') IS DISTINCT FROM 'array'
       OR jsonb_typeof(p_seed->'title') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'seed_required' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.guide_revisions
      (doc_key, rev_no, kind, title, steps, extra, summary, base_rev, revert_of, stats, author_id, author_email)
    VALUES (
      p_doc_key, 1, 'seed',
      p_seed->>'title',
      p_seed->'steps',
      CASE WHEN jsonb_typeof(p_seed->'extra') = 'null' THEN NULL ELSE p_seed->'extra' END,
      '저장소 원본', NULL, NULL,
      coalesce(p_seed->'stats', '{}'::jsonb),
      p_author_id, v_email
    );
    v_latest := 1;
  END IF;

  -- 4. 기준 버전이 최신이 아니면 충돌
  IF p_base_rev IS DISTINCT FROM v_latest THEN
    RAISE EXCEPTION 'conflict:%', v_latest USING ERRCODE = 'P0001';
  END IF;

  -- revert: 대상이 이 문서에 있고 최신보다 작아야 한다
  IF p_kind = 'revert' THEN
    IF p_revert_of >= v_latest OR NOT EXISTS (
      SELECT 1 FROM public.guide_revisions WHERE doc_key = p_doc_key AND rev_no = p_revert_of
    ) THEN
      RAISE EXCEPTION 'revert_invalid' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 6. 크기 검사: steps 1~50개, 단계 body 각 20,000자 이하, 전체 200KB 이하
  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array'
     OR jsonb_array_length(p_steps) NOT BETWEEN 1 AND 50
     OR octet_length(p_steps::text) > 204800 THEN
    RAISE EXCEPTION 'steps_invalid' USING ERRCODE = 'P0001';
  END IF;

  FOR v_step IN SELECT jsonb_array_elements(p_steps) LOOP
    IF jsonb_typeof(v_step) <> 'object'
       OR jsonb_typeof(v_step->'body') IS DISTINCT FROM 'string'
       OR char_length(v_step->>'body') > 20000 THEN
      RAISE EXCEPTION 'steps_invalid' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  -- 5. 새 버전 기록
  v_new := v_latest + 1;
  INSERT INTO public.guide_revisions
    (doc_key, rev_no, kind, title, steps, extra, summary, base_rev, revert_of, stats, author_id, author_email)
  VALUES (
    p_doc_key, v_new, p_kind, p_title, p_steps,
    CASE WHEN p_extra IS NULL OR jsonb_typeof(p_extra) = 'null' THEN NULL ELSE p_extra END,
    v_summary, p_base_rev, p_revert_of,
    coalesce(p_stats, '{}'::jsonb),
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
