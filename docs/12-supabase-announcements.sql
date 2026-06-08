-- ============================================================
-- 공지사항(Announcements) 테이블
-- ============================================================

-- 관리자 판별 헬퍼 함수 (서버 액션에서도 동일 이메일 기준 사용)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email = 'ts250024@ts.hs.kr'
  );
$$;

-- 공지사항 테이블
CREATE TABLE IF NOT EXISTS announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  category    text NOT NULL CHECK (category IN ('promotion','beta','feedback','update','general','admin')),
  content     text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 50000),
  is_pinned   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_announcements_updated_at();

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_is_pinned  ON announcements (is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id  ON announcements (author_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 조회: 누구나
CREATE POLICY "announcements_select_all"
  ON announcements FOR SELECT
  USING (true);

-- 작성: 로그인 사용자
CREATE POLICY "announcements_insert_auth"
  ON announcements FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- 수정: 작성자 본인 (is_pinned 제외 필드) OR 관리자 (모든 필드)
CREATE POLICY "announcements_update_author"
  ON announcements FOR UPDATE
  USING (auth.uid() = author_id OR is_admin())
  WITH CHECK (auth.uid() = author_id OR is_admin());

-- 삭제: 작성자 본인 OR 관리자
CREATE POLICY "announcements_delete_author"
  ON announcements FOR DELETE
  USING (auth.uid() = author_id OR is_admin());
