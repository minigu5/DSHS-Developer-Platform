-- 1. projects 테이블에 click_count 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS click_count INT DEFAULT 0 NOT NULL;

-- 2. project_clicks 중복 방지 테이블
CREATE TABLE IF NOT EXISTS project_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  clicked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 중복 방지 인덱스 (로그인 유저: 하루 1회)
CREATE UNIQUE INDEX IF NOT EXISTS project_clicks_user_daily
  ON project_clicks (project_id, user_id, clicked_date)
  WHERE user_id IS NOT NULL;

-- 4. 중복 방지 인덱스 (비회원: IP 해시 기반 하루 1회)
CREATE UNIQUE INDEX IF NOT EXISTS project_clicks_ip_daily
  ON project_clicks (project_id, ip_hash, clicked_date)
  WHERE ip_hash IS NOT NULL;

-- 5. 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS project_clicks_project_id_idx ON project_clicks (project_id);

-- 6. RLS 활성화 (직접 접근 차단, RPC로만 사용)
ALTER TABLE project_clicks ENABLE ROW LEVEL SECURITY;

-- project_clicks 직접 SELECT/INSERT/UPDATE/DELETE 모두 거부
-- (RPC가 SECURITY DEFINER로 대신 처리)
CREATE POLICY "no_direct_access" ON project_clicks
  AS RESTRICTIVE
  FOR ALL
  USING (false);

-- 7. 원자적 클릭 추적 RPC (SECURITY DEFINER — RLS 우회)
CREATE OR REPLACE FUNCTION track_project_click(
  p_project_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count INT;
BEGIN
  INSERT INTO project_clicks (project_id, user_id, ip_hash, clicked_date)
  VALUES (p_project_id, p_user_id, p_ip_hash, CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  IF v_inserted_count > 0 THEN
    UPDATE projects SET click_count = click_count + 1 WHERE id = p_project_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- RPC는 anon 및 authenticated 모두 호출 가능
GRANT EXECUTE ON FUNCTION track_project_click(UUID, UUID, TEXT) TO anon, authenticated;
