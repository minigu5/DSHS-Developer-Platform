-- ============================================================
-- DSHS Developer Platform — 텍스트 컬럼 길이 제약 추가
-- ============================================================
-- 서버 액션의 zod 검증과 동일한 상한을 DB 레벨에서 한 번 더 강제.
-- 다른 클라이언트(예: 직접 PostgREST 호출)가 우회하는 것을 방지.
--
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 기존 데이터가 제약을 위반할 가능성이 있어 NOT VALID 로 추가.
-- 신규 INSERT/UPDATE 부터 검사. 기존 행을 정리한 뒤 VALIDATE CONSTRAINT 로 승격.

-- ── tips ──────────────────────────────────────────────
ALTER TABLE public.tips
  ADD CONSTRAINT tips_title_len_chk
    CHECK (char_length(title) BETWEEN 1 AND 120) NOT VALID;

ALTER TABLE public.tips
  ADD CONSTRAINT tips_summary_len_chk
    CHECK (summary IS NULL OR char_length(summary) BETWEEN 1 AND 30) NOT VALID;

ALTER TABLE public.tips
  ADD CONSTRAINT tips_content_len_chk
    CHECK (char_length(content) BETWEEN 1 AND 50000) NOT VALID;

ALTER TABLE public.tips
  ADD CONSTRAINT tips_cover_url_len_chk
    CHECK (cover_url IS NULL OR char_length(cover_url) <= 500) NOT VALID;


-- ── ideas (해줘!) ─────────────────────────────────────
ALTER TABLE public.ideas
  ADD CONSTRAINT ideas_title_len_chk
    CHECK (char_length(title) BETWEEN 1 AND 120) NOT VALID;

ALTER TABLE public.ideas
  ADD CONSTRAINT ideas_content_len_chk
    CHECK (char_length(content) BETWEEN 1 AND 20000) NOT VALID;

-- type/category 허용값 (constants.ts 의 PROJECT_TYPES / FEATURES 와 동기화)
ALTER TABLE public.ideas
  ADD CONSTRAINT ideas_type_chk
    CHECK (type IN ('website','app','extension','cli','library')) NOT VALID;

ALTER TABLE public.ideas
  ADD CONSTRAINT ideas_category_chk
    CHECK (category IN (
      'document','ai','study','utility','game',
      'social','media','productivity','dev-tool','other'
    )) NOT VALID;


-- ── users ─────────────────────────────────────────────
ALTER TABLE public.users
  ADD CONSTRAINT users_nickname_len_chk
    CHECK (nickname IS NULL OR char_length(nickname) BETWEEN 2 AND 20) NOT VALID;

ALTER TABLE public.users
  ADD CONSTRAINT users_bio_len_chk
    CHECK (bio IS NULL OR char_length(bio) <= 500) NOT VALID;

ALTER TABLE public.users
  ADD CONSTRAINT users_avatar_url_len_chk
    CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 500) NOT VALID;


-- ── projects ──────────────────────────────────────────
ALTER TABLE public.projects
  ADD CONSTRAINT projects_title_len_chk
    CHECK (char_length(title) BETWEEN 1 AND 200) NOT VALID;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_short_description_len_chk
    CHECK (short_description IS NULL OR char_length(short_description) <= 500) NOT VALID;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_description_len_chk
    CHECK (char_length(description) <= 50000) NOT VALID;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_team_name_len_chk
    CHECK (team_name IS NULL OR char_length(team_name) <= 100) NOT VALID;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_url_len_chk
    CHECK (url IS NULL OR char_length(url) <= 500) NOT VALID;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_repo_url_len_chk
    CHECK (repo_url IS NULL OR char_length(repo_url) <= 500) NOT VALID;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_icon_url_len_chk
    CHECK (icon_url IS NULL OR char_length(icon_url) <= 1000) NOT VALID;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_license_custom_len_chk
    CHECK (license_custom IS NULL OR char_length(license_custom) <= 1000) NOT VALID;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_feature_custom_len_chk
    CHECK (feature_custom IS NULL OR char_length(feature_custom) <= 200) NOT VALID;


-- (선택) 기존 데이터가 모두 통과한다면 다음 명령으로 검증 승격:
-- ALTER TABLE public.tips VALIDATE CONSTRAINT tips_title_len_chk;
-- ALTER TABLE public.tips VALIDATE CONSTRAINT tips_content_len_chk;
-- ... (필요한 제약에 대해 반복)


-- PostgREST schema cache 리로드
NOTIFY pgrst, 'reload schema';
