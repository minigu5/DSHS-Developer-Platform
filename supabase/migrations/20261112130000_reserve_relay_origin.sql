-- dshs.dev 입구(Pages dshs-relay, relay/lib/forward.js)가 운영 요청을 넘기는 대곽나루 원 주소 dshs2.dshs.dev 를 예약어로(2026-11-12 보안 점검).
-- 학생 이름 규칙 안의 이름이라, 반납·회수·대곽나루 서버 사라짐 자동 반납으로 풀리면 남이 받아 dshs.dev 트래픽·로그인 쿠키를 통째로 받을 수 있었다.
-- 지금 있는 행(운영자 것)은 그대로 — subdomain_reserve 만 예약어를 본다. src/lib/domains/name.ts RESERVED_NAMES 와 같이.
INSERT INTO public.subdomain_reserved (name) VALUES ('dshs2') ON CONFLICT (name) DO NOTHING;
