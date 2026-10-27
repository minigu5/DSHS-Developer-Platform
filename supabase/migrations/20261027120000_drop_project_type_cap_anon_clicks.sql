-- 2026-10-27 사용자 결정
-- 1) 옛 projects.type 삭제 (docs/17 2단계 마지막). 2026-10-27 확인: 코드·DB 함수·스크립트 어디서도
--    안 쓰고, 모든 행의 type 이 types 안에 들어 있음. 되돌릴 수 없음.
-- 2) 로그인하지 않은 클릭은 프로젝트마다 하루 30번까지만 센다.
--    익명 중복 판별(IP+User-Agent 해시)은 User-Agent 만 바꾸면 새 사람으로 보여서
--    요청할 때마다 조회수를 올릴 수 있었다. 해시 방식은 그대로(처리방침 문구 안 바뀜).

ALTER TABLE public.projects DROP COLUMN IF EXISTS type;

CREATE OR REPLACE FUNCTION public.track_project_click(p_project_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_ip_hash text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted_count INT;
  v_anon_today INT;
BEGIN
  IF p_user_id IS NULL THEN
    -- 같은 프로젝트의 익명 클릭이 동시에 들어와도 상한을 넘지 않게 프로젝트 단위로 줄 세움
    PERFORM pg_advisory_xact_lock(hashtext('project_clicks_anon:' || p_project_id::text));
    SELECT count(*) INTO v_anon_today
    FROM project_clicks
    WHERE project_id = p_project_id
      AND clicked_date = CURRENT_DATE
      AND ip_hash IS NOT NULL;
    IF v_anon_today >= 30 THEN
      RETURN FALSE;
    END IF;
  END IF;

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
$function$;

-- CREATE OR REPLACE 는 권한을 그대로 두지만, 20261027100000 과 같게 한 번 더 못 박음
REVOKE EXECUTE ON FUNCTION public.track_project_click(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_project_click(uuid, uuid, text) TO service_role;
