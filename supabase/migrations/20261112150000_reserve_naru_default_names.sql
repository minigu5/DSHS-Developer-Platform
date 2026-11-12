-- 대곽나루 기본 주소 srv-<서버 id 16진수 8자리>.dshs.dev 를 예약(2026-11-12). 대곽나루 허브가 학생 서버마다 직접 CNAME을 만든다
-- (server_connection hub/default_dns.py, comment naru-default). 학생이 같은 이름을 받으면 남의 서버 주소와 겹친다.
-- 모양 예약이라 subdomain_reserved(이름 하나씩) 대신 트리거 — 이름을 새로 적는 모든 길(reserve·관리자 함수)을 한 곳에서 막는다.
-- 오류 문구는 예약어와 같은 name_reserved 라 화면이 그대로 "쓸 수 없는 이름"을 보인다. src/lib/domains/name.ts NARU_DEFAULT_NAME 과 같이.
-- 2026-11-12 기준 이 모양의 행은 없다. 다시 실행해도 된다.
CREATE OR REPLACE FUNCTION public.subdomains_block_naru_default()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.name ~ '^srv-[0-9a-f]{8}$' THEN
    RAISE EXCEPTION 'name_reserved' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subdomains_block_naru_default ON public.subdomains;
CREATE TRIGGER subdomains_block_naru_default
  BEFORE INSERT OR UPDATE OF name ON public.subdomains
  FOR EACH ROW EXECUTE FUNCTION public.subdomains_block_naru_default();
