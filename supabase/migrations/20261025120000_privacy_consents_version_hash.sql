-- 처리방침 버전을 "시행일 + 본문 해시"로 자동 생성하도록 policy_version 형식을 넓힌다.
-- 날짜만 있는 옛 형식(이미 기록된 행)도 계속 허용 → 기존 코드와 호환된다.
-- 설명: docs/21-supabase-privacy-consents.sql
ALTER TABLE public.privacy_consents DROP CONSTRAINT privacy_consents_policy_version_check;
ALTER TABLE public.privacy_consents ADD CONSTRAINT privacy_consents_policy_version_check
  CHECK (policy_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(-[0-9a-f]{8})?$');
